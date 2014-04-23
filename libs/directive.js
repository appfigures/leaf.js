var _ = require('underscore'),
    globals = require('./globals'),
    utils = require('./utils'),
    $ = require('./query'),
    templates = require('./templates'),
    uid = 0;

//
// Directive
//

function Directive (params) {
    _.extend(this, params);
    // Create a unique id for templating
    // purposes since multiple directives
    // can have the same name
    this.uid = uid++;
}
Directive.prototype = {
    // Camel case name
    name: null,
    // An xml string, a url, or a function
    template: null,
    // The default context hash
    // or a function that returns an object (parser) => {}
    context: null,
    // IMPORTANT: source must be a file (not a directory)
    // Optional string specifying the url of
    // the file this directive is based on. This is used to
    // resolve any relative urls.
    // If the template is an external file, its path is used
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
    parseTemplate: function (context, cache) {
        var templateName = 'directive-template:' + this.name + this.uid,
            template = templates.get(templateName, cache),
            element, source;

        if (!template) {
            template = templates.put(templateName, resolveTemplate(this.template, cache), cache);
        }

        if (template) {
            if (typeof this.template === 'string' && this.template.charAt(0) !== '<') {
                // Assume it's a url
                source = this.template;
            }

            element = template(context);
            element = $(element);

            if (element[0].nodeType !== 1) {
                throw new globals.errors.DOMParserError('Error parsing template for directive \'' + this.name + '\'. Parsed document must have nodeType 1 (has ' + element[0].nodeType + ' ' + element[0].nodeName + ').');
            }

            element.source(this.source || source);

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
    logic: function (el, context) {/* empty */},
    matches: function (el) {
        return this.matchesName(el);
    }
};

// Returns a template function or a string to compile
function resolveTemplate(template, cache) {
    if (!template) return null;

    if (_.isFunction(template)) return template;

    if (typeof template === 'string') {
        if (template.charAt(0) === '<') {
            return template;
        } else {
            return utils.loadFile(template, cache);
        }
    }

    throw 'Directive template ' + template + ' is not a valid type. It should either be an html string, a url, or a template function';
}

module.exports = Directive;