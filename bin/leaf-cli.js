#!/usr/bin/env node

var path = require('path'),
    leaf = require('..'),
    filePath = process.argv[2];

if (filePath) {
    filePath = path.resolve(process.cwd(), filePath);
    // TODO: Read options
    console.log(leaf.parse(filePath, {
        inputType: 'filePath'
    }));
} else {
    console.log('Usage: leaf path/to/file [options]');
}