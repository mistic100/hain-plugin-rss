'use strict';

const _ = require('lodash');
const FeedFetcher = require('./feedFetcher');
const templates = require('./templates');

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
        setTimeout(refresh, 500);
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
        const itemsLimit = preferences.get('itemsLimit');
        const feedsOrder = preferences.get('feedsOrder');

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
                    .sortBy(feed => {
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

        var feed;

        if (!query) {
            res.add({
                title: 'Refresh feeds',
                payload: {
                    action: 'refresh'
                },
                icon: '#fa fa-refresh'
            });

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
                id: feed.url,
                redirect: `/rss ${feed.url}`,
                title: templates.feedTitle(feed),
                desc: templates.feedDescription(feed),
                icon: templates.feedIcon(feed),
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
        const enablePreview = preferences.get('enablePreview');

        if (!feed.error) {
            _.forEach(feed.items, item => {
                res.add({
                    id: item.guid,
                    payload: {
                        action: 'open',
                        item: item,
                        feed: feed
                    },
                    title: templates.itemTitle(item, feed),
                    desc: templates.itemDescription(item, feed),
                    icon: templates.itemIcon(item, feed),
                    group: feed.title,
                    preview: enablePreview
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
                    toast.enqueue('All feeds refreshed');
                    app.setInput('/rss');
                });
                break;
        }
    }

    /**
     * Render item itemContent
     * @param id
     * @param payload
     * @param render
     */
    function renderPreview(id, payload, render) {
        switch (payload.action) {
            case 'open':
                render(templates.itemContent(payload.item, payload.feed));
                break;
        }
    }

    return { startup, search, execute, renderPreview };
};