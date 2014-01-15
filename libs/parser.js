var utils = require('./utils'),
    globals = require('./globals'),
    $ = require('./query'),
    Directive = require('./directive');

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
        module = globals.modules[moduleName];

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
            element = $(pathOrString);
            element.source(source);
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

        if (globals.debug) {
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

module.exports = Parser;