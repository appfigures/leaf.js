// leaf.js
// bloom.js?
// blossom.js?

var $ = require('./libs/leaf-query'),
    utils = require('./libs/utils'),
    cache = require('./libs/cache'),
    leaf = {
        modules: [],
        Parser: Parser,
        $: $,
        cache: cache,
        debug: false,
        ext: require('./libs/ext'), // Can be set by user
        utils: utils
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
// ProcessChain
//

function ProcessChain () {
    this.fns = [];
}
ProcessChain.prototype = {
    fns: null,
    process: function (obj) {
        utils.forEach(this.fns, function (fn) {
            var out = fn(obj);
            if (out !== undefined) obj = out;
        });
        return obj;
    },
    add: function (fn) {
        this.fns.push(fn);
    }
};

//
// Parser
//

function Parser(modules) {
    var that = this;

    this.globals = {};
    this.directives = [];

    this.transforms = {
        rawElement: new ProcessChain(),
        string: new ProcessChain()
    };

    utils.forEach(modules, function (moduleName) {
        module = leaf.modules[moduleName];

        if (!module) throw 'Module ' + moduleName + ' not found';

        module(that);
    });
}

Parser.prototype = {
    globals: null,
    directives: null,
    transforms: null,
    directive: function (name, props) {
        var directive = new Directive(props);
        directive.name = name;
        this.directives.push(directive);
    },
    // Doesn't use the cache by default
    parse: function (pathOrString, source) {
        var element, content;

        if (pathOrString.charAt(0) === '<') {
            element = stringToElement(pathOrString, source);
            element = this.transforms.rawElement.process(element);
            element = transformElement(element, this);
            return element;
        } else {
            content = utils.loadFile(pathOrString);
            return this.parse(content, source || utils.getBasePath(pathOrString));
        }
    },
    stringify: function (input, source) {
        var element = this.parse(input, source),
            string = element.stringify();

        string = this.transforms.string.process(string);
        return string;
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
        directive.prepare(context, element);
        var newElement = directive.parseTemplate(context);

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
        directive.logic(newElement, context, parser);

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
    } else {
        // Compile all the children
        element.children().each(function (child) {
            transformElement($(child), parser);
        });
        return element;
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
        var templateCache = cache.$get('template'),
            resolvedTemplate = templateCache[this.name];

        if (!resolvedTemplate) {
            resolvedTemplate = resolveTemplate(this.template);
            templateCache[this.name] = resolvedTemplate;
        }

        var markup;
        if (resolvedTemplate) {
            markup = resolvedTemplate.fn(context);
            return stringToElement(markup, this.source || resolvedTemplate.source);
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
            if (leaf.debug) console.log('compiling template', source);
            return resolveTemplate(leaf.ext.templateCompiler(template), source);
        } else {
            return resolveTemplate(utils.loadFile(template), utils.getBasePath(template));
        }
    }

    throw 'template ' + template + ' is not a valid type';
}

//
// Export
//

leaf.ext.DOMParser = require('xmldom').DOMParser;
leaf.ext.XMLSerializer = require('xmldom').XMLSerializer;

try {
    leaf.ext.templateCompiler = require('underscore').template;
} catch (e) {}

module.exports = leaf;