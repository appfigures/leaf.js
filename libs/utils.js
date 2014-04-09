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
    // TODO: Accept a cache
    loadFile: function (path) {
        var fileCache = cache.$get('file');
        if (fileCache[path]) {
            return fileCache[path];
        }

        if (globals.debug) {
            console.log('loading file', path);
        }

        var content = require('fs').readFileSync(path);

        if (!content) throw 'File ' + path + ' not found';

        content = content.toString();
        fileCache[path] = content;
        return content;
    }
};

module.exports = utils;