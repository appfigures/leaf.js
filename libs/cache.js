var _ = require('underscore');

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
    size: function () {
        return roughSizeOfObject(this);
    },
    toString: function () {
        // Pretty print the JSON version of the cache
        // All values are omitted (just keys are shown)
        // for brevity.
        return JSON.stringify(toJSON(this), null, '    ');
    }
};

//
// Utilities
// 

// For printing out the cache's contents
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

// Via http://stackoverflow.com/a/11900218/906311
function roughSizeOfObject( object ) {

    var objectList = [];
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
        (
            typeof value === 'object' &&
                objectList.indexOf( value ) === -1
        )
        {
            objectList.push( value );

            for( var i in value ) {
                stack.push( value[ i ] );
            }
        }
    }
    return bytes;
}

module.exports = Cache;