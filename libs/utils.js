var Q = require('q'),
utils = {
	forEach: function (obj, fn) {
        var key;
        if (obj == null || !fn) return;

        if (utils.isArrayLike(obj)) {
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
    },
    map: function (obj, fn) {
        return Array.prototype.map.call(obj, fn);
    },
    // My very rough version
    isArrayLike: function (obj) {
        return (obj instanceof Array) || (typeof obj !== 'string' && typeof obj.length === 'number');
    },
    trim: function (string) {
        return string.trim();
    },
    toDashCase: function (string, separator) {
        separator = separator || '-';
        return string.replace(/([A-Z])/g, function($1){return separator + $1.toLowerCase();});
    },
    isNumber: function (str) {
        return !isNaN(parseFloat(str)) && isFinite(str);
    },
    isFunction: function (value) {
        var getType = {};
        return value && getType.toString.call(value) === '[object Function]';
    },
    toCamelCase: function (string, separator) {
        separator = separator || '-';
        return string.replace(/(\-[a-z])/g, function($1){return $1.toUpperCase().replace(separator,'');});
    },
    extend: function (dst) {
        utils.forEach(Array.prototype.slice.call(arguments, 1), function (src) {
            var key;
            if (src) for (key in src) dst[key] = src[key];
        });
        return dst;
    },

    // Paths
    getBasePath: function (path) {
		var index = path.lastIndexOf('/');

		if (index < 0) return '';

		// If the last '/' isn't in the middle, it's a dir
		if (index === 0 || index === path.length - 1) return path;

		return path.substring(0, index);
	},
	// Does nothing if the path is absolute
	setBasePath: function (path, base) {
		var delimiter = '/';
		// It's an absolute path already
		if (path.charAt(0) === delimiter) return path;
		if (base.charAt(base.length - 1) !== delimiter) base += delimiter;

		return base + path;
	},
    loadFile: (function () {
        var cache = {};
        return function (path) {
            if (cache[path]) {
                return Q(cache[path]);
            }

            var deferred = Q.defer();
            require('fs').readFile(path, deferred.makeNodeResolver());
            return deferred.promise.then(function (data) {
                data = data.toString();
                cache[path] = data;
                return data;
            });
        };
    }())
};

module.exports = utils;