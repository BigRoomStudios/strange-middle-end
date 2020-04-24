'use strict';

const PeerDepsExternal = require('rollup-plugin-peer-deps-external');
const Resolve = require('@rollup/plugin-node-resolve');
const Commonjs = require('rollup-plugin-cjs-es');
const Babel = require('rollup-plugin-babel');
const { terser: Terser } = require('rollup-plugin-terser');
const Filesize = require('rollup-plugin-filesize');

module.exports = [
    {
        input: 'lib/index.js',
        output: [
            {
                file: 'dist/strange-middle-end.js',
                format: 'cjs',
                exports: 'named',
                sourcemap: true
            },
            {
                file: 'dist/strange-middle-end.module.js',
                format: 'esm',
                exports: 'named',
                sourcemap: true
            }
        ],
        plugins: [
            PeerDepsExternal(),
            Resolve(),
            Commonjs(),
            Babel({ exclude: ['node_modules/**'] }),
            Filesize()
        ]
    },
    {
        input: 'lib/index.js',
        output: {
            file: 'dist/strange-middle-end.umd.min.js',
            format: 'umd',
            name: 'StrangeMiddleEnd',
            esModule: false,
            exports: 'named',
            sourcemap: true,
            globals: {
                immer: 'immer',
                normalizr: 'normalizr',
                redux: 'Redux',
                'redux-thunk': 'ReduxThunk'
            }
        },
        plugins: [
            PeerDepsExternal(),
            Resolve(),
            Commonjs(),
            Babel({ exclude: ['node_modules/**'] }),
            Terser(),
            Filesize()
        ]
    }
];
