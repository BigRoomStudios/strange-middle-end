'use strict';

const MiddleEnd = require('../../../lib');

module.exports = MiddleEnd.createEntityReducer({
    schema: require('./schema')
});
