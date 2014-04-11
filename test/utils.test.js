describe('utils', function () {
    var utils = require('../libs/utils');

    console.log(utils);

    describe('trim', function () {
        it('should trim left', function () {
            expect(utils.trim(' abc')).to.equal('abc');
        });
        it('should trim right', function () {
            expect(utils.trim('abc   ')).to.equal('abc');
        });
        it('should trim all white space characters', function () {
            expect(utils.trim(' \t  \n  \r  abc  ')).to.equal('abc');
        });
    });

    describe('toDashCase', function () {
        it('should convert camel case', function () {
            expect(utils.toDashCase('aSimpleString')).to.equal('a-simple-string');
        });
    });
});