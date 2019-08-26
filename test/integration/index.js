'use strict';

const Redux = require('redux');
const MiddleEnd = require('../../lib');

module.exports = MiddleEnd.create({
    createStore: (reducer) => Redux.createStore(reducer, Redux.applyMiddleware(MiddleEnd.middleware.thunk)),
    mods: () => ({
        model: require('./model'),
        counter: require('./counter')
    })
});
