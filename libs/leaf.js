var _ = require('lodash'),
    globals = require('./libs/globals');

globals.utils = require('./libs/utils');
globals.Cache = require('./libs/cache');
globals.errors = require('./libs/errors');
globals.parse = require('./libs/parse');
globals.ext = require('./libs/ext');
globals.templates = require('./libs/templates');

// TODO: Is this needed, should it be refactored?
globals.use = function (fn) {
    fn(module.exports);
};

// globals
globals.utils.mergeElements.defaults.contentTagName = 'af-content';

//
// Export
//

module.exports = globals;