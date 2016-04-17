'use strict';

const FeedParser = require('feedparser');
const http = require('http');
const _ = require('lodash');

module.exports = (pluginContext) => {
    const toast = pluginContext.toast;
    const logger = pluginContext.logger;
    const preferences = pluginContext.preferences;
    const shell = pluginContext.shell;

    var feeds = {};

    /**
     * Init plugin
     */
    function startup() {
        preferences.get('sources').forEach(source => {
            var parser = new FeedParser({
                feedurl: source,
                addmeta: false
            });

            http.get(source, function(res) {
                if (res.statusCode === 200) {
                    res.pipe(parser);
                }
            });

            feeds[source] = {
                ok: false,
                link: null,
                title: null,
                description: null,
                image: null,
                items: []
            };

            var feed = feeds[source];

            parser.on('readable', function() {
                var item;

                if (this.meta && !feed.ok) {
                    feed.ok = true;
                    feed.link = this.meta.link;
                    feed.title = this.meta.description;
                    feed.image = _.get(this.meta, 'image.url');
                }

                while (item = this.read()) {
                    feed.items.push(_.pick(item, ['title', 'link', 'author', 'pubDate']));
                }
            });
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
                title: 'No RSS feeds',
                desc: 'Open Hain preferences to add RSS sources',
                redirect: '/preferences'
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
                payload: item.link,
                title: item.title,
                icon: feed.image || '#fa fa-rss',
                group: feed.title
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
                shell.openExternal(payload);
                break;
        }
    }

    return { startup, search, execute };
};