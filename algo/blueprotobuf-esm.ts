// ES Module wrapper for blueprotobuf.js
import * as $protobuf from 'protobufjs/minimal.js';
import { readFileSync } from 'fs';
import path from 'path';

// Read and evaluate the UMD module manually
const blueprotobufCode = readFileSync(path.join(__dirname, 'algo/blueprotobuf.js'), 'utf-8');

// Create a context where the UMD module can execute
let pb = null;
const module = { exports: {} };

// Execute the UMD code with our module context
const factory = new Function('module', 'require', blueprotobufCode + '\nreturn module.exports;');
pb = factory(module, (name: string) => {
    if (name === 'protobufjs/minimal') return $protobuf;
    throw new Error(`Unknown module: ${name}`);
});

export default pb;
