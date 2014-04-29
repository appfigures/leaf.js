//
// Lite jQuery
//

var _ = require('underscore'),
    utils = require('./utils'),
    libs = require('./ext'),
    errors = require('./errors'),
    combineAttributesRegexp = /\S+/gi,
    transformAttributeRegexp = /^(data|x)\-/i;

function parseXMLString(string) {
    // Parse it
    var parser = new libs.DOMParser({
            errorHandler: {
                warning: function (e) {throw new errors.DOMParserError('warning: ' + e + '\n' + string);},
                error: function (e) {new errors.DOMParserError(e + '\n' + string);},
                fatalError: function (e) {new errors.DOMParserError('fatalError: ' + e + '\n' + string);}
            }
        }),
        root = parser.parseFromString('<div>' + string + '</div>', 'text/xml').documentElement,
        child,
        out = [];

    while(child = root.firstChild) {
        root.removeChild(child);
        // Due to a bug in XMLDom, parentNode
        // doesn't get cleared when removing
        // (https://github.com/jindw/xmldom/issues/86)
        child.parentNode = undefined;

        out.push(child);
    }

    // Things like <head> get turned into a text node.
    // That could be hard to debug.
    if (out.length === 1 && string.charAt(0) === '<' && out[0].nodeType === 3) throw 'Error parsing string to a DOM element: ' + string;

    return out;
}

