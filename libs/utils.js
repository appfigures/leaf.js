var path = require('path'),
    _ = require('lodash'),
    findup = require('findup'),
    globals = require('./globals'),
    cache = require('./cache'),
    toCamelCaseRegexp = /(\-[a-z])/g,
    toDashCaseRegexp = /([A-Z])/g,
    utils;

exports = module.exports = {
    _: _,
    // My very rough version
    isArrayLike: function (obj) {
        return (obj instanceof Array) || (typeof obj !== 'string' && typeof obj.length === 'number');
    },
    toDashCase: function (string, separator) {
        separator = separator || '-';
        return string.replace(toDashCaseRegexp, function($1){return separator + $1.toLowerCase();});
    },
    isNumeric: function (str) {
        return !isNaN(parseFloat(str)) && isFinite(str);
    },
    toCamelCase: function (string) {
        return string.replace(toCamelCaseRegexp, function($1){return $1.toUpperCase().replace('-','');});
    },
    // Undercore's compose can't accept
    // arrays and it processes the list
    // in reverse order
    compose: function (fnList) {
        return function () {
            var len = fnList.length, i,
                args = arguments,
                out;
            for (i = 0; i < len; ++i) {
                out = fnList[i].apply(this, args);
                if (out === undefined) out = args[0];
                args = [out];
            }
            return args[0];
        };
    },
    loadFile: function (path, cache) {
        var fileCache = cache.ns('leaf-files'),
            content;

        if (fileCache.get(path)) {
            return fileCache.get(path);
        }

        if (globals.debug) {
            console.log('loading file', path);
        }

        content = require('fs').readFileSync(path);

        if (!content) throw 'File ' + path + ' not found';

        content = content.toString();
        fileCache.put(path, content);
        return content;
    },
    // Look for a file in the given search path and all of it's
    // ancestors, then require it if it exists and return the
    // result
    requireUp: function (fileName, searchPath, cache, cacheKey) {
        var newPath, options;

        if (cache) {
            cache = cache.ns('extoptions:' + (cacheKey ? cacheKey + ':' : '') + fileName);
            options = cache.get(searchPath);
        }

        if (options == null) {
            options = getIt();
            if (cache) {
                cache.put(searchPath, options);
            }
        }

        return options;

        function getIt() {
            try {
                newPath = findup.sync(path.dirname(searchPath), fileName);
            } catch(e) {
                return {};
            }

            return require(path.resolve(newPath, fileName));
        }
    }
};

// DOM utils

(function () {
    var combineAttributesRegexp = /\S+/gi;

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

    // Merge all the src attributes into dst
    // Ignore data-* attributes
    // @param dst - DOMElement
    // @param src - DOMElement | {attrName: value, ...}
    function mergeAttributes (dst, src, options) {
        options = _.extend({}, mergeAttributes.defaults, options);

        function loop(value, name) {
            var opFn, newValue;

            // TODO: Expose this functionality
            if (name.indexOf('data-') === 0) return;

            // If there's a conflict, try to resolve it
            if (src.attribs ? name in src.attribs : name in src) {
                // Find the right op to use
                opFn = options.attributes[name] || options.attributes['*'];
                if (typeof opFn === 'string') opFn = options.ops[opFn];
                if (!_.isFunction(opFn)) throw 'mergeElements: Operation not defined: ' + options.attributes[name];

                newValue = opFn(dst.attribs[name], value);
            } else {
                // Otherwise just copy the attribute over
                newValue = value;
            }

            dst.attribs[name] = newValue;
        }

        if (src.type) {
            _.forEach(src.attribs, function (value, name) {
                return loop(value, name);
            });
        } else {
            _.forEach(src, loop);
        }
    }

    mergeAttributes.defaults = {
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

    // TODO: Does it make sense to pass in $? It's not used for
    // parsing anything
    function mergeElements (dst, src, $, options) {
        var contentPlaceholder,
            childrenFragment,
            cNode, nextNode;

        options = _.extend({}, mergeElements.defaults, options);

        // console.log('merge:', $(src).stringify(), '->', $(dst).stringify());
        if (options.attributes) {
            mergeAttributes(dst, src, options.attrs);
        }

        // Replace the contentPlaceholder with the children
        childrenFragment = $(src.children);

        contentPlaceholder = $(dst).find(options.contentTagName);

        if (contentPlaceholder.length > 0) {
            contentPlaceholder.replaceWith(childrenFragment);
        } else {
            $(dst).append(childrenFragment);
        }
    }

    mergeElements.defaults = {
        contentTagName: 'content',
        attributes: {}
    };

    exports.mergeAttributes = mergeAttributes;
    exports.mergeElements = mergeElements;
}());