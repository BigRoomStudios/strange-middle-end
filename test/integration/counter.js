'use strict';

const MiddleEnd = require('../../lib');

const internals = {};

const { RESET } = MiddleEnd.createTypes({
    RESET: MiddleEnd.type.simple
});

module.exports = {
    reducer: (state = 0, action) => {

        state++;

        return internals.reducer(state, action);
    },
    actions: {
        reset: MiddleEnd.createAction(RESET)
    },
    selectors: {
        get: ({ counter }) => counter
    }
};

internals.reducer = MiddleEnd.createReducer(0, {
    [RESET]: () => 0
});
