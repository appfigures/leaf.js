module.exports = {
    $get: function (key) {
        return (this[key] = this[key] || {});
    },
    $clear: function () {
        for (var key in this) {
            if (key.charAt(0) !== '$') delete this[key];
        }
    }
};