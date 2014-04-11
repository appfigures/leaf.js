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

function ParseSession() {
    this.globals = {};
    this.directives = [];

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

function rawParse(options) {
    var context, element, content, modules;

    options = _.extend({
        path: null,
        xmlString: null,
        source: null,
        cache: null,
        // Optional custom modules
        // Other than the global ones
        modules: null
    }, options);

    if (options.path) {
        options.xmlString = utils.loadFile(options.path);
    }

    if (!options.xmlString) {
        // TODO: Make this more useful
        throw 'Error parsing input. Couldn\'t resolve an xml string';
    }

    session = new ParseSession();
    session.options = options;
    session.cache = options.cache || new globals.Cache();

    element = $(options.xmlString);

    if (element.length < 1) throw new errors.DOMParserError('String couldn\'t be parsed for an unknown reason');
    if (element[0].nodeType !== 1) throw new errors.DOMParserError('Parsed element must be of nodeType 1 (Element). It is ' + element[0].nodeType);

    element.source(options.source);

    // Get all the modules
    modules = getTemplateModules(element).map(function (moduleName) {
        module = globals.modules[moduleName];
        if (!module) throw 'Module ' + moduleName + ' not found. It can be included using leaf.use()';
        return module;
    });

    if (options.modules) modules = modules.concat(options.modules);

    modules.forEach(function (fn) {
        fn(session);
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
    parse: function (options) {
        return rawParse(options).el;
    },
    stringify: function (options) {
        var raw = rawParse(options),
            string = raw.el.stringify();
        return compose(raw.session.transforms.string)(string);
    }
};