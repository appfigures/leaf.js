// leaf.js
// bloom.js?
// blossom.js?

var q = require('q'),
    $ = require('./libs/leaf-query'),
    utils = require('./libs/utils'),
    leaf = {
        modules: [],
        Parser: Parser,
        $: $,
        debug: false,
        ext: require('./libs/ext'), // Can be set by user

        // Utils
        extend: utils.extend,
        setBasePath: utils.setBasePath,
        getBasePath: utils.getBasePath
    };

// $ plugin
(function () {
    function setSource(el, source) {
        el.leafSource = source;
        utils.forEach(el.childNodes, function (child) {
            setSource(child, source);
        });
    }

    $.fn.source = function (source) {
        if (source === undefined) return this[0].leafSource;
        return this.each(function (el) {
            setSource(el, source);
        });
    };
}());

//
// Parser
//

function Parser(modules) {
    var that = this;

    this.globals = {};
    this.directives = [];

    utils.forEach(modules, function (moduleName) {
        module = leaf.modules[moduleName];

        if (!module) throw 'Module ' + moduleName + ' not found';

        module(that);
    });
}

Parser.prototype = {
    globals: null,
    directives: null,
    directive: function (name, props) {
        var directive = new Directive(props);
        directive.name = name;
        this.directives.push(directive);
    },
    parseFile: function (path) {
        var that = this;
        return loadFile(path).then(function (string) {
            return that.parseString(string, utils.getBasePath(path));
        });
    },
    parseString: function (string, source) {
        var element = stringToElement(string, source);
        return transformElement(element, this);
    }
};

// Parser internals
function transformElement(element, parser, directiveToIgnore) {

    // Get matching directive
    var directive = getMatchingDirective(element, parser, directiveToIgnore),
        elementAttrs,
        context;

    if (directive) {
        // Generate the context
        
        elementAttrs = element.getAttributes();

        context = directive.context;
        context = utils.isFunction(context) ? context(parser) : context;
        context = utils.extend({}, context, elementAttrs);

        //  Create the new node from the
        //  directive's template, or use
        //  the existing node
        return q(directive.prepare(context, element))
            .then(function () {
                return directive.parseTemplate(context);
            })
            .then(function (newElement) {
                // console.log('transforming', element[0].tagName, 'into', newElement[0].tagName);
                if (newElement) {

                    //  Merge the attributes and children from
                    //  the originalNode into the newNode
                    $.mergeElements(newElement[0], element[0], directive.mergeOptions);

                    // Replace the element in its parent
                    element.replaceWith(newElement);
                } else {
                    newElement = element;
                }

                //  Run the directive's logic
                return q(directive.logic(newElement, context, parser))
                    .then(function () {

                        if (leaf.debug) {
                            // Keep a record of the directives applied
                            // to this node
                            var dir = newElement[0].getAttribute('af-directive');
                            dir = dir ? dir + ' ' : '';
                            newElement[0].setAttribute('af-directive', dir + directive.name);
                        }

                        // Run the new node through the compiler again, ignoring
                        // the matched directive
                        return transformElement(newElement, parser, directive);
                    });
            });
    } else {
        // Compile all the children
        return q.all(utils.map(element.children(), function (child) {
            return transformElement($(child), parser);
        })).then(function () {
            return element;
        });
    }
}
function getMatchingDirective(el, parser, directiveToIgnore) {
    var matchedDirective = null;
    utils.forEach(parser.directives, function (directive) {
        if (directive === directiveToIgnore) return;
        if (directive.matches(el)) matchedDirective = directive;
    });

    return matchedDirective;
}
function stringToElement(string, source) {
    var element = $(string);
    if (source) element.source(source);
    return element;
}

//
// Directive
//

function Directive (params) {
    utils.extend(this, params);
}
Directive.prototype = {
    // Camel case name
    name: null,
    // A string to be compiled, a url, or a function, or
    // a promise that returns one of the supported
    // types.
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
        var that = this;
        return resolveTemplate(this.template)
            .then(function (template) {
                var markup;
                if (template) {
                    markup = template.fn(context);
                    return stringToElement(markup, that.source || template.source);
                }
            });
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
    if (!template) return q(null);

    if (utils.isFunction(template)) {
        return q({
            fn: template,
            source: source
        });
    } else if (typeof template === 'string') {
        if (template.charAt(0) === '<') {
            return resolveTemplate(leaf.ext.templateCompiler(template), source);
        } else {
            return resolveTemplate(loadFile(template), utils.getBasePath(template));
        }
    } else if (template.then) {
        return template.then(function (data) {
            return resolveTemplate(data, source);
        });
    }

    return q.reject('template ' + template + ' is not a valid type');
}

// TODO: Move this
// TODO: Cache files
function loadFile(path) {
    // var deferred = q.defer();
    // require('fs').readFile(path, deferred.makeNodeResolver());
    // return deferred.promise.then(function (data) {
    //     return data.toString();
    // });
    return q(require('fs').readFileSync(path).toString());
}


// ext
leaf.ext.DOMParser = require('xmldom').DOMParser;
leaf.ext.XMLSerializer = require('xmldom').XMLSerializer;

try {
    leaf.ext.templateCompiler = require('handlebars').compile;
} catch (e) {}

module.exports = leaf;