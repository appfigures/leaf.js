leaf
====

A tiny XML transformation library with recursive evaluation for Node and the browser. Useful for generating email html and text, among other things. Loosely inspired by the Angular.js interface.

### Example

Turn this xml:

	<person>Oz</person>
	
Into this one:

	<h1 class="person-header">Hi Oz!</h1>

Using this js:

	parser.directive('person', {
		template: '<h1 class="person-header">Hi <content /></h1>
	});
	
## Features

- Recursive template expansion
- Smart tag merging
- Output your semantic XML to HTML or plain text
- Easily define custom element logic
- Asyncronous parsing using promises for including async logic
- Extendible through modules
- Includes basic DOM manipulation with jQuery-like API
