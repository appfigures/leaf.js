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

    it ('should let multiple directives apply on the same element', function () {
        var string = parse('<div />', function (session) {
            session.directive('div', function (el) {
                el.attr('attr1', '');
            });
            session.directive('div', function (el) {
                el.attr('attr2', '');
            });
        });

        expect(string).to.equal('<div attr1="" attr2=""/>');
    });

    it ('should quick exist when a directive removes its element', function () {
        var spy = sinon.spy();
        var string = parse('<div />', function (session) {
            session.directive('div', false);
            session.directive('div', spy);
        });

        expect(spy).to.not.have.been.called;
    });

    it ('should propagate attributes to inner directives', function () {
        var string;

        function module (session) {
            session.directive('baseElement', {
                template: '<node baseprop="<%= value %>" />',
                context: {
                    value: 'default'
                }
            });

            session.directive('subElement', {
                template: '<base-element />'
            });
        }

        string = parse('<sub-element data-value="5" />', module);

        expect(string).to.contain('baseprop="5"');
    });

    describe ('self removing directive', function () {
        function transform (session) {
            session.directive('tag', function (el) {
                return false;
            });
        }

        it ('should allow outer element to remove itself', function () {
            var string = parse('<tag />', transform);
            expect(string).to.equal('');
        });
        it ('should allow inner element to remove itself', function () {
            var string = parse('<div><tag /></div>', transform);
            expect(string).to.equal('<div/>');
        });
    });
});