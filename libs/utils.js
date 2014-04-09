var globals = require('./globals'),
    cache = require('./cache'),
    trimRegexp = /^[\ \t\r\n]+|[\ \t\r\n]+$/ig,
    toCamelCaseRegexp = /(\-[a-z])/g,
    toDashCaseRegexp = /([A-Z])/g,
    utils;

utils = {
	// forEach: function (obj, fn) {
 //        var key;
 //        if (obj == null || !fn) return;

 //        if (utils.isArrayLike(obj)) {
 //            for (key = 0; key < obj.length; ++key) {
 //                fn(obj[key], key);
 //            }
 //        } else {
 //            for (key in obj) {
 //                if (obj.hasOwnProperty(key)) {
 //                    fn(obj[key], key);
 //                }
 //            }
 //        }
 //    },
    // map: function (obj, fn) {
    //     return Array.prototype.map.call(obj, fn);
    // },
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
    // isFunction: function (value) {
    //     var getType = {};
    //     return value && getType.toString.call(value) === '[object Function]';
    // },
    toCamelCase: function (string) {
        return string.replace(toCamelCaseRegexp, function($1){return $1.toUpperCase().replace('-','');});
    },
    // extend: function (dst) {
    //     utils.forEach(Array.prototype.slice.call(arguments, 1), function (src) {
    //         var key;
    //         if (src) for (key in src) dst[key] = src[key];
    //     });
    //     return dst;
    // },
    
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
    },

    // TODO: These aren't used by leaf, just the modules and renderer
    // getBasePath: function (path) {
    //     var index = path.lastIndexOf('/');

    //     if (index < 0) return '';

    //     // File sitting in the root
    //     if (index === 0) return '/';

    //     // If the last '/' isn't in the middle, it's a dir
    //     if (index === path.length - 1) return path;

    //     return path.substring(0, index);
    // },

    // Does nothing if the path is absolute
    // setBasePath: function (path, base) {
    //     var delimiter = '/';
    //     // It's an absolute path already
    //     if (path.charAt(0) === delimiter) return path;
    //     if (base.charAt(base.length - 1) !== delimiter) base += delimiter;

    //     return base + path;
    // }
};

module.exports = utils;