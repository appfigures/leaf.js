var _ = require('lodash'),
    cheerio = require('cheerio'),
    utils = require('./utils'),
    errors = require('./errors'),
    globals = require('./globals'),
    Directive = require('./directive');

// Undercore's compose can't accept
// arrays and it processes the list
// in reverse order
function compose(fnList) {
    return function () {
        var len = fnList.length, i,
            args = arguments;
        for (i = 0; i < len; ++i) {
            args = [fnList[i].apply(this, args)];
        }
        return args[0];
    };
}

// 

function ParseSession(modules) {
    var that = this;

    this.globals = {};
    this.directives = [];
    this.modules = {};

    // Initialize the modules
    if (modules) {
        _.forEach(modules, function (fn, name) {
            that.modules[name] = fn(globals);
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
    transforms: null,
    modules: null,
    module: function (name) {
        var module = this.modules[name] || globals.modules[name];
        if (!module) throw 'Module not loaded ' + name;
        return module;
    },
    directive: function (name, props) {
        var directive = new Directive(props);
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
function getTemplateModules (el) {
    var name = 'af-modules',
        string = el.attr(name);

    el.removeAttr(name);

    return string ? string.split(' ') : [];
}

function getExtModules(source, cache) {
    var fileName = 'leaf-modules.js',
        obj = utils.requireUp(fileName, source, cache);

    if (!_.isObject(obj) || _.isArray(obj)) throw fileName + ' must export an object with moduleName -> fn mapping';
    return obj;
}

/**
 * @param input (filePath<String>|domElement<leaf.$>)
 * @param options.modules ({moduleName: moduleFn, ...})
 */
function parse(input, options) {
    var session, element, markup, $, string;

    options = _.merge({
        source: null,
        // xml | html (same as .stringify())
        outputFormat: 'xml',
        // markup | file
        inputType: 'markup',
        cache: null,
        // Optional custom modules
        // Other than the global ones
        modules: null,
        // Search the source path and
        // its ancestors for
        // a leaf-modules.js file
        loadModulesConfig: true,
        // Optional function to
        // mutate the session (function (session) {})
        // TODO: Rename
        fn: null,
        cheerioOptions: {
            xmlMode: true
        }
    }, options);

    options.cache = options.cache || new globals.Cache();
    options.modules = options.modules || {};

    if (_.isString(input)) {
        switch (options.inputType) {
            case 'markup':
                markup = input;
                break;
            case 'filePath':
                markup = utils.loadFile(input, options.cache);
                break;
            default:
                throw new TypeError('Invalid inputType ' + source.inputType);
        }

        $ = cheerio.load(markup, options.cheerioOptions);
        element = $.root().children();
        element.source(options.source || input);
    } else if (input instanceof cheerio) {
        $ = cheerio.load('', options.cheerioOptions);
        element = input;
        if (_.isString(options.source)) element.source(options.source);
    } else {
        throw 'Parse input must be a file path or a $(dom_element)';
    }

    if (element.length < 1) throw new errors.DOMParserError('String couldn\'t be parsed for an unknown reason');
    if (!element.isElement()) throw new errors.DOMParserError('Parsed element must be of nodeType 1 (Element). It is ' + element[0].nodeType);

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
    if (options.fn) options.fn(session);

    element = compose(session.transforms.pre)(element);
    element = transformElement(element, session);
    element = compose(session.transforms.post)(element);

    string = element.stringify(options.outputFormat);

    string = compose(session.transforms.string)(string);

    return string;
}

module.exports = parse;