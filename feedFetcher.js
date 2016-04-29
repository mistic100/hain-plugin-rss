'use strict';

const got = require('got');
const Promise = require('promise');
const FeedParser = require('feedparser');
const _ = require('lodash');

module.exports = (logger) => {

    function fetchOne(feedUrl) {
        return new Promise((resolve, reject) => {
            logger.log(`DEBUG: Fetch ${feedUrl}`);

            var parser = new FeedParser({
                feedurl: feedUrl,
                addmeta: false
            });

            var req = got.stream(feedUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml'
                }
            });

            req.pipe(parser);

            req.on('error', error => {
                logger.log(`ERROR: HTTP error ${error.message} while fetching ${feedUrl}`);
                reject(error);
            });

            // Parse feed
            var items = [];

            parser.on('readable', function() {
                var item;
                while (item = this.read()) {
                    items.push(_.pick(item, ['guid', 'title', 'link', 'author', 'pubDate', 'description']));
                }
            });

            parser.on('end', function() {
                logger.log(`DEBUG: Parsed ${feedUrl}.`);
                resolve({
                    url: feedUrl,
                    link: this.meta.link,
                    title: this.meta.title,
                    description: this.meta.description,
                    image: _.get(this.meta, 'image.url'),
                    items: items,
                    error: null
                });
            });

            parser.on('error', error => {
                logger.log(`ERROR: Parser error ${error.message} while fetching ${feedUrl}`);
                reject(error);
            });
        });
    }

    function fetchAll(feedUrls) {
        logger.log(`DEBUG: Fetch ${feedUrls.length} feeds`);

        feedUrls = _.clone(feedUrls);
        var results = [];

        return new Promise(resolve => {
            var next = () => {
                var feedUrl = feedUrls.shift();

                if (!feedUrl) {
                    logger.log(`DEBUG: Fetched ${results.length} feeds`);
                    resolve(results);
                }
                else {
                    fetchOne(feedUrl)
                        .then(feed => {
                            results.push(feed);
                            next();
                        }, e => {
                            results.push({
                                url: feedUrl,
                                link: null,
                                title: feedUrl,
                                description: null,
                                image: null,
                                items: [],
                                error: e.message
                            });
                            next();
                        });
                }
            };

            next();
        });
    }

    return { fetchOne, fetchAll };
};