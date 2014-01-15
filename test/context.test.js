describe('context', function () {
    var Context = require('../libs/context');

    it('should inherit properties from parent', function () {
        var context = new Context(),
            child = context.$new();

        context.parentValue = 5;
        child.parentValue.should.equal(5);
    });
    it('should inherit properties from descendents', function () {
        var root = new Context(),
            subRoot = root.$new(),
            subSubRoot = subRoot.$new(),
            child = subSubRoot.$new();

        root.x = 10;
        subRoot.y = 15;
        subSubRoot.z = 20;

        expect(child.x).to.equal(10);
        expect(child.y).to.equal(15);
        expect(child.z).to.equal(20);
    });
    it('should override parent\'s properties', function () {
        var parent = new Context(),
            child = parent.$new();

        parent.value = 5;
        
        child.value = 4;
        child.value.should.equal(4);
    });
    it('should have $parent point to the parent', function () {
        var parent = new Context(),
            child = parent.$new();

        child.$parent.should.equal(parent);
    });
});