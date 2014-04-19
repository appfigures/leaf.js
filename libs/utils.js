var path = require('path'),
    _ = require('underscore'),
    findup = require('findup'),
    globals = require('./globals'),
    cache = require('./cache'),
    trimRegexp = /^[\ \t\r\n]+|[\ \t\r\n]+$/ig,
    toCamelCaseRegexp = /(\-[a-z])/g,
    toDashCaseRegexp = /([A-Z])/g,
    utils;

utils = {
    _: _,
    // My very rough version
    isArrayLike: function (obj) {
        return (obj instanceof Array) || (typeof obj !== 'string' && typeof obj.length === 'number');
    },
    trim: function (string) {
        return string.replace(trimRegexp, '');
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

module.exports = utils;