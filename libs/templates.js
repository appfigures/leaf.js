var _ = require('lodash'),
    globals = require('./globals'),
    utils = require('./utils'),
    ext = require('./ext'),
    ns = 'leaf-templates';

module.exports = {
    get: function (name, cache) {
        return cache.ns(ns).get(name);
    },
    put: function (name, fn, cache) {
        if (fn == null) return;

        if (typeof fn === 'string') {
            if (globals.debug) console.log('compiling template:', name);
            fn = ext.templateCompiler(fn);
        }
        if (!_.isFunction(fn)) throw 'templates.push(): second argument must be a string to compile or a function';

        cache.ns(ns).put(name, fn);

        return fn;
    }
};