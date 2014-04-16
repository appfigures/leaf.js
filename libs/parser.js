var _ = require('underscore'),
    utils = require('./utils'),
    errors = require('./errors'),
    globals = require('./globals'),
    $ = require('./query'),
    Directive = require('./directive');
    // Context = require('./context');

// Undercore's compose can't accept
// arrays
function compose(fnList) {
    return _.compose.apply(_, fnList);
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

// Look for inline modules
function getTemplateModules (el) {
    var name = 'af-modules',
        string = el[0].getAttribute(name);

    el[0].removeAttribute(name);

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
function rawParse(input, options) {
    var session, element;

    options = _.extend({
        source: null,
        cache: null,
        // Optional custom modules
        // Other than the global ones
        modules: null,
        // Search the source path and
        // its ancestors for
        // a leaf-modules.js file
        loadModulesConfig: true
    }, options);

    options.cache = options.cache || new globals.Cache();
    options.modules = options.modules || {};

    if (_.isString(input)) {
        element = $(utils.loadFile(input, options.cache)).source(options.source || input);
    } else if (input instanceof $) {
        element = input;
        if (_.isString(options.source)) element.source(options.source);
    } else {
        throw 'Parse input must be a file path or a $(dom_element)';
    }

    if (element.length < 1) throw new errors.DOMParserError('String couldn\'t be parsed for an unknown reason');
    if (element[0].nodeType !== 1) throw new errors.DOMParserError('Parsed element must be of nodeType 1 (Element). It is ' + element[0].nodeType);

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

    // Load all the modules
    getTemplateModules(element)
        .forEach(function (moduleName) {
            session.module(moduleName).call(this, session);
        });

    element = compose(session.transforms.pre)(element);
    element = transformElement(element, session);
    element = compose(session.transforms.post)(element);

    return {
        el: element,
        session: session
    };
}

// Parser internals
function transformElement(element, session, parentContext, directiveToIgnore) {

    // Get matching directive
    var directive = getMatchingDirective(element, session, directiveToIgnore),
        elementAttrs,
        context;

    if (directive) {
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
        var newElement = directive.parseTemplate(context, session.cache);

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
        directive.logic(newElement, context);//, session);
        // ^ Took out session because it contains information
        // which the directive shouldn't have access to such as
        // other directives and transformations. The only thing
        // that session has which the directive might need is the
        // globals object. We can pass that in explicity if needed
        // though right now it's also passed into context.$globals
        // (to be used inside of directive templates).
        // When we know this works, remove the comments.

        if (globals.debug) {
            // Keep a record of the directives applied
            // to this node
            var dir = newElement[0].getAttribute('af-directive');
            dir = dir ? dir + ' ' : '';
            newElement[0].setAttribute('af-directive', dir + directive.name);
        }

        // Run the new node through the compiler again, ignoring
        // the matched directive
        return transformElement(newElement, session, context, directive);
    } else {
        // Compile all the children
        element.children().each(function (child) {
            transformElement($(child), session);
        });
        return element;
    }
}
function getMatchingDirective(el, session, directiveToIgnore) {
    var matchedDirective = null;
    _.forEach(session.directives, function (directive) {
        if (directive === directiveToIgnore) return;
        if (directive.matches(el)) matchedDirective = directive;
    });

    return matchedDirective;
}

module.exports = {
    parse: function (input, options) {
        return rawParse(input, options).el;
    },
    stringify: function (input, options) {
        var raw = rawParse(input, options),
            string = raw.el.stringify();
        return compose(raw.session.transforms.string)(string);
    }
};