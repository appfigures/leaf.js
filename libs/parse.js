var _ = require('lodash'),
    cheerio = require('./cheerio-leaf'),
    utils = require('./utils'),
    errors = require('./errors'),
    globals = require('./globals'),
    Cache = require('./cache'),
    Directive = require('./directive');

/*

    Module structure:

    // This outer function is known as the module factory
    function (leaf) {
        // This code always gets executed (once)

        return function (session) {
            // This code only gets executed if the module
            // is referenced in the template's af-module attribute.

            // This code runs once per parse() call.
        }
    }

*/

// 

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

            module = fn(globals);

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
    globals: null,
    directives: null,
    // TODO: Is there a better name for these? mutators?
    transforms: null,
    // {name -> moduleFn}
    // See top of file for module fn structure
    modules: null,
    module: function (name) {
        var module = this.modules[name];
        if (!module) {
            throw new errors.LeafParseError('Module was not loaded ' + name);
        }
        return module;
    },
    // string, {} | string
    directive: function (name, props) {
        var directive;

        if (typeof props === 'string') {
            props = {
                template: props
            };
        }

        directive = new Directive(props);
        directive.name = name;
        this.directives.push(directive);
    }
};

// Parser internals
function transformElement(element, session, parentContext, directivesToIgnore) {
    // Get matching directive
    var directives = getMatchingDirectives(element, session, directivesToIgnore),
        elementAlreadyReplaced = false, origParent = element[0].parent;

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
                utils.mergeElements(newElement[0], element[0], session.$, directive.mergeOptions);

                // Replace the element in its parent
                if (element[0].parent) {
                    element.replaceWith(newElement);
                }                
            } else {
                newElement = element;
            }

            //  Run the directive's logic
            directive.logic(newElement, context);//, session);
            // ^ Took out session because it contains information
            // which the directive shouldn't have access to such as
            // other directives and transformations. The only thing
            // that session has which the directive might need is the
            // globals object. We can pass that in explicity if needed
            // though right now it's also passed into context.$globals
            // (to be used inside of directive templates).
            // When we know this works, remove the comments.

            // If the element has deleted itself, stop processing
            if (newElement[0].parent !== origParent) {
                return false;
            }

            if (globals.debug) {
                // Keep a record of the directives applied
                // to this node
                var dir = newElement.att('af-directive');
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
function getTemplateModules (el) {
    var out, text;

    el = el.first();
    if (el.nodeType() === 'comment') {
        text = el.commentValue().trim();
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

/**
 * parse(input [, transformFn] [, options])
 * 
 * @param input (filePath<String>|domElement<leaf.$>)
 * @param A quick way to pass in options.fn. Takes precedence.
 *      Added this as a param because it's useful for
 *      writing quick tests.
 * @param options.modules ({moduleName: moduleFn, ...})
 */
function parse(input, transformFn, options) {
    var session, element, markup, $, string;

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
        transform: transformFn, // TODO: Rename
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
        element = $.root().contents();
        element.source(options.source || input);
    } else if (input instanceof cheerio) {
        $ = cheerio.load('', options.cheerioOptions);
        element = input;
        if (_.isString(options.source)) element.source(options.source);
    } else {
        throw new TypeError('input must be a string or a $(dom_element)');
    }

    if (element.length < 1) throw new errors.DOMParserError('String couldn\'t be parsed for an unknown reason');

    // Get the modules
    if (options.loadModulesConfig) {
        options.modules = _.extend(
            getExtModules(element.source(), options.cache),
            options.modules
        );
    }

    session = new ParseSession(options.modules);
    session.options = options;
    session.cache = options.cache;
    session.$ = $;

    // Load all the modules
    getTemplateModules(element)
        .forEach(function (moduleName) {
            // Using .call to make it more obvious that
            // session.module() returns a function. There's
            // probably a less redundant way to show this though :)
            session.module(moduleName).call(this, session);
        });

    // Execute the optional callback
    if (options.transform) options.transform(session);

    element = utils.compose(session.transforms.pre)(element);
    element = transformElement(element, session);
    element = utils.compose(session.transforms.post)(element);

    string = element.stringify(options.outputFormat);

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