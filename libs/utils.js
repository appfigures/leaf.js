var utils = {
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
    }
};

module.exports = utils;