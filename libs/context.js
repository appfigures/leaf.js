//
// Context object (aka Scope in Angular)
//

// TODO: Remove this, it's not being used

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