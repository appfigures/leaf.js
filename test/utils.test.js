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

    describe('forEach', function () {

        function testObject(obj) {
            var iterations = 0;
            utils.forEach(obj, function (value, index) {
                expect(value).to.equal(obj[index]);
                ++iterations;
            });
            expect(iterations).to.equal(obj.length);
        }

        it('should work with Array', function () {
            testObject([1,2,3]);
        });
        it('should work with Array-like object', function () {
            testObject({'1': 1, '2': 2, '3': 3, 'length': 3});
        });
    });

    describe('getBasePath', function () {
        
    })
});