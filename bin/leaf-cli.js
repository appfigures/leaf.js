#!/usr/bin/env node

var path = require('path'),
    yargs = require('yargs'),
    leaf = require('..'),
    filePath = process.argv[2],
    out, argv;

argv = yargs
        .usage('Usage: $0 path/to/file [options]')
        .demand(1, 'Please provide a file path')
        .options('output-format', {
            alias: 'format',
            description: 'The output format to use (xml | html)',
            default: 'xml',
            type: 'string'
        })
        .argv;

filePath = path.resolve(process.cwd(), filePath);

out = leaf.parse.file(filePath, {
    outputFormat: argv.outputFormat
});

console.log(out);