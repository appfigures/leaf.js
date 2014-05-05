var _ = require('lodash'),
    cheerio = require('./cheerio-leaf'),
    utils = require('./utils'),
    errors = require('./errors'),
    globals = require('./globals'),
    Cache = require('./cache'),
    Directive = require('./directive');

/*

Leaf module structure:

// This outer function is known as the module factory
function (leaf) {
    // This code always gets executed (once)

    return function (session) {
        // This code only gets executed if the module
        // is referenced in the template's af-module attribute.

        // This code runs once per leaf.parse() call.
    }
}

*/


/**
    An object that lives for the lifetime
    of the parsing process (an async process).
    Holds all information that should be shared
    across directives.
*/

function ParseSession(modules) {
    var that = this;

    this.globals = {};
    this.directives = [];
    this.modules = {};

    // Initialize the modules
    if (modules) {
        _.forEach(modules, function (fn, name) {
            var module;

            if (!_.isFunction(fn)) throw new errors.LeafParseError('Module ' + name + ' is not a function. Valid structure is `function (leaf) { return function (session) { ... }; }');

            // Pass the leaf object along
            module = fn(require('../'));

            if (!_.isFunction(module)) throw new errors.LeafParseError('Module factory for \'' + name + '\' returns invalid type (' + typeof module + ') instead of a function');

            that.modules[name] = module;
        });
    }

    this.transforms = {
        pre: [],
        post: [],
        string: []
    };
}
ParseSession.prototype = {
    //
    // Public
    //

    // A place for directives
    // and modules to store meta data
    globals: null,

    // Inject behavior to the parsing
    // process at different points.
    //
    // Structure:
    // {
    //      pre: [function, ...]
    //          Mutate the root dom
    //          element before parsing
    //      post: [function, ...]
    //          Mutate the root dom element
    //          after parsing
    //      string: [function, ...]
    //          Mutate the output string
    // }
    transforms: null,

    // Define a directive.
    // @param name A camel cased name
    // @param props {} (directive options) | templateString | logicFn | false (remove matched element)
    directive: function (name, props) {
        var directive;

        if (typeof props === 'string') {
            props = {
                template: props
            };
        } else if (_.isFunction(props)) {
            props = {
                logic: props
            };
        } else if (props === false) {
            // Remove matched element
            props = {
                logic: function () { return false; }
            };
        }

        directive = new Directive(props);
        directive.name = name;
        this.directives.push(directive);
    },

    // Retrieve a module from this session or
    // leaf.modules. Can be used to share
    // functionality across modules
    module: function (name) {
        var module = this.modules[name] || globals.modules[name];
        if (!module) {
            throw new errors.LeafParseError('Module \'' + name + '\' was not found. Make sure it exists in options.modules, a local leaf-modules.js file, or the global leaf.modules object.' + name);
        }
        return module;
    },

    //
    // private
    //

    // All defined directives
    directives: null,

    // All modules defined for this session.
    // {name -> moduleFn}
    // See top of file for module fn structure
    modules: null
};

// Parser internals
// @param element must have a length of 1
// @return is expected to have a length of 1
function transformElement(element, session, parentContext, directivesToIgnore) {
    if (element.length !== 1) throw new TypeError('Cannot transformElement an $(element) with more or less than one item');

    // Get matching directive
    var directives = getMatchingDirectives(element, session, directivesToIgnore),
        elementAlreadyReplaced = false;

    if (directives.length > 0) {
        // Using every instead of forEach to allow
        // for quick exit (http://stackoverflow.com/questions/6260756/how-to-stop-javascript-foreach)
        directives.every(function (directive) {
            var elementAttrs,
                context, newElement;

            // Generate the context
            elementAttrs = element.getAttributes();

            context = directive.context;
            context = _.isFunction(context) ? context(session.globals) : context;
            context = _.extend({}, context, elementAttrs, parentContext);
            context.$globals = session.globals;

            //  Create the new node from the
            //  directive's template, or use
            //  the existing node
            directive.prepare(context, element);
            newElement = directive.parseTemplate(context, session);

            if (newElement) {
                if (elementAlreadyReplaced) {
                    throw 'More than one directive is trying to template the element (directives = ' + directives.map(function (d) {return d.name;}).join(',') + ')';
                }
                elementAlreadyReplaced = true;

                //  Merge the attributes and children from
                //  the originalNode into the newNode
                utils.mergeElements(newElement[0], element[0], directive.mergeOptions);

                // Replace the element in its parent
                // if (element[0].parent) {
                element.replaceWith(newElement);
                // }                
            } else {
                newElement = element;
            }

            // Run the directive's logic. If it returns
            // false, remove the element
            if (directive.logic(newElement, context) === false) {
                element.remove();
                element = session.$();

                // Quick exit
                return false;
            }

            if (globals.debug) {
                // Keep a record of the directives applied
                // to this node
                var dir = newElement.attr('af-directive');
                dir = dir ? dir + ' ' : '';
                newElement.attr('af-directive', dir + directive.name);
            }

            // Run the new node through the compiler again, ignoring
            // the matched directives
            element = transformElement(newElement, session, context, directives);

            return true;
        });
        
        return element;
    } else {
        // Compile all the children
        element.children().each(function (i, child) {
            transformElement(session.$(child), session);
        });
        return element;
    }
}

