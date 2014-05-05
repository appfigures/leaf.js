leaf (beta)
=======

A tiny XML transformation library with recursive evaluation for Node. Useful for generating email html, among other things. Loosely inspired by the Angular.js interface.

## Command line interface

	leaf input [options]

Input can either be a file path or a markup string.

## Example

Let's turn this markup (xml or html):

	<person data-title="Mr.">Potter</person>

Into this one:

	<h1 class="person-header">Hi Mr.Potter</h1>

### Code

*index.html*
	
	<person data-title="Mr.">Potter</person>

*directive.html*

	<h1 class="person-header">Hi <%= title %><content /></h1>

*Run this code*

	var leaf = require('leaf');

	function module (session) {
		session.directive('person', {
			template: 'directive.html'
		});
	}
	
	console.log(leaf.parse('index.html', module));

## Features

- Recursive template expansion
- Smart tag merging
- Define custom element logic imperatively
- Completely syncronous parsing
- Extendible through modules
- Includes basic DOM manipulation with jQuery-like API (with cheerio.js)
- Output as XML, HTML or plain text (TBD)
- Use as node module or command line utility

## Getting started

	npm instal leaf-af

Run this javascript:

	var string = require('leaf').parse('<div />', function (session) {
		session.directive('div', '<p>It worked!</p>');
	});
	console.log(string);

## How it works

Leaf reads in xml, transforms all of its nodes based on defined directives, applies optional user-defined transformations on them, then returns a stringified version of the resulting dom. It's recursive, meaning it'll keep transforming nodes until none of them match any of its directives.

## The public API

- `leaf.parse(input, options)` The main method of the library.
- `leaf.cheerio` A reference to the local cheerio library.
- `leaf.modules` All global modules
- `leaf.templates` A collection of utility methods for loading and compiling templates (uses underscore be default).
- `leaf.utils` A collection of utility methods. Leaf uses these and thought you might find them helpful too.
	- Of note, `leaf.utils._` points to leaf's copy of lodash.
- `leaf.Cache` A constructor function for the cache class. Can be used to create a custom cache and persist it across different calls to `parse()`.
- `leaf.errors` A collection of error objects that this library throws.
- `leaf.ext` External 

## Parsing xml

Parsing is a synchronous operation. It's done through the static function `leaf.parse`.

### leaf.parse(input, options)

- `input` Either an xml string, a file path, or a dom element (via cheerio).
	- Leaf uses `leaf.utils.isHtmlString` to figure out if the input is a path or markup.
	- The input xml must be valid (as defined by cheerio) and have a single root node.
- `options` Either an object or a transform function. The important params are listed below (all optional). For the full docs see [libs/parse.js](libs/parse.js)
	- `modules: Object` The underlying implementations for modules that the input may require. Has the format (`{ 'moduleName': moduleFn, ...}`).
	- `transform: Function (session) -> void` Allows you to mess with the session object (to add directives, change globals, etc.) before the rendering starts.
	- `cache: Cache` Leaf tries to cache as much as possible during a parse. Pass your own `leaf.Cache` instance if you'd like to persist the cache across multiple calls to `parse()`. It provides a great speed improvement when parsing similar input multiple times. If you're interested in what exactly gets cache, pass in your own object and call `.toString() / .size()` on it after a parse operation.
	- `outputFormat: String` Either `'xml'` or `'html'` (default: `'xml'`).

This method has two helper versions. Use these if leaf can't properly figure out what type of input you're passing it.

- `parse.file(filePath, options)`
- `parse.string(markupString, options)`

## Creating directives

For every call to `leaf.parse` a new `ParseSession` object is created. Directives are added to the this object. The `session` is passed into a module function prior to parsing. At that point directives can be added to the session. Example:

	leaf.parse('...', function (session) {
		session.directive(name, options);
	});

### session.directive(name, options | template)

#### name

A camel-cased name. When using the directive the name can be specified as either `-` cased or `_` cased. For example if you name your directive `'myDirective'` it can either be used like this:

	<my-directive>

Or

	<my_directive>

#### options

