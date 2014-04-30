module.exports = {
	templateCompiler: function (string) {
        return function () { return string; };
    }
};