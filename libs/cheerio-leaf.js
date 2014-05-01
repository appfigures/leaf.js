// Returns cheerio after including some plugins
// and bug fixes.

// NOTE: Don't require('cheerio'), always require('./cheerio-leaf')
// to make sure you get the version with all of the plugins.

var cheerio = require('cheerio'),
    _ = require('lodash');

// Apply some plugins
_.extend(cheerio.prototype, require('./plugins'));

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

module.exports = cheerio;