- `template: String` An html string or file path. Will be compiled by lodash.template by default. Default template compiler can be set via `leaf.ext.templateCompiler`.
- `context: Object`	The default context to evaluate the template with. Can be `{...}` or a function `(globals) => context`. The resulting object gets extended with the dom element's attributes.
- `source: String` The base path to evaluate template assets with. If `template` is a url and this value isn't defined, it serves as the source.
- `mergeOptions: Object`
Define how this directive should be merged with the dom element it replaces. These options are passed to `leaf.utils.mergeElements()`.
- `matches: Function(element) -> boolean`
An optional function to test if an element matches this directive. If false is returned, the directive is ignored by the parser for that element. Note that overriding this function prevents the default behavior from happening. To bring that back, call `return this.matchesName(element)` in your implementation.
- `prepare: Function(context, originalElement) -> object`
An optional method that can be used to modify the context based on the original element that matched this directive. At this point the element parameters have already been merged into the default context to form 'context'.
- `logic: Function(el, context) -> void`
An optional method that can be used to modify the new element after it's been created, but before its children have been parsed.

### Directive attribute passing

Let's say we make a directive called `myDirective` with a template `<div />` and then in our template write:

	<my-directive some-attr="100" data-other-attr="true" />

When our directive gets called, it's context will look like this:

	{
		attr: 100,
		otherAttr: true
	}

and the resulting output will look like this:

	<div some-attr="1"/>

Notice that:

- All original dom attributes that don't start with `data-` get merged into the resulting element.
- All the original dom attributes get parsed and merged to the directive's `context`, whether they start with `data-` or not.
	- Since all dom attributes are actually strings, leaf does its best to figure out the actual type. It can figure out `Number`, `Boolean`, and `String` values.

## Creating modules

A module defines a group of transformations and directives. To include a module, a template must provide a comment at the top 

Let's say we have a file `file.html` that we'd like to transform:

	<!-- modules: myModule -->
	<container>
		<custom-tag data-x="hi" />
		<transform-me>Hello</transform-me>
	</container>

We can see that it requires a module named `myModule`. We have two ways to
provide it.

### The quick way

	var modules = {
		'myModule': function (leaf) {
			return function (session) {
				// Mutate the session
				// by adding directives, globals, etc.
			}
		},
		'myOtherModule': ...
	}
	
	leaf.parse('file.html', { modules: modules });
	
### The resuable way

We put a `leaf-modules.js` file somewhere up the folder hierarchy of `file.html`:

	module.exports = {
		'myModule': function (leaf) { ... },
		'myOtherModule': require('./other-module.js')
	};
	
Then in our code we can just write:

	leaf.parse('file.html')
	
	
## Using globals

The `session.globals` object lets directives share values, and for modules to communicate.
	
	function module (session) {
		// The globals object is shared by everyone
		// so we namespace our variables to be good
		// citizens.
		session.globals.myModule = {
			containerWidth = 100
		};
	
		session.directive('container', {
			template: '<table width="{{width}}"/>',
			context: function (globals) {
				return {
					width: globals.myModule.containerWidth
				}
			}
		});
	}
	parse('<container />', module) // => <table width="100"/>
	parse('<container width="300">', module) // => <table width="300"/>

## Known Issues

- There are currently some design issues that should be tightened up
	- The structure of a global module (in `leaf.modules`) is `function (session) {}` while the structure of a module that gets loaded from an external file is `function (leaf) { return function (session) {}; }`.
	- When reading a leaf markup file
		- It's hard to tell which attributes are part of the directive, which are of one of the super directives, and which are for the underlying dom element.
		- It's also hard to know when to use a `data-` attribute (doesn't get propagated to super) and when not to.
	- The style is stored across css, js, and html files. It makes it hard to track down what's going on and where to make changes.
	- A module cannot require that another module be loaded. On the other hand, a module may attempt to use utils from another (eg. `session.module('someModule').util()`).
		- If modules were allowed to include other modules there could be unwanted side effects when the included module adds an unwanted transformation to the dom.
- cheerio's dom manipulation functions will throw errors when trying to manipulate the children of text/comment/etc elements. This may affect new directives being written.