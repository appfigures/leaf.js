var _ = require('lodash'),
    path = require('path'),
    parse = require('../libs/parse'),
    Cache = require('../libs/cache'),
    $ = require('../libs/cheerio-leaf'),
    errors = require('../libs/errors'),
    globals = require('../libs/globals');

// @params input [,options] [, transformation]
// 
// Returns the parsed element before
// string transformations are applied
function toElement(input, options, transformName) {
    var element;

    if (typeof options === 'string') {
        transformName = options;
        options = null;
    }

    options = options || {};
    transformName = transformName || 'pre';

    options.transform = _.wrap(options.transform, function (origFn, session) {
        if (origFn) origFn.apply(this, arguments);

        session.transforms.post.push(function (el) {
            element = el;
            return el;
        });
    });

    parse(input, options);

    return element;
}

function resolve(filePath) {
    return path.resolve(__dirname, filePath);
}

describe ('parse', function () {
    var fixtures = {
        div: resolve('fixtures/div.html'),
        simpleProject: resolve('fixtures/simple-project/index.html')
    };

    describe ('options', function () {
        describe ('.inputType', function () {
            it ('should parse a string', function () {
                expect(parse('<div/>', {
                    inputType: 'markup'
                })).to.equal('<div/>');
            });
            it ('should parse a file', function () {
                expect(parse(fixtures.div, {
                    inputType: 'filePath'
                })).to.equal('<div/>');
            });
        });
        describe ('.source', function () {
            it ('should use the file path as the default source', function () {
                var filePath = fixtures.div,
                    el = toElement(filePath, { inputType: 'filePath' }, 'pre');

                expect(el.source()).to.equal(filePath);
            });
            it ('should prefer options.source over filePath', function () {
                var source = 'thisIsTheSource',
                    el = toElement(fixtures.div, {
                        source: source,
                        inputType: 'filePath'
                    }, 'pre');

                expect(el.source()).to.equal(source);
            });
        });
        describe ('.modules', function () {
            it ('should load explicitly defined modules', function () {
                var outerSpy = sinon.spy(function (leaf) {
                    return innerSpy;
                });
                var innerSpy = sinon.spy();

                parse('<!-- modules: testModule --><div />', {
                    modules: {
                        testModule: outerSpy
                    }
                });

                expect(outerSpy).to.have.been.calledOnce.and.calledWithExactly(sinon.match.object);
                expect(innerSpy).to.have.been.calledOnce.and.calledWithExactly(sinon.match.object);
                expect(outerSpy).to.have.been.calledBefore(innerSpy);
            });

            it ('should remove modules comment from the output', function () {
                expect(parse('<!-- modules: myModule --><div />', {
                    modules: {
                        'myModule': function () {
                            return function () {};
                        }
                    }
                })).to.equal('<div/>');
            });

            it ('should complain when a module is not a function', function () {
                expect(function () {
                    parse('<!-- modules: myModule --><div />', {
                        modules: {
                            'myModule': 'invalidParam'
                        }
                    });
                }).to.throw(errors.LeafParseError, /myModule.*not a function/i);
            });
        });

        describe ('.loadModulesConfig', function () {
            it ('should load modules from the nearest leaf-modules.js file', function () {
                expect(function () {
                    parse.file(fixtures.simpleProject); // fixtures/custom-module
                }).not.to.throw(errors.LeafParseError, /module.*not.*customModule/i);
            });
        });

        describe ('.transform', function () {
            it ('should allow for mutating the session', function () {
                var callback = sinon.spy();
                parse('<div />', callback);

                expect(callback).to.have.been
                    .calledOnce
                    .and.calledWithExactly(sinon.match.object);
            });
            it ('should run after all modules are loaded', function () {
                var module = sinon.spy(),
                    callback = sinon.spy();

                parse('<!-- modules: testModule --><div />', {
                    modules: {
                        testModule: function (leaf) {
                            return module;
                        }
                    },
                    transform: callback
                });

                expect(callback).to.have.been.calledAfter(module);
            });
        });

        describe ('.cache', function () {
            it ('should use the passed in cache', function () {
                var cache = new Cache();

                expect(cache.size()).to.equal(0);

                parse.file(fixtures.simpleProject, {
                    cache: cache
                });

                expect(cache.size()).to.be.above(0);
            });
        });

        describe ('.cheerioOptions', function () {
            it ('should pass cheerio options along', function () {
                expect(parse('<root><span />test</root>', {
                    cheerioOptions: {
                        xmlMode: false
                    }
                })).to.equal('<root><span>test</span></root>');

                
                expect(parse('<root><span />test</root>', {
                    cheerioOptions: {
                        xmlMode: true
                    }
                })).to.equal('<root><span/>test</root>');
            });
        });

        describe ('.outputFormat', function () {
            var input = '<div />';

            it ('should output xml', function () {
                var string = parse(input, {
                    outputFormat: 'xml'
                });

                expect(string).to.equal('<div/>');
            });

            it ('should output html', function () {
                var string = parse(input, {
                    outputFormat: 'html'
                });

                expect(string).to.equal('<div></div>');
            });
        });
    });

    describe ('parsing', function () {
        it ('should work in a simple case', function () {
            var string = '<div>Test</div>';
            expect(parse(string)).to.equal(string);
        });

        it ('should work with a simple string', function () {
            expect(parse.string('a')).to.equal('a');
        });

        it ('should accept a DOM element as input', function () {
            var el = $('<span />');
            expect(parse(el)).to.equal('<span/>');
        });

        it ('should parse required modules from first comment', function () {
            var str = '<!-- modules: myModule --><div />',
                spy = sinon.spy();

            function myModule (leaf) {
                return spy;
            }

            parse(str, {
                modules: {
                    myModule: myModule
                }
            });

            expect(spy).to.have.been.calledOnce;
        });

        describe ('global modules', function () {
            beforeEach(function () {
                globals.modules.custom = function (session) {
                    session.directive('element', false);
                };
            });
            afterEach(function () {
                delete globals.modules.custom;
            });

            it ('should read from global modules', function () {
                expect(parse('<!-- modules: custom --><element />')).to.equal('');
            });
        });

        describe ('transforms', function () {
            ['pre', 'post', 'string'].forEach(function (name) {
                it ('should run ' + name + ' transforms in the correct order', function () {
                    var tA = sinon.spy(_.identity),
                        tB = sinon.spy(_.identity),
                        tC = sinon.spy(_.identity);

                    parse('<div />', function (session) {
                        session.transforms[name].push(tA, tB, tC);
                    });

                    expect(tA).to.be.calledOnce;
                    expect(tB).to.be.calledOnce;
                    expect(tC).to.be.calledOnce;

                    expect(tA).to.be.calledBefore(tB);
                    expect(tB).to.be.calledBefore(tC);
                });
            });

            it ('should allow for injecting pre transformations', function () {
                parse('<div />', function (session) {
                    session.directive('div', {
                        template: '<span />',
                        logic: function (el) {
                            expect(el.hasAttr('name')).to.be.true;
                        }
                    });

                    session.transforms.pre.push(function (element) {
                        element.attr('name', 'oz');
                    });
                });
            });

            it ('should allow for injecting post transformations', function () {
                var string = parse('<div />', function (session) {
                    session.directive('div', {
                        template: '<span />',
                        logic: function (el) {
                            expect(el.hasAttr('name')).to.be.false;
                        }
                    });

                    session.transforms.post.push(function (element) {
                        element.attr('name', 'oz');
                    });
                });

                expect(string).to.equal('<span name="oz"/>');
            });

            it ('should allow for injecting string transformations', function () {
                var out = parse('<div />', function (session) {
                    session.transforms.string.push(function (string) {
                        string = string.replace(/</g, '{');
                        string = string.replace(/>/g, '}');
                        return string;
                    });
                });

                expect(out).to.equal('{div/}');
            });
        });

        describe ('errors', function () {
            it ('should complain when a module is not found', function () {
                expect(function () {
                    parse('<!-- modules: moduleX --><div />');
                }).to.throw(errors.LeafParseError, /not found.*moduleX/i);
            });

            it ('should complain when a module factory isn\'t structured properly', function () {
                expect(function () {
                    parse('<!-- modules: moduleX --><div />', {
                        modules: {
                            moduleX: function () { }
                        }
                    });
                }).to.throw(errors.LeafParseError, /moduleX.*invalid type/i);
            });

            it ('should complain when there is more than one root element', function () {
                expect(function () {
                    parse('<div /><div />');
                }).to.throw(errors.LeafParseError, /single root/i);
            });

            it ('should complain about incorrect markup', function () {
                expect(function () {
                    parse('<a');
                }).to.throw(errors.DOMParserError);
            });
        });
    });
});