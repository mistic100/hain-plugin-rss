'use strict';

const _ = require('lodash');
const FeedFetcher = require('./feedFetcher');

module.exports = (pluginContext) => {
    const app = pluginContext.app;
    const toast = pluginContext.toast;
    const logger = pluginContext.logger;
    const preferences = pluginContext.preferences;
    const shell = pluginContext.shell;

    const fetcher = FeedFetcher(logger);

    var feeds = {};
    var refreshInterval;

    /**
     * Init plugin
     */
    function startup() {
        refresh();
        startAutoRefresh();

        preferences.on('update', function() {
            refresh();
            startAutoRefresh();
        });
    }

    /**
     * Start auto refresh
     */
    function startAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        refreshInterval = setInterval(refresh, preferences.get('refreshDelay') * 60000);
    }

    /**
     * Refresh feeds
     */
    function refresh() {
        var itemsLimit = preferences.get('itemsLimit');
        var feedsOrder = preferences.get('feedsOrder');

        return fetcher.fetchAll(preferences.get('sources'))
            .then(data => {
                feeds = _(data)
                    .map(feed => {
                        feed.items = _(feed.items)
                            .slice(0, itemsLimit)
                            .map(item => {
                                try {
                                    item.pubDate = new Date(item.pubDate);
                                }
                                catch (e) {
                                    item.pubDate = new Date();
                                }
                                return item;
                            })
                            .value();

                        feed.maxDate = _.maxBy(feed.items, 'pubDate');
                        return feed;
                    })
                    .sortBy(function(feed) {
                        switch (feedsOrder) {
                            case 'name':
                                return feed.title;
                            case 'date':
                                return feed.maxDate;
                        }
                    })
                    .value();
            });
    }

    /**
     * Perform search
     * @param query
     * @param res
     */
    function search(query, res) {
        query = query.trim();

        if (preferences.get('sources').length === 0) {
            res.add({
                payload: {
                    action: 'preferences'
                },
                title: 'No RSS feeds',
                desc: 'Open Hain preferences to add RSS sources'
            });

            return;
        }

        res.add({
            title: 'Refresh feeds',
            payload: {
                action: 'refresh'
            }
        });

        var feed;

        if (!query) {
            list(res);
        }
        else if ((feed = _.find(feeds, { url: query })) !== undefined) {
            view(res, feed)
        }
        else {
            res.add({
                title: 'This feed does not exist',
                desc: 'You can add it within Hain preferences',
                redirect: '/rss',
                icon: '#fa fa-exclamation'
            });

            list(res);
        }
    }

    /**
     * List feeds
     * @param res
     */
    function list(res) {
        _.forEach(feeds, feed => {
            res.add({
                id: feed.guid,
                title: feed.title + (feed.error ? ' <span style="color: red">[ERROR]</span>' : ''),
                desc: feed.error || feed.description,
                redirect: `/rss ${feed.url}`,
                icon: feed.error ? '#fa fa-exclamation' : (feed.image || '#fa fa-rss'),
                group: 'RSS feeds'
            });
        });
    }

    /**
     * View feed
     * @param res
     * @param feed
     */
    function view(res, feed) {
        if (!feed.error) {
            _.forEach(feed.items, item => {
                res.add({
                    id: item.link,
                    payload: {
                        action: 'open',
                        item: item
                    },
                    title: item.title,
                    desc: item.link,
                    icon: feed.image || '#fa fa-rss',
                    group: feed.title,
                    preview: true
                });
            });
        }
    }

    /**
     * Execute payload
     * @param id
     * @param payload
     */
    function execute(id, payload) {
        switch (payload.action) {
            /**
             * Open item
             */
            case 'open':
                shell.openExternal(payload.item.link);
                break;

            /**
             * Open preferences
             */
            case 'preferences':
                app.openPreferences();
                break;

            /**
             * Force refresh
             */
            case 'refresh':
                toast.enqueue('Refresh feeds...');
                refresh().then(function() {
                    app.setInput('/rss');
                });
                break;
        }
    }

    /**
     * Render item preview
     * @param id
     * @param payload
     * @param render
     */
    function renderPreview(id, payload, render) {
        switch (payload.action) {
            case 'open':
                render(`<html>
                    <head>
                        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/3.0.3/normalize.min.css">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/milligram/1.1.0/milligram.min.css">
                        <style>
                            body { overflow-x: hidden; font-size: 14px; }
                        </style>
                    </head>
                    <body>
                        ${payload.item.description}
                    </body>
                </html>`);
                break;
        }
    }

    return { startup, search, execute, renderPreview };
};