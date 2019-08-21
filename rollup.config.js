'use strict';

const PeerDepsExternal = require('rollup-plugin-peer-deps-external');
const Resolve = require('rollup-plugin-node-resolve');
const Commonjs = require('rollup-plugin-commonjs');
const Babel = require('rollup-plugin-babel');
const { terser: Terser } = require('rollup-plugin-terser');
const Filesize = require('rollup-plugin-filesize');

const isProduction = process.env.NODE_ENV === 'production';
const destExtension = `${isProduction ? '.min' : ''}.js`;

module.exports = {
    input: 'src/index.js',
    output: [
        { file: `dist/index${destExtension}`, format: 'cjs' },
        { file: `dist/index.es${destExtension}`, format: 'es' }
    ],
    plugins: ([
        PeerDepsExternal(),
        Resolve(),
        Commonjs({ include: 'src/*' }),
        Babel(),
        isProduction && Terser(),
        Filesize()
    ]).filter(Boolean)
};
