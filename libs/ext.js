module.exports = {
	DOMParser: null,
	XMLSerializer: null,
	templateCompiler: function (string) {
        return function () { return string; };
    },
};