var globals = require('./globals');

module.exports = {
    // main method
    parse: require('./parse'),
    cheerio: require('./cheerio-leaf'),
    // global modules
    modules: globals.modules,
    templates: require('./templates'),
    utils: require('./utils'),
    Cache: require('./cache'),
    errors: require('./errors'),
    ext: require('./ext'),
    inDebugMode: function () {
        return globals.debug;
    },
    setDebugMode: function (value) {
        globals.debug = value;
    }
};