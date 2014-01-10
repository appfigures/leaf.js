(function () {
    'use strict';

    var q, _,
        leaf, $;

    q = require('q');

    //
    // General Utils
    //

    function forEach(obj, fn) {
        var key;
        if (obj == null || !fn) return;

        if (isArrayLike(obj)) {
            for (key = 0; key < obj.length; ++key) {
                fn(obj[key], key);
            }
        } else {
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    fn(obj[key], key);
                }
            }
        }
    }
    function map(obj, fn) {
        return Array.prototype.map.call(obj, fn);
    }

    // My very rough version
    function isArrayLike(obj) {
        return (obj instanceof Array) || (typeof obj !== 'string' && typeof obj.length === 'number');
    }

    function trim(string) {
        return string.trim();
    }

    function toDashCase(string, separator) {
        separator = separator || '-';
        return string.replace(/([A-Z])/g, function($1){return separator + $1.toLowerCase();});
    }
    function isNumber(str) {
        return !isNaN(parseFloat(str)) && isFinite(str);
    }
    function isFunction(value) {
        var getType = {};
        return value && getType.toString.call(value) === '[object Function]';
    }
    function toCamelCase(string, separator) {
        separator = separator || '-';
        return string.replace(/(\-[a-z])/g, function($1){return $1.toUpperCase().replace(separator,'');});
    }

    function extend(dst) {
        forEach(Array.prototype.slice.call(arguments, 1), function (src) {
            var key;
            if (src) for (key in src) dst[key] = src[key];
        });
        return dst;
    }

    //
    // Lite jQuery
    //

    $ = (function () {
        function $(arg) {
            return new $.prototype.init(arg);
        }
        $.fn = $.prototype = {
            length: 0,
            init: function (arg) {
                if (!arg) return this;
                
                if (typeof arg === 'string') {
                    // Parse it
                    var parser = new leaf.libs.DOMParser();
                    var root = parser.parseFromString('<div>' + arg + '</div>', 'text/xml').documentElement;
                    arg = [];
                    forEach(root.childNodes, function (child) {
                        arg.push(child);
                    });
                } else if (arg.nodeType) {
                    // Handle this?
                }

                //if (arg instanceof Array) {
                if (arg instanceof Array || arg instanceof $) {
                    var i, len = arg.length;
                    for (i = 0; i < len; ++i) {
                        this[i] = arg[i];
                    }
                    this.length = len;
                } else {
                    this[0] = arg;
                    this.length = 1;
                }

                return this;
            },
            // For internal use only.
            // Behaves like an Array's method, not like a jQuery method.
            push: [].push,
            sort: [].sort,
            splice: [].splice
        };
        // This is how jQuery does it
        $.fn.init.prototype = $.fn;

        // Plugins

        extend($.fn, {
            each: function (fn) {
                forEach(this, fn);
                return this;
            },
            contents: function (ignoreEmptyTextNodes) {
                var children = $();

                forEach(this[0].childNodes, function (child) {
                    if (ignoreEmptyTextNodes) {
                       if (child.nodeType === 3 && !trim(child.nodeValue)) return;
                    }
                    children.push(child);
                });

                return children;
                // Onion.forEach(el.childNodes, function (child) {
            //     // Ignore text nodes with no content
            //     if (child.nodeType === 3 && !trim(child.nodeValue)) return;
            //     children.push(child);
            // });
            },
            children: function () {
                var children = $();

                forEach(this[0].childNodes, function (child) {
                    if (child.nodeType !== 1) return;
                    children.push(child);
                });

                return children;
            },
            replaceWith: function (newEl) {
                return this.each(function (el) {
                    if (el.parentNode) {
                        el.parentNode.replaceChild($(newEl)[0], el);
                    }
                });
            },
            wrap: function (wrapper) {
                wrapper = $(wrapper);

                // Find the deepest node
                var deepest = wrapper[0];
                while(deepest.firstChild) deepest = deepest.firstChild;

                this.replaceWith(wrapper);
                deepest.appendChild(this[0]);

                return this;
            },
            addClass: function (className) {
                return this.addToAttribute('class', className);
            },
            last: function () {
                return $(this[this.length - 1]);
            },
            
            // Custom
            stringify: function () {
                return map(this, function (el) {
                    var serializer = new leaf.libs.XMLSerializer();
                    return serializer.serializeToString(el);
                }).join('');
            },
            getAttributes: function () {
                var attributes = {};

                // Overridable
                function transformAttributeName (name) {
                    // Remove data-, x- and convert to camel case.
                    name = name.replace(/^(data|x)\-/i, '');
                    return toCamelCase(name);
                }
                function evalExp(exp) {
                    if (exp === '') return null;

                    if (isNumber(exp)) return parseFloat(exp);

                    var firstChar = exp.charAt(0),
                        lastChar = exp.charAt(exp.length - 1);

                    if (isQuote(firstChar) && isQuote(lastChar)) {
                        return exp.substr(1, exp.length - 2);
                    }

                    return exp;
                }
                function isQuote(char) {
                    return char === '\'' || char === '"';
                }

                forEach(this[0].attributes, function (attribute) {
                    var name = transformAttributeName(attribute.name),
                        value = evalExp(attribute.value);

                    attributes[name] = value;
                });
                return attributes;
            },
            removeAttributes: function () {
                return this.each(function (element) {
                    var attributes = [];
                    forEach(element.attributes, function (attribute) {
                        attributes.push(attribute.name);
                    });
                    forEach(attributes, function (name) {
                        element.removeAttribute(name);
                    });
                });
            },
            addToAttribute: function (attrName, attrValue) {
                return this.each(function (element) {
                    element.setAttribute(attrName, combineAttributes(element.getAttribute(attrName), attrValue));
                });
            }
        });

        // TODO: Organize these
        function combineAttributes(dst, src) {
            var value = dst || '',
                values = [];

            // Split on whitespace
            value.replace(/\S+/gi, function (value) {
                values.push(value);
            });

            if (values.indexOf(src) >= 0) return;
            values.push(src);
            return values.join(' ');
        }

        function createDocumentFragment () {
            var document = $('<dummy />')[0].ownerDocument;
            return document.createDocumentFragment();
        }

        // Keeps the src intact
        // Method params are plain nodes
        (function () {
            var defaultOptions = {
                attributes: {
                    'class': 'combine',
                    '*': 'src'
                },
                ops: {
                    'src': function (dstValue, srcValue) { return srcValue; },
                    'dst': function (dstValue, srcValue) { return srcValue; },
                    'combine': combineAttributes
                }
            };
            $.mergeElements = function (dst, src, options) {
                var contentPlaceholder,
                    childrenFragment,
                    cNode, nextNode;

                options = extend({}, defaultOptions, options);

                // console.log('merge:', $(src).stringify(), '->', $(dst).stringify());

                if (options.attributes) {
                    // Merge all the src attributes into dst
                    // Ignore data-* attributes
                    forEach(src.attributes, function (attribute, index) {
                        var name = attribute.name,
                            opFn, newValue;

                        if (name.indexOf('data-') === 0) return;

                        // If there's a conflict, try to resolve it
                        if (src.hasAttribute(name)) {
                            // Find the right op to use
                            opFn = options.attributes[name] || options.attributes['*'];
                            if (typeof opFn === 'string') opFn = options.ops[opFn];
                            if (!isFunction(opFn)) throw 'mergeElements: Operation not defined: ' + options.attributes[name];

                            newValue = opFn(dst.getAttribute(name), attribute.value);

                            // if (options.attributes[name] === 'combine') {
                            //     console.log(name + ':', dst.getAttribute(name), '+', attribute.value, '=',newValue);
                            // }
                        } else {
                            // Otherwise just copy the attribute over
                            newValue = attribute.value;
                        }

                        dst.setAttribute(name, newValue);
                    });
                }

                
                // Replace the contentPlaceholder with the children
                childrenFragment = createDocumentFragment();
                cNode = src.firstChild;

                while (cNode) {
                    nextNode = cNode.nextSibling;
                    childrenFragment.appendChild(cNode);
                    cNode = nextNode;
                }

                // TODO: What to call the placeholder tag?
                //contentPlaceholder = dst.getElementsByTagName('af-content')[0];
                contentPlaceholder = dst.getElementsByTagName('content')[0];

                if (contentPlaceholder) {
                    contentPlaceholder.parentNode.replaceChild(childrenFragment, contentPlaceholder);
                } else {
                    dst.appendChild(childrenFragment);
                }
            };        
        }());

        return $;
    }());

    //
    // Leaf
    //

    leaf = (function () {
        var leaf = {
            modules: [],
            Parser: Parser,
            $: $,
            debug: false,

            // Utils
            extend: extend,
            // Can be set by user
            libs: {
                DOMParser: null,
                XMLSerializer: null,
                templateCompiler: function (string) {
                    return function () { return string; };
                }
            }
        };

        //
        // Parser
        //

        function Parser(modules) {
            var that = this;

            this.globals = {};
            this.directives = [];

            forEach(modules, function (moduleName) {
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
                    return that.parseString(string, getBasePath(path));
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
                context = isFunction(context) ? context(parser) : context;
                context = extend({}, context, elementAttrs);

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
                return q.all(map(element.children(), function (child) {
                    return transformElement($(child), parser);
                })).then(function () {
                    return element;
                });
            }
        }
        function getMatchingDirective(el, parser, directiveToIgnore) {
            var matchedDirective = null;
            forEach(parser.directives, function (directive) {
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

        // TODO: Where to put this?
        $.fn.source = function (source) {
            if (source === undefined) return this[0].leafSource;

            // TODO: Take out
            function setSource(el, source) {
                el.leafSource = source;
                forEach(el.childNodes, function (child) {
                    setSource(child, source);
                });
            }

            return this.each(function (el) {
                setSource(el, source);
            });
        };

        //
        // Directive
        //

        function Directive (params) {
            extend(this, params);
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

                return (tagName === toDashCase(name, '-') ||
                    tagName === toDashCase(name, '_'));
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

            if (isFunction(template)) {
                return q({
                    fn: template,
                    source: source
                });
            } else if (typeof template === 'string') {
                if (template.charAt(0) === '<') {
                    return resolveTemplate(leaf.libs.templateCompiler(template), source);
                } else {
                    return resolveTemplate(loadFile(template), getBasePath(template));
                }
            } else if (template.then) {
                return template.then(function (data) {
                    return resolveTemplate(data, source);
                });
            }

            return q.reject('template ' + template + ' is not a valid type');
        }

        //
        // TODO: Move these
        //

        function getBasePath(path) {
            var index = path.lastIndexOf('/');

            if (index < 0) return '';

            // If the last '/' isn't in the middle, it's a dir
            if (index === 0 || index === path.length - 1) return path;

            return path.substring(0, index);
        }

        // Does nothing if the path is absolute
        function setBasePath(path, base) {
            var delimiter = '/';
            // It's an absolute path already
            if (path.charAt(0) === delimiter) return path;
            if (base.charAt(base.length - 1) !== delimiter) base += delimiter;

            return base + path;
        }
        leaf.setBasePath = setBasePath;
        leaf.getBasePath = getBasePath;

        function loadFile(path) {
            // var deferred = q.defer();
            // require('fs').readFile(path, deferred.makeNodeResolver());
            // return deferred.promise.then(function (data) {
            //     return data.toString();
            // });
            return q(require('fs').readFileSync(path).toString());
        }

        return leaf;
    }());

    //
    // Module
    //

    // TEMP
    if (typeof module !== 'undefined') {
        leaf.libs.DOMParser = require('xmldom').DOMParser;
        leaf.libs.XMLSerializer = require('xmldom').XMLSerializer;

        try {
            var Handlebars = require('handlebars');
            leaf.libs.templateCompiler = Handlebars.compile;
        } catch (e) {}

        module.exports = leaf;
    } else {
        leaf.libs.DOMParser = window.DOMParser;
        leaf.libs.XMLSerializer = window.XMLSerializer;
        window.leaf = leaf;
    }
    
}());

// leaf.js
// bloom.js
// blossom.js