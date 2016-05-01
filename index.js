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
    const storage = pluginContext.localStorage;

    const fetcher = FeedFetcher(logger);

    var feeds = [];
    var itemsRead = storage.getItem('itemsRead') || {};
    var lastAccess = storage.getItem('lastAccess') || {};
    var refreshInterval;
    var isRefreshing = false;

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
        const itemsLimit = preferences.get('itemsLimit');

        isRefreshing = true;

        return fetcher.fetchAll(preferences.get('sources'))
            .then(data => {
                feeds = _(data)
                    .map(feed => {
                        feed.nbUnread = 0;
                        feed.items = _(feed.items)
                            .slice(0, itemsLimit)
                            .map(item => {
                                try {
                                    item.pubDate = new Date(item.pubDate);
                                }
                                catch (e) {
                                    item.pubDate = new Date();
                                }

                                item.read = itemsRead.hasOwnProperty(item.guid);
                                if (!item.read) {
                                    feed.nbUnread++;
                                }

                                return item;
                            })
                            .value();

                        feed.lastAccess = lastAccess[feed.url] ? new Date(lastAccess[feed.url]) : new Date();
                        feed.maxDate = _.maxBy(feed.items, 'pubDate');

                        return feed;
                    })
                    .value();

                isRefreshing = false;
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
            if (feeds.length === 0 && isRefreshing) {
                res.add({
                    title: 'The feeds are currently fetched, please wait',
                    redirect: '/rss'
                });
            }
            else {
                res.add({
                    title: 'Refresh feeds',
                    payload: {
                        action: 'refresh'
                    },
                    icon: '#fa fa-refresh'
                });

                list(res);
            }
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
        const feedsOrder = preferences.get('feedsOrder');

        _(feeds)
            .sortBy(feed => {
                switch (feedsOrder) {
                    case 'name':
                        return feed.title;

                    case 'date':
                        return -feed.maxDate.getTime();

                    case 'unread':
                        return -feed.nbUnread;
                }
            })
            .map(feed => {
                res.add({
                    id: feed.url,
                    redirect: `/rss ${feed.url}`,
                    title: templates.feedTitle(feed),
                    desc: templates.feedDescription(feed),
                    icon: templates.feedIcon(feed),
                    group: 'RSS feeds'
                });
            })
            .value();
    }

    /**
     * View feed
     * @param res
     * @param feed
     */
    function view(res, feed) {
        const enablePreview = preferences.get('enablePreview');

        if (!feed.error) {
            setLastAccess(feed.url);

            _.forEach(feed.items, item => {
                res.add({
                    id: item.guid,
                    payload: {
                        action: 'open',
                        item: item,
                        feed: _.omit(feed, 'items')
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
     * /!\ payload is a clone
     * @param id
     * @param payload
     */
    function execute(id, payload) {
        switch (payload.action) {
            /**
             * Open item
             */
            case 'open':
                markItemAsRead(payload.feed.url, payload.item.guid);
                shell.openExternal(payload.item.link);

                if (preferences.get('keepOpen')) {
                    setTimeout(function() {
                        app.open(`/rss ${payload.feed.url}`);
                    }, 100);
                }
                break;

            /**
             * Open preferences
             */
            case 'preferences':
                app.openPreferences('hain-plugin-rss');
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
     * Mark an item as read and save in local-storage
     * @param feedUrl
     * @param itemGuid
     */
    function markItemAsRead(feedUrl, itemGuid) {
        var feed = _.find(feeds, { url: feedUrl });
        var item = _.find(feed.items, { guid: itemGuid });

        item.read = true;
        feed.nbUnread = _.filter(feed.items, { read: false }).length;

        itemsRead[item.guid] = true;
        storage.setItem('itemsRead', itemsRead);
    }

    /**
     * Set the last access of a feed to now
     * @param feedUrl
     */
    function setLastAccess(feedUrl) {
        var feed = _.find(feeds, { url: feedUrl });

        feed.lastAccess = new Date()

        lastAccess[feed.url] = feed.lastAccess.toISOString();
        storage.setItem('lastAccess', lastAccess);
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