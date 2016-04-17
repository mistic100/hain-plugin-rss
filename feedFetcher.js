'use strict';

const Promise = require('promise');
const FeedParser = require('feedparser');
const http = require('http');
const _ = require('lodash');


function fetchOne(feedUrl) {
    return new Promise((resolve, reject) => {
        var parser = new FeedParser({
            feedurl: feedUrl,
            addmeta: false
        });

        var req = http.get(feedUrl, function(res) {
            if (res.statusCode === 200) {
                res.pipe(parser);
            }
            else {
                reject({
                    message: `HTTP error ${res.statusCode}`
                });
            }
        });

        req.on('error', reject);

        var items = [];

        parser.on('readable', function() {
            var item;

            while (item = this.read()) {
                items.push(_.pick(item, ['title', 'link', 'author', 'pubDate', 'description']));
            }
        });

        parser.on('end', function() {
            resolve({
                url: feedUrl,
                link: this.meta.link,
                title: this.meta.title,
                description: this.meta.description,
                image: _.get(this.meta, 'image.url'),
                items: items
            });
        });

        parser.on('error', reject);
    });
}

function fetchAll(feedUrls) {
    feedUrls = _.clone(feedUrls);
    var results = [];

    return new Promise(resolve => {
       var next = () => {
           var feedUrl = feedUrls.shift();

           if (!feedUrl) {
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
                           error: e.message
                       });
                       next();
                   });
           }
       };

        next();
    });
}


module.exports = { fetchOne, fetchAll };