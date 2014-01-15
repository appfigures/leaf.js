//
// Context object (aka Scope in Angular)
//

function Context () { }
Context.prototype = {
    $parent: null,
    $new: function () {
        var child = Object.create(this);
        child.$parent = this;
        return child;
    }
};

module.exports = Context;