var parse = require('../libs/parse'),
    errors = require('../libs/errors');

describe ('directive', function () {
    describe ('template', function () {
        it ('cannot have more than one root element', function () {
            var html = '<div>hello</div><div>there</div>';

            expect(function () {
                parse('<tag />', function (session) {
                    session.directive('tag', html);
                });
            }).to.throw(errors.LeafDirectiveError, /root element/i);
        });

        it ('must be a valid element', function () {
            var html = '<!-- this is a comment -->';

            expect(function () {
                parse('<tag />', function (session) {
                    session.directive('tag', html);
                });
            }).to.throw(errors.LeafDirectiveError, 'must be an element');
        });
    });
});