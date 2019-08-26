'use strict';

const MiddleEnd = require('../../../lib');
const M = require('..');
const { FETCH_PERSON } = require('./action-types');
const Schema = require('./schema');

const internals = {};

exports.fetchPerson = MiddleEnd.createAction(FETCH_PERSON, {
    index: true,
    schema: Schema.person,
    handler: async ({ id }) => {

        await internals.wait(1);

        const person = internals.database[id];

        if (!person) {
            throw new Error(`Could not find person ${id}.`);
        }

        return person;
    },
    after: () => {

        const count = M.selectors.counter.get(M.getState());

        if (count > 3) {
            M.dispatch.counter.reset();
        }
    }
});

internals.wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

internals.database = {
    10: {
        id: 10,
        name: 'Marisha',
        pets: [
            { id: 20, name: 'Ren' },
            { id: 21, name: 'Sully' }
        ]
    },
    11: {
        id: 11,
        name: 'Cassandra',
        pets: [
            { id: 20, name: 'Ren' },
            { id: 21, name: 'Sul' },
            { id: 22, name: 'Guinness' }
        ]
    }
};
