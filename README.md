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

The 

### The public API

- `leaf.parse` The main method of the library. Has the signature
	- `parse(input, options)` where input is either an html string or file path. Also has other helpers:
		- `parse.file(filePath, options)`
		- `parse.string(markupString, options)`
- `leaf.cheerio` A reference to the local cheerio library.
- `leaf.modules` All global modules
- `leaf.templates` A collection of utility methods for loading and compiling templates (uses underscore be default).
- `leaf.utils` A collection of utility methods. Leaf uses these and thought you might find them helpful too.
	- Of note, `leaf.utils._` points to leaf's copy of lodash.
- `leaf.Cache` A constructor function for the cache class. Can be used to create a custom cache and persist it across different calls to `parse()`.
- `leaf.errors` A collection of error objects that this library throws.
- `leaf.ext` External 

## Creating directives

	parser.directive({
		name: String
			The name of the elements that should be replaced by this directive (camel-cased).
		template: String
			An html string or filePath. Will be compiled by lodash.template by default.
		context: Object
			The default context to evaluate the template with. Hash or a function (parser) => context. This hash gets extended with the paramaters passed into the directive via its matching element's tag attributes.
		source: String
			The base patch to evaluate template assets with. If 'template' is a url this value is calculated from it, but can still be overriden by 'source'.
		mergeOptions: Object
			Define how this directive should be merged with the dom element it replaces.
		matches: (element) -> boolean
			An optional function to test if an element matches this directive. If false is returned, the directive is ignored by the parser for that element.
		prepare: (context, originalElement) -> object
			An optional method that can be used to modify the context based on the original element that matched this directive. At this point the element parameters have already been merged into the default context to form 'context'.
		logic: (el, context) -> null
			An optional method that can be used to modify the new element after it's been created, but before its children have been parsed.
	});

## Creating modules

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

cheerio's dom manipulation functions will throw errors when trying to manipulate the children of text/comment/etc elements. This may affect new directives being written.

## TODO

- Use nunjucks instead of underscore templates?