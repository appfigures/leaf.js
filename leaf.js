var globals = require('./libs/globals'),
    xmldom = require('xmldom'),
    _ = require('underscore');

globals.$ = require('./libs/query');
globals.utils = require('./libs/utils');
globals.cache = require('./libs/cache');
globals.Parser = require('./libs/Parser');
globals.ext = require('./libs/ext');

// $ plugin
(function () {
    function setSource(el, source) {
        el.leafSource = source;
        globals.utils.forEach(el.childNodes, function (child) {
            setSource(child, source);
        });
    }

    globals.$.fn.source = function (source) {
        if (source === undefined) return this[0].leafSource;
        return this.each(function (el) {
            setSource(el, source);
        });
    };
}());

//
// Export
//

globals.ext.DOMParser = xmldom.DOMParser;
globals.ext.XMLSerializer = xmldom.XMLSerializer;

try {
    globals.ext.templateCompiler = _.template;
} catch (e) {}

module.exports = globals;