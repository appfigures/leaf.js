describe('parser', function () {
    var leaf = require('../leaf');
    it('should work in a simple case', function () {
        var string = '<div>Test</div>';

        expect(leaf.parser.stringify({
            xmlString: string
        })).to.equal(string);
    });
    it('should propagate attributes to inner directives', function () {

        function module(session) {
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

        var element = leaf.parser.parse({
            xmlString: '<sub-element data-value="5" />',
            modules: [module]
        });

        expect(element[0].getAttribute('baseprop')).to.equal('5');
    });
    it('should throw error about incorrect html node type', function () {
        expect(function () {
            leaf.parser.parse({
                xmlString: '<a'
            });
        })
        .to.throw(leaf.errors.DOMParserError)
        .and.to.throw('nodeType 1');
    });
});