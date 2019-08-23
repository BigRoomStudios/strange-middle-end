'use strict';

const PeerDepsExternal = require('rollup-plugin-peer-deps-external');
const Resolve = require('rollup-plugin-node-resolve');
const Commonjs = require('rollup-plugin-commonjs');
const Babel = require('rollup-plugin-babel');
const { terser: Terser } = require('rollup-plugin-terser');
const Filesize = require('rollup-plugin-filesize');

module.exports = [
    {
        input: 'lib/index.js',
        output: {
            file: 'umd/strange-middle-end.min.js',
            format: 'umd',
            name: 'StrangeMiddleEnd',
            esModule: false,
            exports: 'named'
        },
        plugins: [
            Resolve(),
            Commonjs(),
            Babel(),
            Terser(),
            Filesize()
        ]
    },
    {
        input: {
            index: 'lib/index.js'
        },
        output: [
            {
                dir: 'esm',
                format: 'esm',
                exports: 'named'
            },
            {
                dir: 'cjs',
                format: 'cjs',
                exports: 'named'
            }
        ],
        plugins: [
            PeerDepsExternal(),
            Resolve(),
            Commonjs(),
            Babel(),
            Filesize()
        ]
    }
];
