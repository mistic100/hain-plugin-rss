'use strict';

const _ = require('lodash');
const feedFetcher = require('./feedFetcher');

module.exports = (pluginContext) => {
    const app = pluginContext.app;
    const toast = pluginContext.toast;
    const logger = pluginContext.logger;
    const preferences = pluginContext.preferences;
    const shell = pluginContext.shell;

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

        feedFetcher.fetchAll(preferences.get('sources'))
            .then(data => {
                feeds = _(data)
                    .filter(feed => {
                        if (feed.error) {
                            toast.enqueue(feed.error);
                            return false;
                        }
                        else {
                            feed.items = feed.items.slice(0, itemsLimit);
                            return true;
                        }
                    })
                    .keyBy('url')
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
                id: 'preferences',
                title: 'No RSS feeds',
                desc: 'Open Hain preferences to add RSS sources'
            });

            return;
        }

        if (!query) {
            list(res);
        }
        else if (feeds.hasOwnProperty(query)) {
            view(res, query)
        }
    }

    /**
     * List feeds
     * @param res
     */
    function list(res) {
        _.forEach(feeds, (feed, source) => {
            res.add({
                id: 'view',
                title: feed.title,
                desc: feed.description,
                redirect: `/rss ${source}`,
                icon: feed.image || '#fa fa-rss',
                group: 'RSS feeds'
            });
        });
    }

    /**
     * View feed
     * @param res
     * @param source
     */
    function view(res, source) {
        var feed = feeds[source];

        _.forEach(feed.items, item => {
            res.add({
                id: 'open',
                payload: item,
                title: item.title,
                desc: item.link,
                icon: feed.image || '#fa fa-rss',
                group: feed.title,
                preview: true
            });
        });
    }

    /**
     * Execute payload
     * @param id
     * @param payload
     */
    function execute(id, payload) {
        switch (id) {
            /**
             * Open item
             */
            case 'open':
                shell.openExternal(payload.link);
                break;

            /**
             * Open preferences
             */
            case 'preferences':
                app.openPreferences();
                break;
        }
    }

    function renderPreview(id, payload, render) {
        render(`<html><body>${payload.description}</body></html>`);
    }

    return { startup, search, execute, renderPreview };
};