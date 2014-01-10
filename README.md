leaf
====

A tiny XML transformation library with recursive evaluation for Node and the browser. Useful for generating email html and text, among other things. Loosely inspired by the Angular.js interface.

### Example

Turn this xml:

	<person data-title="Mr.">Potter</person>
	
Into this one:

	<h1 class="person-header">Hi Mr.Potter</h1>

Using this js:

	parser.directive('person', {
		template: '<h1 class="person-header">Hi {{title}}<content /></h1>
	});
	
## Features

- Recursive template expansion
- Smart tag merging
- Output your semantic XML to HTML or plain text
- Easily define custom element logic
- Asyncronous parsing using promises for including async logic
- Extendible through modules
- Includes basic DOM manipulation with jQuery-like API

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
		name: The name of the element (camel-cased)
		template: A templated string (Handlebars by default) or path to load
		context: The default context to evaluate the template with. Hash or a function (parser) => context
		source: The base url to evaluate template assets with. If the template is a url this value is calculated from it
		mergeOptions: Define how this directive should be merged with the dom element it replaces,
		matches(element): An optional method to test if an element matches this directive
		prepare(context, originalElement): An optional method that can be used to modify the context based on the original element that matched this directive.
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
