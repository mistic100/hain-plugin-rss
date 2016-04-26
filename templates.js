'use strict';

const moment = require('moment');

/**
 * Renders feed title
 * @param feed
 * @returns {string}
 */
function feedTitle(feed) {
    var result = feed.title;

    if (feed.error) {
        result += ' <span style="color: red">[ERROR]</span>';
    }

    return result;
}

/**
 * Renders feed description
 * @param feed
 * @returns {string}
 */
function feedDescription(feed) {
    return feed.error || feed.description;
}

/**
 * Renders feed icon
 * @param feed
 * @returns {string}
 */
function feedIcon(feed) {
    return feed.error ? '#fa fa-exclamation' : (feed.image || '#fa fa-rss');
}

/**
 * Renders item itlte
 * @param item
 * @param feed
 * @returns {string}
 */
function itemTitle(item, feed) {
    return `${item.title} 
        <span style="float: right; font-size: 0.8em; color: #999;">${moment(item.pubDate).format('DD/MM/YY HH:mm:ss')}</span>
    `;
}

/**
 * Renders item description
 * @param item
 * @param feed
 * @returns {string}
 */
function itemDescription(item, feed) {
    return item.link;
}

/**
 * Renders item icon
 * @param item
 * @param feed
 * @returns {string}
 */
function itemIcon(item, feed) {
    return feed.image || '#fa fa-rss';
}

/**
 * Renders item content
 * @param item
 * @param feed
 * @returns {string}
 */
function itemContent(item, feed) {
    return `<html>
        <head>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/3.0.3/normalize.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/milligram/1.1.0/milligram.min.css">
            <style>
                body { overflow-x: hidden; font-size: 14px; }
            </style>
        </head>
        <body>
            ${item.description}
        </body>
    </html>`;
}

module.exports = { feedTitle, feedDescription, feedIcon, itemTitle, itemDescription, itemIcon, itemContent };