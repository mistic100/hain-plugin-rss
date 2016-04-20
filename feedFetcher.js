'use strict';

const http = require('http');
const url = require('url');
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

            // HTTP request
            var req = http.request(_.extend(
                url.parse(feedUrl), {
                    method: 'GET',
                    header: {
                        'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0',
                        'accept': 'text/html,application/xhtml+xml'
                    }
                }
            ));

            req.on('response', function(res) {
                if (res.statusCode === 200) {
                    logger.log(`DEBUG: Fetched ${feedUrl}. Pipe to parser.`);
                    res.pipe(parser);
                }
                else {
                    logger.log(`ERROR: HTTP error ${res.statusCode} while fetching ${feedUrl}`);
                    reject({
                        message: `HTTP error ${res.statusCode}`
                    });
                }
            });

            req.on('error', function(e) {
                logger.log(`ERROR: HTTP error ${e.message} while fetching ${feedUrl}`);
                reject(e);
            });

            req.end();

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

            parser.on('error', function(e) {
                logger.log(`ERROR: Parser error ${e.message} while fetching ${feedUrl}`);
                reject(e);
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