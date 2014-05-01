describe('utils', function () {
    var utils = require('../libs/utils');

    describe('toDashCase', function () {
        it('should convert camel case', function () {
            expect(utils.toDashCase('aSimpleString')).to.equal('a-simple-string');
        });
    });

    describe ('compose', function () {
        it ('should be ok for methods in the chains to return undefined', function () {
            var out = utils.compose([
                function (str) {
                    return str + '1';
                },
                function (str) {

                },
                function (str) {
                    return str;
                }
            ])('oz');

            expect(out).to.equal('oz1');
        });
    });
});