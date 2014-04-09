var _ = require('underscore'),
    utils = require('./utils'),
    globals = require('./globals'),
    $ = require('./query'),
    Directive = require('./directive');
    // Context = require('./context');

//
// ProcessChain
//

function ProcessChain () {
    this.fns = [];
}
ProcessChain.prototype = {
    fns: null,
    process: function (obj) {
        _.forEach(this.fns, function (fn) {
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

function ParseSession() {
    this.globals = {};
    this.directives = [];

    this.transforms = {
        pre: new ProcessChain(),
        post: new ProcessChain(),
        string: new ProcessChain()
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
    var context, element, content;

    options = _.extend({
        path: null,
        xmlString: null,
        source: null
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

    element = $(options.xmlString);
    element.source(options.source);

    // Get all the modules
    _.forEach(getTemplateModules(element), function (moduleName) {
        module = globals.modules[moduleName];

        if (!module) throw 'Module ' + moduleName + ' not found. It can be included using leaf.use()';

        module(session);
    });

    element = session.transforms.pre.process(element);
    element = transformElement(element, session);
    element = session.transforms.post.process(element);

    return {
        el: element,
        session: session
    };
}

function parse (options) {
    return rawParse(options).el;
}

//
// Parser
//

// function Parser(modules) {
//     var that = this;

//     this.globals = {};
//     this.directives = [];

//     this.transforms = {
//         pre: new ProcessChain(),
//         post: new ProcessChain(),
//         string: new ProcessChain()
//     };

//     _.forEach(modules, function (moduleName) {
//         module = globals.modules[moduleName];

//         if (!module) throw 'Module ' + moduleName + ' not found';

//         module(that);
//     });
// }

// Parser.prototype = {
//     globals: null,
//     directives: null,
//     transforms: null,
//     directive: function (name, props) {
//         var directive = new Directive(props);
//         directive.name = name;
//         this.directives.push(directive);
//     },
//     // Doesn't use the cache by default
//     parse: function (pathOrString, source) {
//         var element, content;

//         if (pathOrString.charAt(0) === '<') {
//             element = $(pathOrString);
//             element.source(source);
//             element = this.transforms.pre.process(element);
//             element = transformElement(element, this);
//             element = this.transforms.post.process(element);
//             return element;
//         } else {
//             content = utils.loadFile(pathOrString);
//             return this.parse(content, source || pathOrString);
//         }
//     },
//     stringify: function (input, source) {
//         var element = this.parse(input, source),
//             string = element.stringify();

//         string = this.transforms.string.process(string);
//         return string;
//     }
// };
//
// module.exports = Parser;

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
        return raw.session.transforms.string.process(string);
    }
};