var _ = require('underscore'),
    globals = require('./globals'),
    utils = require('./utils'),
    cache = require('./cache'),
    ext = require('./ext');

module.exports = {
    get: function (name) {
        return cache.$get('template')[name];
    },
    put: function (name, fn) {
        if (fn == null) return;

        if (typeof fn === 'string') {
            if (globals.debug) console.log('compiling template:', name);
            fn = ext.templateCompiler(fn);
        }
        if (!_.isFunction(fn)) throw 'templates.push(): second argument must be a string to compile or a function';

        cache.$get('template')[name] = fn;

        return fn;
    }
};