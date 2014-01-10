leaf (alpha)
=======

A tiny XML transformation library with recursive evaluation for Node and the browser. Useful for generating email html and text, among other things. Loosely inspired by the Angular.js interface.

### Example

Turn this xml:

	<person data-title="Mr.">Potter</person>
	
Into this one:

	<h1 class="person-header">Hi Mr.Potter</h1>

Using this js:

	var parser = new leaf.Parser();
	parser.directive('person', {
		template: '<h1 class="person-header">Hi {{title}}<content /></h1>
	});
	console.log(parser.parse('input.html'));
	
## Features

- Recursive template expansion
- Smart tag merging
- Define custom element logic imperatively
- Asyncronous parsing using promises for including async logic
- Extendible through modules
- Includes basic DOM manipulation with jQuery-like API
- Output your semantic XML to HTML or plain text (TBD)
- Runs in Node and the browser (TBD)

## Getting started

	npm instal leaf-af
	
Run this javascript:

	var parser = new leaf.Parser();
	parser.directive('div', '<p />');
	
	parser.parse('<div />').then(function (el) {
		console.log(el.stringify());
	});
	
## Creating directives

	parser.directive({
		name: The name of the elements that should be replaced by this directive (camel-cased).
		template: An html string or path to load or a promise. Will be compiled by Handlebars by default.
		context: The default context to evaluate the template with. Hash or a function (parser) => context. This hash gets extended with the paramaters passed into the directive via its matching element's tag attributes.
		source: The base url to evaluate template assets with. If 'template' is a url this value is calculated from it, but can still be overriden by 'source'.
		mergeOptions: Define how this directive should be merged with the dom element it replaces.
		matches(element): An optional function to test if an element matches this directive. If false is returned, the directive is ignored by the parser for that element.
		prepare(context, originalElement): An optional method that can be used to modify the context based on the original element that matched this directive. At this point the element parameters have already been merged into the default context to form 'context'.
		logic(el, context, parser): An optional method that can be used to modify the new element after it's been created, but before its children have been parsed.
	});
	
## Creating modules

	leaf.modules.myModule = function (parser) {
		parser.globals.myModule = {
			my: "globalVars"
		};
		parser.directive(...)
	};
	
	// Then elsewhere
	
	var parser = new leaf.Parser(['myModule']);
	
	
## Using globals

	parser.globals.containerWidth = 100;
	
	parser.directive('container', {
		template: '<table width="{{width}}"/>',
		context: function (parser) {
			return {
				width: parser.globals.width
			}
		}
	});

	// <container /> --> <table width="100"/>
	// <container width="300"> --> <table width="300"/>
