var error = require('tea-error');

module.exports = {};

['DOMParserError'].forEach(function (name) {
    module.exports[name] = error(name);
});