function $(arg) {
    return new $.prototype.init(arg);
}
$.fn = $.prototype = {
    length: 0,
    init: function (arg) {
        if (!arg) return this;
        
        if (typeof arg === 'string') {
            arg = parseXMLString(arg);
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

_.extend($.fn, {
    each: function (fn) {
        _.forEach(this, fn);
        return this;
    },
    map: function (fn) {
        return $(_.map(this, fn));
    },
    contents: function (ignoreEmptyTextNodes, ignoreComments) {
        return $(Array.prototype.slice.call(this[0].childNodes));
    },
    text: function (value) {
        // Super bare implementation
        if (value === undefined) {
            return this[0].textContent;
        } else {
            this[0].textContent = value;
        }
    },
    parent: function () {
        return this.map(function (el) {
            return el.parentNode;
        });
    },
    before: function (item) {
        return this.each(function (el) {
            if (el.parentNode) {
                $(item).each(function (itemEl) {
                    el.parentNode.insertBefore(itemEl, el);
                });
            }
        });
    },
    after: function (item) {
        return this.each(function (el) {
            if (el.parentNode) {
                $(item).each(function (itemEl) {
                    el.parentNode.insertBefore(itemEl, el.nextSibling);
                });
            }
        });
    },
    append: function (item) {
        return this.each(function (el) {
            if (el.nodeType !== 1) return;
            $(item).each(function (itemEl) {
                el.appendChild(itemEl);
            });
        });
    },
    prepend: function (item) {
        return this.each(function (el) {
            if (el.nodeType !== 1) return;
            $(item).each(function (itemEl) {
                el.insertBefore(itemEl, el.childNodes[0]);
            });
        });
    },
    remove: function () {
        return this.each(function (el) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);

                // Due to a bug in XMLDom, parentNode
                // doesn't get cleared when removing
                // (https://github.com/jindw/xmldom/issues/86)
                el.parentNode = undefined;
            }
        });
    },
    children: function () {
        var children = $();

        _.forEach(this[0].childNodes, function (child) {
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
    clone: function () {
        return this.map(function (el) {
            return el.cloneNode(true);
        });
    },
    // It's easy to implement wrap() using clone
    wrapAll: function (wrapper) {
        if (this.length > 0) {
            wrapper = $(wrapper);

            // Find the deepest node
            var deepest = wrapper[0];
            while(deepest.firstChild) deepest = deepest.firstChild;

            this.replaceWith(wrapper);
            $(deepest).append(this);
        }

        return this;
    },
    wrapInner: function (wrapper) {
        this.contents().wrapAll(wrapper);
    },
    addClass: function (className) {
        return this.addToAttribute('class', className);
    },
    first: function () {
        return $(this[0]);
    },
    last: function () {
        return $(this[this.length - 1]);
    },
    
    // Custom
    stringify: function () {
        return _.map(this, function (el) {
            var serializer = new libs.XMLSerializer();
            return serializer.serializeToString(el);
        }).join('');
    },
    getAttributes: function () {
        var attributes = {};

        // Overridable
        function transformAttributeName (name) {
            // Remove data-, x- and convert to camel case.
            name = name.replace(transformAttributeRegexp, '');
            return utils.toCamelCase(name);
        }
        function evalExp(exp) {
            if (exp === '') return null;

            if (utils.isNumeric(exp)) return parseFloat(exp);

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

        _.forEach(this[0].attributes, function (attribute) {
            var name = transformAttributeName(attribute.name),
                value = evalExp(attribute.value);

            attributes[name] = value;
        });
        return attributes;
    },
    removeAttributes: function () {
        return this.each(function (element) {
            var attributes = [];
            _.forEach(element.attributes, function (attribute) {
                attributes.push(attribute.name);
            });
            _.forEach(attributes, function (name) {
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

// NEW
_.extend($.fn, {
    forEach: function (fn) {
        _.forEach(this, fn);
        return this;
    },
    filterEmptyTextAndComments: function () {
        var newArr = [];
        this.forEach(function (child) {
            if (child.nodeType === 3 && !utils.trim(child.nodeValue)) return;
            if (child.nodeType === 8) return;
            newArr.push(child);
        });
        return $(newArr);
    },
    hasAttr: function (name) {
        return this[0].hasAttribute(name);
    },
    parent: function () {
        return $(this[0].parentNode);
    },
    attr: function (key, value) {
        if (value === undefined) {
            return this[0].getAttribute(key);
        }

        this[0].setAttribute(key, value);
        return this;
    },
    removeAttr: function (name) {
        return this.forEach(function (el) {
            el.removeAttribute(name);
        });
    },
    tagName: function () {
        return this[0].tagName;
    }
});

// Simple selectors
(function () {
    $.fn.find = function (selector, rest) {
        var arr = [],
            args;

        if (arguments.length === 1) {
            args = Array.prototype.slice.call(arguments);
            selector = $.by.tag;
        } else {
            args = Array.prototype.slice.call(arguments, 1, arguments.length);
        }

        this.each(function (el) {
            var out = selector.apply(el, args);

            if (utils.isArrayLike(out)) {
                _.forEach(out, function (element) {
                    arr.push(element);
                });
            } else {
                arr.push(out);
            }
        });

        return $(arr);
    };

    // 'this' is the raw dom element
    $.by = {
        id: function (id) {
            return this.getElementById(id);
        },
        tag: function (name) {
            return this.getElementsByTagName(name);
        }
    };
}());

function combineAttributes(dst, src) {
    var value = dst || '',
        values = [];

    // Split on whitespace
    value.replace(combineAttributesRegexp, function (value) {
        values.push(value);
    });

    if (values.indexOf(src) >= 0) return;
    values.push(src);
    return values.join(' ');
}

// Keeps the src intact
// Method params are plain nodes
(function () {

    // Merge all the src attributes into dst
    // Ignore data-* attributes
    // @param dst - DOMElement
    // @param src - DOMElement | {attrName: value, ...}
    $.mergeAttributes = function (dst, src, options) {
        options = _.extend({}, $.mergeAttributes.defaults, options);

        function loop(value, name, hasAttribute) {
            var opFn, newValue;

            // TODO: Expose this functionality
            if (name.indexOf('data-') === 0) return;

            // If there's a conflict, try to resolve it
            if (src.hasAttribute ? src.hasAttribute(name) : name in src) {
                // Find the right op to use
                opFn = options.attributes[name] || options.attributes['*'];
                if (typeof opFn === 'string') opFn = options.ops[opFn];
                if (!_.isFunction(opFn)) throw 'mergeElements: Operation not defined: ' + options.attributes[name];

                newValue = opFn(dst.getAttribute(name), value);
            } else {
                // Otherwise just copy the attribute over
                newValue = value;
            }

            dst.setAttribute(name, newValue);
        }

        if (src.nodeType) {
            _.forEach(src.attributes, function (attribute) {
                return loop(attribute.value, attribute.name);
            });
        } else {
            _.forEach(src, loop);
        }
    };

    $.mergeAttributes.defaults = {
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

        options = _.extend({}, $.mergeElements.defaults, options);

        // console.log('merge:', $(src).stringify(), '->', $(dst).stringify());
        if (options.attributes) {
            $.mergeAttributes(dst, src, options.attrs);
        }

        // Replace the contentPlaceholder with the children
        childrenFragment = createDocumentFragment();
        cNode = src.firstChild;

        while (cNode) {
            nextNode = cNode.nextSibling;
            childrenFragment.appendChild(cNode);
            cNode = nextNode;
        }

        contentPlaceholder = dst.getElementsByTagName(options.contentTagName)[0];

        if (contentPlaceholder) {
            contentPlaceholder.parentNode.replaceChild(childrenFragment, contentPlaceholder);
        } else {
            dst.appendChild(childrenFragment);
        }
    };
    $.mergeElements.defaults = {
        contentTagName: 'content',
        attributes: {}
    };

    function createDocumentFragment () {
        var document = $('<dummy />')[0].ownerDocument;
        return document.createDocumentFragment();
    }
}());

module.exports = $;