// Parse utils

function getMatchingDirectives(el, session, directivesToIgnore) {
    var matchedDirectives = [];
    _.forEach(session.directives, function (directive) {
        if (directivesToIgnore && directivesToIgnore.indexOf(directive) >= 0) return;
        if (directive.matches(el)) matchedDirectives.push(directive);
    });

    return matchedDirectives;
}

// Look for inline modules
// First element should be a comment with
// <!-- modules: x, y, z -->
function getTemplateModules (root) {
    var out, text, first;

    first = root.first();
    if (first.isComment()) {
        text = first.commentValue().trim();
        if (text.indexOf('modules:') === 0) {
            out = text.substr('modules:'.length).split(',').map(function (str) {
                return str.trim();
            });
        }
    }

    return out || [];
}

function getExtModules(source, cache) {
    var fileName = 'leaf-modules.js',
        obj = utils.requireUp(fileName, source, cache);

    if (!_.isObject(obj) || _.isArray(obj)) throw new errors.LeafParseError(fileName + ' must export an object with moduleName -> fn mapping');
    return obj;
}

// For debugging
function getTagNames(els) {
    return _.map(els, function (el) {
        if (el.name) return '<' + el.name + '/>';
        if (el.type) return '[' + el.type + ']';
        return '(unknown)';
    }).join(',');
}

/**
 * parse(input [, transformFn] [, options])
 *
 * x It's important to note that the element object
 * x passed to transformation functions is the root
 * x of the tree and does not undergo any transformations.
 * 
 * @param input (filePath<String>|markup<String>|domElement<cheerio()>)
 * @param A quick way to pass in options.fn. Takes precedence.
 *      Added this as a param because it's useful for
 *      writing quick tests.
 * @param options.modules ({moduleName: moduleFn, ...})
 */
function parse(input, transformFn, options) {
    var session, root, markup, $, templateModules, string;

    if (!_.isFunction(transformFn)) {
        options = transformFn;
        transformFn = null;
    }

    options = _.merge({
        // How to parse the input
        // in case it's a string
        // markup | file | null (auto)
        inputType: null,
        source: null,
        // Optional custom modules
        // Other than the global ones
        // {name -> fn}
        modules: null,
        // Search the source path and
        // its ancestors for
        // a leaf-modules.js file
        loadModulesConfig: true,
        // Optional function to
        // mutate the session (function (session) {})
        // Gets called AFTER all the modules
        // are loaded.
        transform: transformFn,
        cache: null,
        cheerioOptions: {
            xmlMode: true
        },
        // xml | html (same as .stringify())
        outputFormat: 'xml'
    }, options);

    options.cache = options.cache || new Cache();
    options.modules = options.modules || {};

    if (_.isString(input)) {

        if (!options.inputType) {
            // Make an educated guess
            if (!input || utils.isHtmlString(input)) {
                options.inputType = 'markup';
            } else {
                options.inputType = 'filePath';
            }
        }

        switch (options.inputType) {
            case 'markup':
                markup = input;
                break;
            case 'filePath':
                markup = utils.loadFile(input, options.cache);
                break;
            default:
                throw new TypeError('Invalid inputType ' + options.inputType);
        }

        $ = cheerio.load(markup, options.cheerioOptions);
        root = $.root().contents();
        if (root.length < 1) throw new errors.DOMParserError('Input couldn\'t be parsed for an unknown reason');

        root.source(options.source || input);
    } else if (input instanceof cheerio) {
        $ = cheerio.load('', options.cheerioOptions);
        root = input;
        if (_.isString(options.source)) root.source(options.source);
    } else {
        throw new TypeError('input must be a string or a $(dom_element)');
    }

    // Look for <!-- modules: x, y, z -->
    templateModules = getTemplateModules(root);

    // Filter out all the junk
    root = root.filterEmptyTextAndComments();

    // Make sure only one root node is left
    if (root.length <= 0) throw new TypeError('input must not be an empty dom');
    if (root.length > 1) {
        throw new errors.LeafParseError('Input must have a single root node. Has (' + getTagNames(root) + ')');
    }

    // Get the modules from an external
    // file somewhere up the fille hierarchy from
    // the source
    if (options.loadModulesConfig) {
        options.modules = _.extend(
            getExtModules(root.source(), options.cache),
            options.modules
        );
    }

    session = new ParseSession(options.modules);
    session.options = options;
    session.cache = options.cache;
    session.$ = $;

    // Load all the modules
    templateModules.forEach(function (moduleName) {
        var fn = session.module(moduleName);
        fn(session);
    });

    // Execute the optional callback
    if (options.transform) options.transform(session);

    root = utils.compose(session.transforms.pre)(root);

    // The meat
    root = transformElement(root, session);

    root = utils.compose(session.transforms.post)(root);

    // Make a string
    string = root.stringify(options.outputFormat);

    string = utils.compose(session.transforms.string)(string);

    return string;
}

// Helpers to explicitly specify the
// input type
parse.string = function (input, options) {
    return parse(input, _.extend({
        inputType: 'markup'
    }, options));
};
parse.file = function (input, options) {
    return parse(input, _.extend({
        inputType: 'filePath'
    }, options));
};

module.exports = parse;