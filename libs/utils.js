var globals = require('./globals'),
    cache = require('./cache'),
    trimRegexp = /^[\ \t\r\n]+|[\ \t\r\n]+$/ig,
    toCamelCaseRegexp = /(\-[a-z])/g,
    toDashCaseRegexp = /([A-Z])/g,
    utils;

utils = {
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
    }
};

module.exports = utils;