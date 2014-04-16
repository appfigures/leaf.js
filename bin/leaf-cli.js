#!/usr/bin/env node

var path = require('path'),
    leaf = require('..'),
    filePath = process.argv[2];

if (filePath) {
    filePath = path.resolve(process.cwd(), filePath);
    console.log(leaf.parser.stringify(filePath));
} else {
    console.log('Usage: leaf path/to/file');
}