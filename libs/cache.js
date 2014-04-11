var _ = require('underscore');

// Utility for printing out the cache's contents
function toJSON(cache) {
    var namespaces = {};

    _.each(cache.namespaces, function (ns, name) {
        namespaces[name] = toJSON(ns);
    });

    return {
        keys: _.keys(cache.data),
        namespaces: namespaces
    };
}

function Cache() {
    this.clear();
}
Cache.prototype = {
    data: null,
    namespaces: null,
    put: function (key, value) {
        this.data[key] = value;
    },
    get: function (key) {
        return this.data[key];
    },
    del: function (key) {
        delete this.data[key];
    },
    clear: function () {
        this.data = {};
        this.namespaces = {};
    },
    ns: function (namespace) {
        this.namespaces[namespace] = this.namespaces[namespace] || new Cache();
        return this.namespaces[namespace];
    },
    toString: function () {
        // Pretty print the JSON version of the cache
        // All values are omitted (just keys are shown)
        // for brevity.
        return JSON.stringify(toJSON(this), null, '    ');
    }
};

module.exports = Cache;
