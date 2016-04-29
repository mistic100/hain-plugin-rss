'use strict';

const moment = require('moment');

/**
 * Renders feed title
 * @param feed
 * @returns {string}
 */
function feedTitle(feed) {
    return `${feed.title}
        ${feed.error ? `<span style="color: #B00;">[ERROR]</span>` : ``}
        ${feed.nbUnread > 0 ? `<span style="position: absolute;
                                            top: 10px;
                                            left: 10px;
                                            color: #fff;
                                            font-size: 12px;
                                            background: #FF7534;
                                            width: 20px;
                                            height: 20px;
                                            border-radius: 50%;
                                            display: flex;
                                            justify-content: center;
                                            align-items: center;"
            >${feed.nbUnread}</span>` : ``}
    `;
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
    return `${item.link}
        ${item.read ? `<span class="fa fa-check" style="float: right; font-size: 18px; color: #13AD67;"></span>` : ``}
    `;
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
        </head>
        <body style="overflow-x: hidden; font-size: 14px;">
            ${item.description}
        </body>
    </html>`;
}

module.exports = {
    feedTitle, feedDescription, feedIcon,
    itemTitle, itemDescription, itemIcon, itemContent
};