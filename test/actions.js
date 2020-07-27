'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Redux = require('redux');
const { schema: { Entity } } = require('normalizr');
const MiddleEnd = require('../lib');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

describe('Actions', () => {

    describe('createAction()', () => {

        it('creates a simple action.', () => {

            const actionX = MiddleEnd.createAction('X');

            expect(actionX({ id: 1 })).to.equal({
                type: 'X',
                payload: { id: 1 }
            });

            expect(actionX({ id: 1 }, { id: 2 })).to.equal({
                type: 'X',
                payload: [{ id: 1 }, { id: 2 }]
            });
        });

        it('creates a simple action with a custom transformation.', () => {

            const actionX = MiddleEnd.createAction('X', {
                transform: (first, second) => ({
                    ids: []
                        .concat(first && first.id || [])
                        .concat(second && second.id || [])
                })
            });

            expect(actionX({ id: 1 })).to.equal({
                type: 'X',
                payload: { ids: [1] }
            });

            expect(actionX({ id: 1 }, { id: 2 })).to.equal({
                type: 'X',
                payload: { ids: [1, 2] }
            });

            const actionY = MiddleEnd.createAction('Y', (first, second) => ({
                ids: []
                    .concat(first && first.id || [])
                    .concat(second && second.id || [])
            }));

            expect(actionY({ id: 1 })).to.equal({
                type: 'Y',
                payload: { ids: [1] }
            });

            expect(actionY({ id: 1 }, { id: 2 })).to.equal({
                type: 'Y',
                payload: { ids: [1, 2] }
            });
        });

        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const createActionRecordingStore = () => {

            const reducer = (state, action) => {

                // Skips INIT action

                return (typeof state === 'undefined') ? [] : state.concat(action);
            };

            const enhancer = Redux.applyMiddleware(MiddleEnd.middleware.thunk);

            return Redux.createStore(reducer, enhancer);
        };

        it('creates an async action.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X);

            const dispatching = store.dispatch(actionX({ id: 1 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } }
            ]);

            const results = await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } },
                { type: X.SUCCESS, payload: { id: 1 }, meta: { index: null, original: { id: 1 } } }
            ]);

            expect(results).to.equal([null, { id: 1 }]);

            // Extra check for special case — single array arg
            const arrayResults = await store.dispatch(actionX([{ id: 2 }, { id: 3 }]));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } },
                { type: X.SUCCESS, payload: { id: 1 }, meta: { index: null, original: { id: 1 } } },
                { type: X.BEGIN, payload: [[{ id: 2 }, { id: 3 }]], meta: { index: null } },
                { type: X.SUCCESS, payload: [[{ id: 2 }, { id: 3 }]], meta: { index: null, original: [[{ id: 2 }, { id: 3 }]] } }
            ]);

            expect(arrayResults).to.equal([null, [[{ id: 2 }, { id: 3 }]]]);
        });

        it('creates an async action with a handler that succeeds.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                handler: async (input) => {

                    await wait(1);

                    return {
                        ...input,
                        found: true
                    };
                }
            });

            const dispatching = store.dispatch(actionX({ id: 1 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } }
            ]);

            const results = await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } },
                { type: X.SUCCESS, payload: { id: 1, found: true }, meta: { index: null, original: { id: 1 } } }
            ]);

            expect(results).to.equal([null, { id: 1, found: true }]);
        });

        it('creates an async action with a handler that fails.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                handler: async () => {

                    await wait(1);

                    throw new Error('oops!');
                }
            });

            const dispatching = store.dispatch(actionX({ id: 1 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } }
            ]);

            const results = await dispatching;

            const errorToMessage = ({ payload, ...others }) => ({
                payload: (payload instanceof Error) ? { message: payload.message } : payload,
                ...others
            });

            expect(store.getState().map(errorToMessage)).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } },
                { type: X.FAIL, error: true, payload: { message: 'oops!' }, meta: { index: null, original: { id: 1 } } }
            ]);

            expect(results[0]).to.contain({ message: 'oops!' });
            expect(results[1]).to.not.exist();
        });

        it('creates an async action with handler as config.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, async (input) => {

                await wait(1);

                return {
                    ...input,
                    found: true
                };
            });

            const dispatching = store.dispatch(actionX({ id: 1 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } }
            ]);

            const results = await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: null } },
                { type: X.SUCCESS, payload: { id: 1, found: true }, meta: { index: null, original: { id: 1 } } }
            ]);

            expect(results).to.equal([null, { id: 1, found: true }]);
        });

        it('creates an async action with a transform remapping arguments.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                transform: (first, second) => ({
                    ids: []
                        .concat(first && first.id || [])
                        .concat(second && second.id || [])
                }),
                handler: async (input) => {

                    await wait(1);

                    return {
                        ...input,
                        found: true
                    };
                }
            });

            const dispatching = store.dispatch(actionX({ id: 1 }, { id: 2 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { ids: [1, 2] }, meta: { index: null } }
            ]);

            const results = await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { ids: [1, 2] }, meta: { index: null } },
                { type: X.SUCCESS, payload: { ids: [1, 2], found: true }, meta: { index: null, original: { ids: [1, 2] } } }
            ]);

            expect(results).to.equal([null, { ids: [1, 2], found: true }]);
        });

        it('creates an async action with a default index name.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                index: true
            });

            const dispatching = store.dispatch(actionX({ id: 1 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: X.BASE } }
            ]);

            await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: X.BASE } },
                { type: X.SUCCESS, payload: { id: 1 }, meta: { index: X.BASE, original: { id: 1 } } }
            ]);
        });

        it('creates an async action with an index determined by string.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                index: 'INDEX_X'
            });

            const dispatching = store.dispatch(actionX({ id: 1 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: 'INDEX_X' } }
            ]);

            await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: 'INDEX_X' } },
                { type: X.SUCCESS, payload: { id: 1 }, meta: { index: 'INDEX_X', original: { id: 1 } } }
            ]);
        });

        it('creates an async action with an index determined by function.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                index: ({ id }) => `${X.BASE}:${id}`
            });

            const dispatching = store.dispatch(actionX({ id: 1 }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: `${X.BASE}:1` } }
            ]);

            await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { id: 1 }, meta: { index: `${X.BASE}:1` } },
                { type: X.SUCCESS, payload: { id: 1 }, meta: { index: `${X.BASE}:1`, original: { id: 1 } } }
            ]);
        });

        it('creates an async action with schema for normalization.', async () => {

            const schema = {
                dog: new Entity('dogs'),
                person: new Entity('people')
            };

            schema.person.define({
                pets: [schema.dog]
            });

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                schema: { cool: schema.person },
                handler: () => ({
                    cool: {
                        id: 10,
                        name: 'Marisha',
                        pets: [
                            { id: 20, name: 'Ren', age: 4 },
                            { id: 21, name: 'Sully', age: 7 }
                        ]
                    }
                })
            });

            const dispatching = store.dispatch(actionX());

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: undefined, meta: { index: null } }
            ]);

            await dispatching;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: undefined, meta: { index: null } },
                {
                    type: X.SUCCESS,
                    payload: {
                        result: { cool: 10 },
                        entities: {
                            dogs: {
                                20: { id: 20, name: 'Ren', age: 4 },
                                21: { id: 21, name: 'Sully', age: 7 }
                            },
                            people: {
                                10: { id: 10, name: 'Marisha', pets: [20, 21] }
                            }
                        }
                    },
                    meta: { index: null, original: undefined }
                }
            ]);
        });

        it('creates an async action with an after hook that runs on success.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                handler: ({ succeed }) => {

                    if (!succeed) {
                        throw new Error('oops!');
                    }

                    return { found: true };
                },
                after: ({ original, result }) => {

                    store.dispatch({ type: 'Y', payload: { original, result } });
                }
            });

            const dispatching1 = store.dispatch(actionX({ succeed: true }));

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { succeed: true }, meta: { index: null } }
            ]);

            await dispatching1;

            expect(store.getState()).to.equal([
                { type: X.BEGIN, payload: { succeed: true }, meta: { index: null } },
                { type: X.SUCCESS, payload: { found: true }, meta: { index: null, original: { succeed: true } } },
                { type: 'Y', payload: { result: { found: true }, original: { succeed: true } } }
            ]);

            await store.dispatch(actionX({ succeed: false }));

            const errorToMessage = ({ payload, ...others }) => ({
                payload: (payload instanceof Error) ? { message: payload.message } : payload,
                ...others
            });

            expect(store.getState().map(errorToMessage)).to.equal([
                { type: X.BEGIN, payload: { succeed: true }, meta: { index: null } },
                { type: X.SUCCESS, payload: { found: true }, meta: { index: null, original: { succeed: true } } },
                { type: 'Y', payload: { result: { found: true }, original: { succeed: true } } },
                { type: X.BEGIN, payload: { succeed: false }, meta: { index: null } },
                { type: X.FAIL, payload: { message: 'oops!' }, error: true, meta: { index: null, original: { succeed: false } } }
            ]);
        });

        it('creates an async action that normalizes errors.', async () => {

            const store = createActionRecordingStore();

            const { X } = MiddleEnd.createTypes({
                X: MiddleEnd.type.async
            });

            const actionX = MiddleEnd.createAction(X, {
                handler: () => {

                    throw ({ message: 'oops!', code: 'BAD' });
                }
            });

            const [err] = await store.dispatch(actionX());

            expect(err).to.be.instanceOf(Error);
            expect(err.message).to.equal('oops!');
            expect(err.data).to.equal({ message: 'oops!', code: 'BAD' });

            const [, failAction] = store.getState();

            expect(failAction.payload).to.shallow.equal(err);
        });
    });
});
