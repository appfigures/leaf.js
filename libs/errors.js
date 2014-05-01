var error = require('tea-error');

module.exports = {};

['DOMParserError', 'LeafParseError', 'LeafDirectiveError'].forEach(function (name) {
    module.exports[name] = error(name);
});