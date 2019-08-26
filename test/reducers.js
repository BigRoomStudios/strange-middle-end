'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const { schema: { Entity }, ...Normalizr } = require('normalizr');
const MiddleEnd = require('../lib');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

describe('Reducers', () => {

    describe('createReducer()', () => {

        it('creates an immutable reducer by default, when passed no configuration.', () => {

            const initialState = {};
            const reducer = MiddleEnd.createReducer(initialState, {
                SOME_TYPE: (state, action) => {

                    state.action = action;

                    return state;
                }
            });

            expect(reducer(undefined, { type: 'SOME_TYPE' })).to.shallow.equal(initialState);
            expect(reducer(undefined, { type: 'SOME_TYPE' })).to.equal({ action: { type: 'SOME_TYPE' } });
        });

        it('creates an immutable reducer by default, when passed empty configuration.', () => {

            const initialState = {};
            const reducer = MiddleEnd.createReducer({}, initialState, {
                SOME_TYPE: (state, action) => {

                    state.action = action;

                    return state;
                }
            });

            expect(reducer(undefined, { type: 'SOME_TYPE' })).to.shallow.equal(initialState);
            expect(reducer(undefined, { type: 'SOME_TYPE' })).to.equal({ action: { type: 'SOME_TYPE' } });
        });

        it('disallows "undefined" keys.', () => {

            const createReducer = () => {

                const types = {};

                MiddleEnd.createReducer({}, {
                    [types.DOES_NOT_EXIST]: (state) => state
                });
            };

            expect(createReducer).to.throw('Reducer has an undefined handler. Ensure that all actions used in this reducer exist.');
        });

        it('creates a reducer that runs reducer by action type specifically when there is an exact match.', () => {

            const reducer = MiddleEnd.createReducer({ value: 0 }, {
                INCREMENT: ({ value }) => ({ value: value + 1 }),
                DECREMENT: ({ value }) => ({ value: value - 1 })
            });

            expect(reducer(undefined, { type: 'NO_MATCH' })).to.equal({ value: 0 });
            expect(reducer(undefined, { type: 'INCREMENT' })).to.equal({ value: 1 });
            expect(reducer(undefined, { type: 'DECREMENT' })).to.equal({ value: -1 });
            expect(reducer({ value: 2 }, { type: 'NO_MATCH' })).to.equal({ value: 2 });
            expect(reducer({ value: 2 }, { type: 'INCREMENT' })).to.equal({ value: 3 });
            expect(reducer({ value: 2 }, { type: 'DECREMENT' })).to.equal({ value: 1 });

            const state = { value: 2 };
            expect(reducer(state, { type: 'NO_MATCH' })).to.shallow.equal(state);
            expect(reducer(state, { type: 'INCREMENT' })).to.not.shallow.equal(state);
            expect(reducer(state, { type: 'DECREMENT' })).to.not.shallow.equal(state);
        });

        it('can create mutable reducers.', () => {

            const reducer = MiddleEnd.createReducer({ mutable: true }, { value: 0 }, {
                INCREMENT: (draft) => {

                    draft.value++;
                },
                DECREMENT: (draft) => {

                    draft.value--;
                }
            });

            expect(reducer(undefined, { type: 'NO_MATCH' })).to.equal({ value: 0 });
            expect(reducer(undefined, { type: 'INCREMENT' })).to.equal({ value: 1 });
            expect(reducer(undefined, { type: 'DECREMENT' })).to.equal({ value: -1 });
            expect(reducer({ value: 2 }, { type: 'NO_MATCH' })).to.equal({ value: 2 });
            expect(reducer({ value: 2 }, { type: 'INCREMENT' })).to.equal({ value: 3 });
            expect(reducer({ value: 2 }, { type: 'DECREMENT' })).to.equal({ value: 1 });

            const state = { value: 2 };
            expect(reducer(state, { type: 'NO_MATCH' })).to.shallow.equal(state);
            expect(reducer(state, { type: 'INCREMENT' })).to.not.shallow.equal(state);
            expect(reducer(state, { type: 'DECREMENT' })).to.not.shallow.equal(state);
        });

        it('can lazily set initial state.', () => {

            const reducer = MiddleEnd.createReducer(() => ({ value: 0 }), {
                INCREMENT: ({ value }) => ({ value: value + 1 }),
                DECREMENT: ({ value }) => ({ value: value - 1 })
            });

            expect(reducer(undefined, { type: 'NO_MATCH' })).to.equal({ value: 0 });
            expect(reducer(undefined, { type: 'INCREMENT' })).to.equal({ value: 1 });
            expect(reducer(undefined, { type: 'DECREMENT' })).to.equal({ value: -1 });
            expect(reducer({ value: 2 }, { type: 'NO_MATCH' })).to.equal({ value: 2 });
            expect(reducer({ value: 2 }, { type: 'INCREMENT' })).to.equal({ value: 3 });
            expect(reducer({ value: 2 }, { type: 'DECREMENT' })).to.equal({ value: 1 });
        });
    });

    describe('createEntityReducer() creates a reducer', () => {

        it('initializes with entity and index dictionaries.', () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people'),
                unrelated: 'not-an-entity'
            };

            expect(MiddleEnd.createEntityReducer({ schema })(undefined, {})).to.equal({
                entities: { dogs: {}, people: {} },
                indexes: {}
            });
        });

        it('processes new entities into the store, overwriting old entries by default unless marked _top.', () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            schema.person.define({
                pets: [schema.dog]
            });

            const reducer = MiddleEnd.createEntityReducer({ schema });

            const payload1 = {
                id: 10,
                name: 'Marisha',
                pets: [
                    { id: 20, name: 'Ren', age: 4 },
                    { id: 21, name: 'Sully', age: 7 }
                ]
            };

            const action1 = { payload: Normalizr.normalize(payload1, schema.person) };
            const state1 = reducer(undefined, action1);

            expect(state1).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren', age: 4 },
                        21: { id: 21, name: 'Sully', age: 7 }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] }
                    }
                },
                indexes: {}
            });

            const payload2 = {
                id: 11,
                name: 'Cassandra',
                pets: [
                    { id: 20, name: 'Ren' },    // No age listed, check complete overwrite
                    { id: 21, name: 'Sul', _top: true },
                    { id: 22, name: 'Guinness' }
                ]
            };

            const action2 = { payload: Normalizr.normalize(payload2, schema.person) };
            const state2 = reducer(state1, action2);

            expect(state2).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren' },
                        21: { id: 21, name: 'Sul', age: 7, _top: true },
                        22: { id: 22, name: 'Guinness' }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] },
                        11: { id: 11, name: 'Cassandra', pets: [20, 21, 22] }
                    }
                },
                indexes: {}
            });
        });

        it('processes new entities into the store, optionally never merging.', () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            schema.person.define({
                pets: [schema.dog]
            });

            const reducer = MiddleEnd.createEntityReducer({ schema, shouldMerge: false });

            const payload1 = {
                id: 10,
                name: 'Marisha',
                pets: [
                    { id: 20, name: 'Ren', age: 4 },
                    { id: 21, name: 'Sully', age: 7 }
                ]
            };

            const action1 = { payload: Normalizr.normalize(payload1, schema.person) };
            const state1 = reducer(undefined, action1);

            expect(state1).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren', age: 4 },
                        21: { id: 21, name: 'Sully', age: 7 }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] }
                    }
                },
                indexes: {}
            });

            const payload2 = {
                id: 11,
                name: 'Cassandra',
                pets: [
                    { id: 20, name: 'Ren' },
                    { id: 21, name: 'Sul', _top: true },
                    { id: 22, name: 'Guinness' }
                ]
            };

            const action2 = { payload: Normalizr.normalize(payload2, schema.person) };
            const state2 = reducer(state1, action2);

            expect(state2).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren' },
                        21: { id: 21, name: 'Sul', _top: true },
                        22: { id: 22, name: 'Guinness' }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] },
                        11: { id: 11, name: 'Cassandra', pets: [20, 21, 22] }
                    }
                },
                indexes: {}
            });
        });

        it('processes new entities into the store, optionally always merging.', () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            schema.person.define({
                pets: [schema.dog]
            });

            const reducer = MiddleEnd.createEntityReducer({ schema, shouldMerge: true });

            const payload1 = {
                id: 10,
                name: 'Marisha',
                pets: [
                    { id: 20, name: 'Ren', age: 4 },
                    { id: 21, name: 'Sully', age: 7 }
                ]
            };

            const action1 = { payload: Normalizr.normalize(payload1, schema.person) };
            const state1 = reducer(undefined, action1);

            expect(state1).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren', age: 4 },
                        21: { id: 21, name: 'Sully', age: 7 }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] }
                    }
                },
                indexes: {}
            });

            const payload2 = {
                id: 11,
                name: 'Cassandra',
                pets: [
                    { id: 20, name: 'Ren', age: undefined },
                    { id: 21, name: 'Sul', _top: true },
                    { id: 22, name: 'Guinness' }
                ]
            };

            const action2 = { payload: Normalizr.normalize(payload2, schema.person) };
            const state2 = reducer(state1, action2);

            expect(state2).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren', age: 4 },
                        21: { id: 21, name: 'Sul', age: 7, _top: true },
                        22: { id: 22, name: 'Guinness' }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] },
                        11: { id: 11, name: 'Cassandra', pets: [20, 21, 22] }
                    }
                },
                indexes: {}
            });
        });

        it('processes new entities into the store, merging conditionally based on the entity.', () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            schema.person.define({
                pets: [schema.dog]
            });

            const reducer = MiddleEnd.createEntityReducer({ schema, shouldMerge: (entity) => entity.id === 21 });

            const payload1 = {
                id: 10,
                name: 'Marisha',
                pets: [
                    { id: 20, name: 'Ren', age: 4 },
                    { id: 21, name: 'Sully', age: 7 }
                ]
            };

            const action1 = { payload: Normalizr.normalize(payload1, schema.person) };
            const state1 = reducer(undefined, action1);

            expect(state1).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren', age: 4 },
                        21: { id: 21, name: 'Sully', age: 7 }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] }
                    }
                },
                indexes: {}
            });

            const payload2 = {
                id: 11,
                name: 'Cassandra',
                pets: [
                    { id: 20, name: 'Ren' },
                    { id: 21, name: 'Sul', whatever: true },    // Only this record should merge due to its id
                    { id: 22, name: 'Guinness' }
                ]
            };

            const action2 = { payload: Normalizr.normalize(payload2, schema.person) };
            const state2 = reducer(state1, action2);

            expect(state2).to.equal({
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren' },
                        21: { id: 21, name: 'Sul', age: 7, whatever: true },
                        22: { id: 22, name: 'Guinness' }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] },
                        11: { id: 11, name: 'Cassandra', pets: [20, 21, 22] }
                    }
                },
                indexes: {}
            });
        });

        it('processes new entities into the store, skipping over error and non-normalized payloads.', () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            schema.person.define({
                pets: [schema.dog]
            });

            const reducer = MiddleEnd.createEntityReducer({ schema });

            const payload = {
                id: 10,
                name: 'Marisha',
                pets: [
                    { id: 20, name: 'Ren', age: 4 },
                    { id: 21, name: 'Sully', age: 7 }
                ]
            };

            const action1 = { error: true, payload: Normalizr.normalize(payload, schema.person) };

            expect(reducer(undefined, action1)).to.equal({
                entities: { dogs: {}, people: {} },
                indexes: {}
            });

            const action2 = { payload: null };

            expect(reducer(undefined, action2)).to.equal({
                entities: { dogs: {}, people: {} },
                indexes: {}
            });

            const action3 = { payload: { ...Normalizr.normalize(payload, schema.person), entities: null } };

            expect(reducer(undefined, action3)).to.equal({
                entities: { dogs: {}, people: {} },
                indexes: {}
            });

            const normalized = Normalizr.normalize(payload, schema.person);
            delete normalized.result;

            const action4 = { payload: normalized };

            expect(reducer(undefined, action4)).to.equal({
                entities: { dogs: {}, people: {} },
                indexes: {}
            });
        });

        it('processes new entities into the store, skipping over unknown entities.', () => {

            const schema1 = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            const schema2 = {
                cat: new Entity('cats')
            };

            schema1.person.define({
                pets: [schema2.cat]
            });

            const reducer = MiddleEnd.createEntityReducer({ schema: schema1 });

            const payload = {
                id: 10,
                name: 'Marisha',
                pets: [
                    { id: 20, name: 'Ren', age: 4 },
                    { id: 21, name: 'Sully', age: 7 }
                ]
            };

            const action = { payload: Normalizr.normalize(payload, schema1.person) };

            expect(reducer(undefined, action)).to.equal({
                entities: {
                    dogs: {},
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] }
                    }
                },
                indexes: {}
            });
        });

        it('indexes all async actions by default, recording originals and errors.', () => {

            const reducer = MiddleEnd.createEntityReducer();

            const state1 = reducer(undefined, {
                type: 'X/BEGIN',
                meta: { index: 'X' }
            });

            expect(state1).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 1,
                        original: undefined,
                        result: undefined
                    }
                }
            });

            const state2 = reducer(state1, {
                type: 'X/FAIL',
                meta: { index: 'X' }
            });

            expect(state2).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 0,
                        original: undefined,
                        result: undefined
                    }
                }
            });

            const state3 = reducer(state2, {
                type: 'Y/BEGIN',
                meta: { index: 'Y' }
            });

            expect(state3).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 0,
                        original: undefined,
                        result: undefined
                    },
                    Y: {
                        error: null,
                        inFlight: 1,
                        original: undefined,
                        result: undefined
                    }
                }
            });

            const state4 = reducer(state3, {
                type: 'Y/SUCCESS',
                meta: { index: 'Y' }
            });

            expect(state4).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 0,
                        original: undefined,
                        result: undefined
                    },
                    Y: {
                        error: null,
                        inFlight: 0,
                        original: undefined,
                        result: undefined
                    }
                }
            });

            const state5 = reducer(state4, {
                type: 'X/BEGIN',
                payload: { id: 1 },
                meta: { index: 'X' }
            });

            expect(state5).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 1,
                        original: { id: 1 },
                        result: undefined
                    },
                    Y: {
                        error: null,
                        inFlight: 0,
                        original: undefined,
                        result: undefined
                    }
                }
            });

            const state6 = reducer(state5, {
                type: 'X/SUCCESS',
                payload: { id: 1, name: 'Harper' },
                meta: { index: 'X', original: { id: 1, updated: true } }
            });

            expect(state6).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 0,
                        original: { id: 1, updated: true },
                        result: { id: 1, name: 'Harper' }
                    },
                    Y: {
                        error: null,
                        inFlight: 0,
                        original: undefined,
                        result: undefined
                    }
                }
            });

            const state7 = reducer(state6, {
                type: 'Y/BEGIN',
                payload: { id: 2 },
                meta: { index: 'Y' }
            });

            expect(state7).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 0,
                        original: { id: 1, updated: true },
                        result: { id: 1, name: 'Harper' }
                    },
                    Y: {
                        error: null,
                        inFlight: 1,
                        original: { id: 2 },
                        result: undefined
                    }
                }
            });

            const state8 = reducer(state7, {
                type: 'Y/FAIL',
                error: true,
                payload: { message: 'Fail!' },
                meta: { index: 'Y', original: { id: 2, updated: true } }
            });

            expect(state8).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 0,
                        original: { id: 1, updated: true },
                        result: { id: 1, name: 'Harper' }
                    },
                    Y: {
                        error: { message: 'Fail!' },
                        inFlight: 0,
                        original: { id: 2, updated: true },
                        result: undefined
                    }
                }
            });

            const state9 = reducer(state8, {
                type: 'X/BEGIN',
                payload: { id: 1 },
                meta: { index: 'X' }
            });

            expect(state9).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 1,
                        original: { id: 1 },
                        result: { id: 1, name: 'Harper' }
                    },
                    Y: {
                        error: { message: 'Fail!' },
                        inFlight: 0,
                        original: { id: 2, updated: true },
                        result: undefined
                    }
                }
            });

            const state10 = reducer(state9, {
                type: 'X/BEGIN',
                payload: { id: 1 },
                meta: { index: 'X' }
            });

            expect(state10).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 2,
                        original: { id: 1 },
                        result: { id: 1, name: 'Harper' }
                    },
                    Y: {
                        error: { message: 'Fail!' },
                        inFlight: 0,
                        original: { id: 2, updated: true },
                        result: undefined
                    }
                }
            });

            const state11 = reducer(state10, {
                type: 'X/FAIL',
                error: true,
                meta: { index: 'X' }
            });

            expect(state11).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: true,
                        inFlight: 1,
                        original: { id: 1 },
                        result: { id: 1, name: 'Harper' }
                    },
                    Y: {
                        error: { message: 'Fail!' },
                        inFlight: 0,
                        original: { id: 2, updated: true },
                        result: undefined
                    }
                }
            });
        });

        it('skips indexing when configured.', () => {

            const reducer = MiddleEnd.createEntityReducer({ shouldIndex: false });

            const state = reducer(undefined, {
                type: 'X/BEGIN',
                meta: { index: 'X' }
            });

            expect(state).to.equal({
                entities: {},
                indexes: {}
            });
        });

        it('skips indexing when configured with a function.', () => {

            const reducer = MiddleEnd.createEntityReducer({ shouldIndex: (index) => index === 'Y' });

            const state1 = reducer(undefined, {
                type: 'X/BEGIN',
                meta: { index: 'X' }
            });

            expect(state1).to.equal({
                entities: {},
                indexes: {}
            });

            const state2 = reducer(undefined, {
                type: 'Y/BEGIN',
                meta: { index: 'Y' }
            });

            expect(state2).to.equal({
                entities: {},
                indexes: {
                    Y: {
                        error: null,
                        inFlight: 1,
                        original: undefined,
                        result: undefined
                    }
                }
            });
        });

        it('skips indexing when action has no index.', () => {

            const reducer = MiddleEnd.createEntityReducer();

            const state1 = reducer(undefined, {
                type: 'X/BEGIN'
            });

            expect(state1).to.equal({
                entities: {},
                indexes: {}
            });

            const state2 = reducer(state1, {
                type: 'X/BEGIN',
                meta: { index: null }
            });

            expect(state2).to.equal({
                entities: {},
                indexes: {}
            });
        });

        it('indexes normalized results.', () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            schema.person.define({
                pets: [schema.dog]
            });

            const reducer = MiddleEnd.createEntityReducer();

            const state1 = reducer(undefined, {
                type: 'X/BEGIN',
                meta: { index: 'X' }
            });

            expect(state1).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 1,
                        original: undefined,
                        result: undefined
                    }
                }
            });

            const payload = {
                id: 10,
                name: 'Marisha',
                pets: [
                    { id: 20, name: 'Ren', age: 4 },
                    { id: 21, name: 'Sully', age: 7 }
                ]
            };

            const state2 = reducer(state1, {
                type: 'X/SUCCESS',
                payload: Normalizr.normalize(payload, schema.person),
                meta: { index: 'X' }
            });

            expect(state2).to.equal({
                entities: {},
                indexes: {
                    X: {
                        error: null,
                        inFlight: 0,
                        original: undefined,
                        result: 10
                    }
                }
            });
        });
    });
});
