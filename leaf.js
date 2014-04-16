var globals = require('./libs/globals'),
    xmldom = require('xmldom'),
    _ = require('underscore');

globals.$ = require('./libs/query');
globals.utils = require('./libs/utils');
globals.Cache = require('./libs/cache');
globals.errors = require('./libs/errors');
globals.parser = require('./libs/parser');
globals.ext = require('./libs/ext');
globals.templates = require('./libs/templates');

globals.use = function (fn) {
    fn(globals);
};

// globals
globals.$.mergeElements.defaultOptions.contentTagName = 'af-content';
// $ plugin
(function () {
    function setSource(el, source) {
        el.leafSource = source;
        _.forEach(el.childNodes, function (child) {
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