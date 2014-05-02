var globals = require('./globals');

module.exports = {
    // main method
    parse: require('./parse'),
    // global modules
    modules: globals.modules,
    templates: require('./templates'),
    utils: require('./utils'),
    Cache: require('./cache'),
    errors: require('./errors'),
    ext: require('./ext'),
    debug: function (value) {
        if (value === undefined) return globals.debug;
        globals.debug = false;
    }
};