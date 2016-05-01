'use strict';

const moment = require('moment');

const css = {
    error: `
        color: #B00;
    `,
    date: `
        float: right;
        font-size: 0.8em;
        color: #999;
    `,
    check: `
        position: absolute;
        left: 12px;
        top: 12px;
        font-size: 18px;
        color: #13AD67;
    `,
    badge: `
        position: absolute;
        top: 10px;
        left: 10px;
        width: 20px;
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #FF7534;
        color: #fff;
        font-size: 12px;
        border-radius: 50%;
    `,
    badgeSmall: `
        top: 15px;
        left: 15px;
        width: 10px;
        height: 10px;
    `,
    previewBody: `
        overflow-x: hidden;
        font-size: 14px;
    `
};

/**
 * Renders feed title
 * @param feed
 * @returns {string}
 */
function feedTitle(feed) {
    return `${feed.title}
        ${feed.error ? `<span style="${css.error}">[ERROR]</span>` : ``}
        ${feed.nbUnread > 0 ? `<span style="${css.badge}">${feed.nbUnread}</span>` : ``}
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
        <span style="${css.date}">${moment(item.pubDate).format('DD/MM/YY HH:mm:ss')}</span>
        ${item.read ? `<span class="fa fa-check" style="${css.check}"></span>` : ``}
        ${!item.read && feed.lastAccess < item.pubDate ? `<span style="${css.badge} ${css.badgeSmall}">&nbsp;</span>` : ``}
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
        </head>
        <body style="${css.previewBody}">
            ${item.description}
        </body>
    </html>`;
}

module.exports = {
    feedTitle, feedDescription, feedIcon,
    itemTitle, itemDescription, itemIcon, itemContent
};