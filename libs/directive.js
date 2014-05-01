var _ = require('lodash'),
    utils = require('./utils'),
    templates = require('./templates'),
    errors = require('./errors'),
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

    // Options

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

    //
    // Overridable
    //

    // Can modify context. Can return a promise
    prepare: function (context, originalElement) {/* empty */},
    // Can return a promise
    logic: function (el, context) {/* empty */},
    matches: function (el) {
        return this.matchesName(el);
    },

    //
    // Protected
    //

    matchesName: function (element) {
        var name = this.name,
            tagName = element.tagName().toLowerCase();

        return (tagName === utils.toDashCase(name, '-') ||
            tagName === utils.toDashCase(name, '_'));
    },

    // Compile my template into a node
    parseTemplate: function (context, session) {
        var cache = session.cache,
            templateName = 'directive-template:' + this.name + this.uid,
            template = templates.get(templateName, cache),
            element, source;

        if (!template) {
            template = templates.put(templateName, resolveTemplate(this.template, cache), cache);
        }

        if (template) {
            if (typeof this.template === 'string' && !utils.isHtmlString(this.template)) {
                // Assume it's a url
                source = this.template;
            }

            element = template(context);
            element = session.$(element);

            if (element.length === 0) {
                throw new errors.LeafDirectiveError('Directive template for ' + this.name + ' could not be parsed');
            }
            if (element.length > 1) {
                throw new errors.LeafDirectiveError('Directive template for ' + this.name + ' must have just one root element (has ' + element.length + ')');
            }
            if (!element.isElement()) {
                throw new errors.LeafDirectiveError('Error parsing template for directive \'' + this.name + '\'. Parsed document must be an element (has ' + element.nodeType() + ' ' + element.tagName() + ').');
            }

            element.source(this.source || source);

            return element;
        }

        return null;
    }
};

// Returns a template function or a string to compile
function resolveTemplate(template, cache) {
    if (!template) return null;

    if (_.isFunction(template)) return template;

    if (typeof template === 'string') {
        if (utils.isHtmlString(template)) {
            return template;
        } else {
            return utils.loadFile(template, cache);
        }
    }

    throw 'Directive template ' + template + ' is not a valid type. It should either be an html string, a url, or a template function';
}

module.exports = Directive;