'use strict';

const PeerDepsExternal = require('rollup-plugin-peer-deps-external');
const { nodeResolve: NodeResolve } = require('@rollup/plugin-node-resolve');
const Commonjs = require('rollup-plugin-cjs-es');
const { babel: Babel } = require('@rollup/plugin-babel');
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
        external: [/@babel\/runtime/],
        plugins: [
            PeerDepsExternal(),
            NodeResolve(),
            Commonjs(),
            Babel({
                exclude: ['node_modules/**'],
                babelHelpers: 'runtime',
                plugins: ['@babel/plugin-transform-runtime']
            }),
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
                'redux-thunk': 'ReduxThunk',
                react: 'React'
            }
        },
        // core-js polyfills are imported for node/esm compatibility, so core-js@3.11.x is
        // technically a peer for consuming the UMD output those environments e.g. node, but bundled
        // for running in-browser
        external: [/^core\-js/],
        plugins: [
            PeerDepsExternal(),
            NodeResolve(),
            Commonjs(),
            Babel({
                exclude: ['node_modules/**'],
                // babelHelpers and useBuiltIns together result in our used polyfills e.g.
                // regenerator-runtime bundled in the output UMD, so it's directly usable
                // in-browser (no need to pull in anything from core-js via preceeding
                // script tags)
                babelHelpers: 'bundled',
                presets: [['@babel/env', { useBuiltIns: 'usage', corejs: '3.11' }]]
            }),
            Terser(),
            Filesize()
        ]
    }
];
