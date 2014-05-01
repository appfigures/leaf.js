var error = require('tea-error');

module.exports = {};

['DOMParserError', 'LeafParseError'].forEach(function (name) {
    module.exports[name] = error(name);
});