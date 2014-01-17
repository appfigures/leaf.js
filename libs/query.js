//
// Lite jQuery
//

var utils = require('./utils'),
    libs = require('./ext'),
    combineAttributesRegexp = /\S+/gi,
    transformAttributeRegexp = /^(data|x)\-/i;

function $(arg) {
    return new $.prototype.init(arg);
}
$.fn = $.prototype = {
    length: 0,
    init: function (arg) {
        if (!arg) return this;
        
        if (typeof arg === 'string') {
            // Parse it
            var parser = new libs.DOMParser({
                errorHandler: {
                    warning: function (e) {throw 'DOMParser warning: ' + e + '\n' + arg;},
                    error: function (e) {throw 'DOMParser error: ' + e + '\n' + arg;},
                    fatalError: function (e) {throw 'DOMParser fatalError: ' + e + '\n' + arg;}
                }
            });
            var root = parser.parseFromString('<div>' + arg + '</div>', 'text/xml').documentElement;
            arg = [];
            utils.forEach(root.childNodes, function (child) {
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

utils.extend($.fn, {
    each: function (fn) {
        utils.forEach(this, fn);
        return this;
    },
    contents: function (ignoreEmptyTextNodes, ignoreComments) {
        var children = $();

        utils.forEach(this[0].childNodes, function (child) {
            if (ignoreEmptyTextNodes) {
               if (child.nodeType === 3 && !utils.trim(child.nodeValue)) return;
            }
            if (ignoreComments) {
                if (child.nodeType === 8) return;
            }
            children.push(child);
        });

        return children;
    },
    append: function (item) {
        return this.each(function (el) {
            $(item).each(function (itemEl) {
                el.appendChild(itemEl);
            });
        });
    },
    remove: function () {
        return this.each(function (el) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    },
    children: function () {
        var children = $();

        utils.forEach(this[0].childNodes, function (child) {
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
    first: function () {
        return $(this[0]);
    },
    last: function () {
        return $(this[this.length - 1]);
    },
    
    // Custom
    stringify: function () {
        return utils.map(this, function (el) {
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

            if (utils.isNumber(exp)) return parseFloat(exp);

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

        utils.forEach(this[0].attributes, function (attribute) {
            var name = transformAttributeName(attribute.name),
                value = evalExp(attribute.value);

            attributes[name] = value;
        });
        return attributes;
    },
    removeAttributes: function () {
        return this.each(function (element) {
            var attributes = [];
            utils.forEach(element.attributes, function (attribute) {
                attributes.push(attribute.name);
            });
            utils.forEach(attributes, function (name) {
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

        options = utils.extend({}, defaultOptions, options);

        // console.log('merge:', $(src).stringify(), '->', $(dst).stringify());

        if (options.attributes) {
            // Merge all the src attributes into dst
            // Ignore data-* attributes
            utils.forEach(src.attributes, function (attribute, index) {
                var name = attribute.name,
                    opFn, newValue;

                // TODO: Expose this functionality
                if (name.indexOf('data-') === 0) return;

                // If there's a conflict, try to resolve it
                if (src.hasAttribute(name)) {
                    // Find the right op to use
                    opFn = options.attributes[name] || options.attributes['*'];
                    if (typeof opFn === 'string') opFn = options.ops[opFn];
                    if (!utils.isFunction(opFn)) throw 'mergeElements: Operation not defined: ' + options.attributes[name];

                    newValue = opFn(dst.getAttribute(name), attribute.value);
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
        contentPlaceholder = dst.getElementsByTagName('content')[0];

        if (contentPlaceholder) {
            contentPlaceholder.parentNode.replaceChild(childrenFragment, contentPlaceholder);
        } else {
            dst.appendChild(childrenFragment);
        }
    };

    function createDocumentFragment () {
        var document = $('<dummy />')[0].ownerDocument;
        return document.createDocumentFragment();
    }
}());

module.exports = $;