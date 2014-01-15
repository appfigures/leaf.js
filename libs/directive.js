var globals = require('./globals'),
    utils = require('./utils'),
    $ = require('./query'),
    cache = require('./cache');

//
// Directive
//

function Directive (params) {
    utils.extend(this, params);
}
Directive.prototype = {
    // Camel case name
    name: null,
    // An xml string, a url, or a function
    template: null,
    // The default context hash
    // or a function that returns an object (parser) => {}
    context: null,
    // Optional string specifying the base url of
    // all the resources linked to from this directive.
    // If the template is an external file, its base path is used
    // unless a source is specified here.
    source: null,
    // Optional options to pass to the mergeElements function
    mergeOptions: null,

    matchesName: function (element) {
        var name = this.name,
            tagName = element[0].tagName.toLowerCase();

        return (tagName === utils.toDashCase(name, '-') ||
            tagName === utils.toDashCase(name, '_'));
    },

    // Compile my template into a node
    parseTemplate: function (context) {
        var templateCache = cache.$get('template'),
            resolvedTemplate = templateCache[this.name],
            element;

        if (!resolvedTemplate) {
            resolvedTemplate = resolveTemplate(this.template);
            templateCache[this.name] = resolvedTemplate;
        }

        if (resolvedTemplate) {
            element = resolvedTemplate.fn(context);
            element = $(element);
            element.source(this.source || resolvedTemplate.source);

            return element;
        }
        return null;
    },

    //
    // Overrideable
    //

    // Can modify context. Can return a promise
    prepare: function (context, originalElement) {/* empty */},
    // Can return a promise
    logic: function (el, context, parser) {/* empty */},
    matches: function (el) {
        return this.matchesName(el);
    }
};

// Returns a promise which resolves to
// {
//   fn: templateFunction
//   source: string of base url
// }
function resolveTemplate(template, source) {
    if (!template) return null;

    if (utils.isFunction(template)) {
        return {
            fn: template,
            source: source
        };
    } else if (typeof template === 'string') {
        if (template.charAt(0) === '<') {
            if (globals.debug) console.log('compiling template', source);
            return resolveTemplate(globals.ext.templateCompiler(template), source);
        } else {
            return resolveTemplate(utils.loadFile(template), utils.getBasePath(template));
        }
    }

    throw 'template ' + template + ' is not a valid type';
}

module.exports = Directive;