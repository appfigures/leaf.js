var _ = require('lodash'),
    cheerio = require('cheerio'),
    utils = require('./utils'),
    transformAttributeRegexp = /^(data|x)\-/i;

// Private utility for creating cheerio options
// with this one's options. Used in other plugins
exports._$ = function (selector, context, root, options) {
    return cheerio(selector, context, root, options || this.options);
};

function isCommentNode(node) {
    return node.type === 'comment';
}
function isEmptyTextNode(node) {
    return node.type === 'text' && !(node.data + '').trim();
}

// Custom
_.extend(exports, {
    isElement: function () {
        var type = this[0].type;
        return type === 'tag' || type === 'style';
    },
    isRoot: function () {
        return this.length === 1 && this[0].type === 'root';
    },
    commentValue: function () {
        if (this[0].type === 'comment') {
            return this[0].data;
        }
        return '';
    },
    tagName: function () {
        return this[0].name;
    },
    nodeType: function () {
        return this[0].type;
    },
    hasAttr: function (name) {
        return this[0].attribs[name] !== undefined;
    },
    source: (function () {
        function setSource(el, source) {
            el.leafSource = source;
            _.forEach(el.children, function (child) {
                setSource(child, source);
            });
        }

        return function (source) {
            if (this.length <= 0) return;
            if (source === undefined) return this[0].leafSource;
            return this.each(function (i, el) {
                setSource(el, source);
            });
        };
    }()),
    // A more sane looping method
    // which passes (value, key) instad of the
    // other way around
    forEach: function (fn) {
        _.forEach(this, fn);
        return this;
    },
    isComment: function () {
        return this.length > 0 && isCommentNode(this[0]);
    },
    isEmptyText: function () {
        return this.length > 0 && isEmptyTextNode(this[0]);
    },
    filterEmptyTextAndComments: function () {
        return this.filter(function (i, el) {
            if (isCommentNode(el) ||
                isEmptyTextNode(el))
            {
                return false;
            }
            
            return true;
        });
    },
    stringify: function (format) {
        if (format !== 'html') format = 'xml';
        return cheerio[format](this);
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

        _.forEach(this[0].attribs, function (value, name) {
            name = transformAttributeName(name);
            value = evalExp(value);

            attributes[name] = value;
        });
        return attributes;
    }
});

// jQuery polyfills

_.extend(exports, {
    // It's easy to implement wrap() using clone
    wrapAll: function (wrapper) {
        if (this.length > 0) {
            wrapper = this._$(wrapper);

            // Find the deepest node
            var deepest = wrapper[0];
            while(deepest.children.length > 0) deepest = deepest.children[0];

            this.replaceWith(wrapper);
            this._$(deepest).append(this);
        }

        return this;
    },
    wrapInner: function (wrapper) {
        this.contents().wrapAll(wrapper);
    }
});

// Our old jQuery implementations
// here for reference

////////////

//     map: function (fn) {
//         return $(_.map(this, fn));
//     },
//     contents: function (ignoreEmptyTextNodes, ignoreComments) {
//         var children = $();

//         _.forEach(this[0].childNodes, function (child) {
//             if (ignoreEmptyTextNodes) {
//                if (child.nodeType === 3 && !utils.trim(child.nodeValue)) return;
//             }
//             if (ignoreComments) {
//                 if (child.nodeType === 8) return;
//             }
//             children.push(child);
//         });

//         return children;
//     },
//     text: function () {
//         // Super bare implementation
//         return this[0].textContent;
//     },
//     parent: function () {
//         return this.map(function (el) {
//             return el.parentNode;
//         });
//     },
//     before: function (item) {
//         return this.each(function (el) {
//             if (el.parentNode) {
//                 $(item).each(function (itemEl) {
//                     el.parentNode.insertBefore(itemEl, el);
//                 });
//             }
//         });
//     },
//     after: function (item) {
//         return this.each(function (el) {
//             if (el.parentNode) {
//                 $(item).each(function (itemEl) {
//                     el.parentNode.insertBefore(itemEl, el.nextSibling);
//                 });
//             }
//         });
//     },
//     append: function (item) {
//         return this.each(function (el) {
//             if (el.nodeType !== 1) return;
//             $(item).each(function (itemEl) {
//                 el.appendChild(itemEl);
//             });
//         });
//     },
//     prepend: function (item) {
//         return this.each(function (el) {
//             if (el.nodeType !== 1) return;
//             $(item).each(function (itemEl) {
//                 el.insertBefore(itemEl, el.childNodes[0]);
//             });
//         });
//     },
//     remove: function () {
//         return this.each(function (el) {
//             if (el.parentNode) {
//                 el.parentNode.removeChild(el);

//                 // Due to a bug in XMLDom, parentNode
//                 // doesn't get cleared when removing
//                 // (https://github.com/jindw/xmldom/issues/86)
//                 el.parentNode = undefined;
//             }
//         });
//     },
//     children: function () {
//         var children = $();

//         _.forEach(this[0].childNodes, function (child) {
//             if (child.nodeType !== 1) return;
//             children.push(child);
//         });

//         return children;
//     },
//     replaceWith: function (newEl) {
//         return this.each(function (el) {
//             if (el.parentNode) {
//                 el.parentNode.replaceChild($(newEl)[0], el);
//             }
//         });
//     },
//     clone: function () {
//         return this.map(function (el) {
//             return el.cloneNode(true);
//         });
//     },

//     addClass: function (className) {
//         return this.addToAttribute('class', className);
//     },
//     first: function () {
//         return $(this[0]);
//     },
//     last: function () {
//         return $(this[this.length - 1]);
//     },

//     removeAttributes: function () {
//         return this.each(function (element) {
//             var attributes = [];
//             _.forEach(element.attributes, function (attribute) {
//                 attributes.push(attribute.name);
//             });
//             _.forEach(attributes, function (name) {
//                 element.removeAttribute(name);
//             });
//         });
//     },
//     addToAttribute: function (attrName, attrValue) {
//         return this.each(function (element) {
//             element.setAttribute(attrName, combineAttributes(element.getAttribute(attrName), attrValue));
//         });
//     }