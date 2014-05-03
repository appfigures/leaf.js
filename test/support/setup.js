var chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai');

chai.use(sinonChai);

// Output to the global namespace
global.expect = chai.expect;
global.sinon = sinon;