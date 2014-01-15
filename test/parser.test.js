describe('parser', function () {
    var leaf = require('../leaf');
    it('should propagate attributes to inner directives', function () {
        var parser = new leaf.Parser(),
            element;

        parser.directive('baseElement', {
            template: '<node baseprop="<%= value %>" />',
            context: {
                value: 'default'
            }
        });

        parser.directive('subElement', {
            template: '<base-element />'
        });

        element = parser.parse('<sub-element data-value="5" />');

        expect(element[0].getAttribute('baseprop')).to.equal('5');
    });
});