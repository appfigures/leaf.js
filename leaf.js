var _ = require('underscore'),
    cheerio = require('cheerio'),
    globals = require('./libs/globals');

globals.utils = require('./libs/utils');
globals.Cache = require('./libs/cache');
globals.errors = require('./libs/errors');
globals.parse = require('./libs/parse');
globals.ext = require('./libs/ext');
globals.templates = require('./libs/templates');

// TODO: Is this needed, should it be refactored?
globals.use = function (fn) {
    fn(globals);
};

// Apply some plugins
_.extend(cheerio.prototype, require('./libs/plugins'));

// Fix for bug in cheerio (https://github.com/cheeriojs/cheerio/issues/469)
(function () {
    function fix(fn, el) {
        if (el.remove && el[0] && el[0].parent) el.remove();
        fn.apply(this, Array.prototype.slice.call(arguments, 1));
    }
    ['append', 'prepend', 'before', 'after'].forEach(function (name) {
        cheerio.prototype[name] = _.wrap(cheerio.prototype[name], fix);
    });
}());

// globals
globals.utils.mergeElements.defaults.contentTagName = 'af-content';

//
// Export
//

globals.ext.templateCompiler = _.template;
module.exports = globals;