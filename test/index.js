'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Redux = require('redux');
const { default: ReduxThunk } = require('redux-thunk');
const { schema: { Entity }, ...Normalizr } = require('normalizr');
const MiddleEnd = require('../lib');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

describe('StrangeMiddleEnd', () => {

    describe('create() creates a middle-end', () => {

        it('is initializable, creating store during initialization.', () => {

            let called = false;
            const mods = {};

            const m = MiddleEnd.create({
                mods,
                createStore: (reducer, passedMods) => {

                    called = true;

                    expect(reducer).to.be.a.function();
                    expect(passedMods).to.shallow.equal(mods);

                    return Redux.createStore(() => null);
                }
            });

            expect(called).to.equal(false);
            expect(m.initialized).to.equal(false);

            expect(m.initialize()).to.shallow.equal(m);

            expect(called).to.equal(true);
            expect(m.initialized).to.equal(true);

            // Re-initialize

            called = false;

            expect(m.initialize()).to.shallow.equal(m);

            expect(called).to.equal(false);
            expect(m.initialized).to.equal(true);
        });

        it('defaults mods to an empty object.', { plan: 2 }, () => {

            const m = MiddleEnd.create({
                createStore: (_, mods) => {

                    expect(mods).to.equal({});

                    return Redux.createStore(() => null);
                }
            });


            m.initialize();

            expect(m.mods).to.equal({});
        });

        it('does not allow access to properties until initialized.', () => {

            const m = MiddleEnd.create({
                createStore: () => Redux.createStore(() => null)
            });

            expect(m.initialized).to.equal(false);

            expect(() => m.mods).to.throw('Cannot access property "mods" until middle-end is initialized.');
            expect(() => m.store).to.throw('Cannot access property "store" until middle-end is initialized.');
            expect(() => m.getState).to.throw('Cannot access property "getState" until middle-end is initialized.');
            expect(() => m.dispatch).to.throw('Cannot access property "dispatch" until middle-end is initialized.');
            expect(() => m.actions).to.throw('Cannot access property "actions" until middle-end is initialized.');
            expect(() => m.selectors).to.throw('Cannot access property "selectors" until middle-end is initialized.');

            m.initialize();

            expect(m.initialized).to.equal(true);

            expect(() => m.mods).to.not.throw();
            expect(() => m.store).to.not.throw();
            expect(() => m.getState).to.not.throw();
            expect(() => m.dispatch).to.not.throw();
            expect(() => m.actions).to.not.throw();
            expect(() => m.selectors).to.not.throw();
        });

        it('creates mods lazily during initialization.', { plan: 4 }, () => {

            let called = false;

            const m = MiddleEnd.create({
                mods: () => {

                    called = true;

                    return { x: {} };
                },
                createStore: (_, mods) => {

                    expect(mods).to.equal({ x: {} });

                    return Redux.createStore(() => null);
                }
            });

            expect(called).to.equal(false);

            m.initialize();

            expect(called).to.equal(true);
            expect(m.mods).to.equal({ x: {} });
        });

        it('runs mod initializers during initialization.', () => {

            let called = 0;

            const m = MiddleEnd.create({
                mods: {
                    a: { initialize: () => called++ },
                    b: {},
                    c: { initialize: () => called++ },
                    d: null
                },
                createStore: () => Redux.createStore(() => null)
            });

            expect(called).to.equal(0);

            m.initialize();

            expect(called).to.equal(2);
        });

        it('sets-up schemas (relations, relatedFields) during initialization.', () => {

            const mods = {
                a: {
                    schema: {
                        x: Object.assign(new Entity('xs', {} ), {
                            relations: ({ y }) => ({
                                ys: [y]
                            })
                        }),
                        y: new Entity('ys')
                    }
                },
                b: {},
                c: {
                    schema: {
                        w: Object.assign(new Entity('ws', {}, { idAttribute: 'key' }), {
                            relations: ({ w }) => ({
                                pair: w
                            })
                        })
                    }
                },
                d: null
            };

            const m = MiddleEnd.create({
                mods,
                createStore: () => Redux.createStore(() => null)
            });

            // relatedFields helper not created

            expect(mods.a.schema.x.relatedFields).to.not.exist();
            expect(mods.a.schema.y.relatedFields).to.not.exist();
            expect(mods.c.schema.w.relatedFields).to.not.exist();

            // Relations not defined

            expect(Normalizr.normalize({ id: 1, ys: [{ id: 2 }] }, mods.a.schema.x)).to.equal({
                entities: {
                    xs: {
                        '1': { id: 1, ys: [{ id: 2 }] }
                    }
                },
                result: 1
            });

            expect(Normalizr.normalize({ id: 1 }, mods.a.schema.y)).to.equal({
                entities: {
                    ys: {
                        '1': { id: 1 }
                    }
                },
                result: 1
            });

            expect(Normalizr.normalize({ key: 1, pair: { key: 2 } }, mods.c.schema.w)).to.equal({
                entities: {
                    ws: {
                        '1': { key: 1, pair: { key: 2 } }
                    }
                },
                result: 1
            });

            m.initialize();

            expect(mods.a.schema.x.relatedFields({ id: 1, x: 'x', y: 'y' }, ['x'])).to.equal({ id: 1, x: 'x' });
            expect(mods.a.schema.y.relatedFields({ id: 1, x: 'x', y: 'y' }, ['x'])).to.equal({ id: 1, x: 'x' });
            expect(mods.c.schema.w.relatedFields({ key: 1, x: 'x', y: 'y' }, ['x'])).to.equal({ key: 1, x: 'x' });

            expect(Normalizr.normalize({ id: 1, ys: [{ id: 2 }] }, mods.a.schema.x)).to.equal({
                entities: {
                    xs: {
                        '1': { id: 1, ys: [2] }
                    },
                    ys: {
                        '2': { id: 2 }
                    }
                },
                result: 1
            });

            expect(Normalizr.normalize({ id: 1 }, mods.a.schema.y)).to.equal({
                entities: {
                    ys: {
                        '1': { id: 1 }
                    }
                },
                result: 1
            });

            expect(Normalizr.normalize({ key: 1, pair: { key: 2 } }, mods.c.schema.w)).to.equal({
                entities: {
                    ws: {
                        '1': { key: 1, pair: 2 },
                        '2': { key: 2 }
                    }
                },
                result: 1
            });
        });

        it('creates store with reducers from mod branches.', () => {

            const m = MiddleEnd.create({
                mods: {
                    a: { reducer: (state = 0, { type }) => state + Number(type === 'a') },
                    b: {},
                    c: { reducer: (state = 0, { type }) => state + Number(type === 'c') },
                    d: null
                },
                createStore: (reducers) => Redux.createStore(reducers)
            });

            m.initialize();

            expect(m.store.getState()).to.equal({ a: 0, c: 0 });

            m.store.dispatch({ type: 'a' });
            m.store.dispatch({ type: 'c' });
            m.store.dispatch({ type: 'a' });

            expect(m.store.getState()).to.equal({ a: 2, c: 1 });
        });

        it('has getState() and dispatch() convenience methods.', () => {

            const m = MiddleEnd.create({
                mods: {
                    a: { reducer: (state = 0, { type }) => state + Number(type === 'a') },
                    b: {},
                    c: { reducer: (state = 0, { type }) => state + Number(type === 'c') },
                    d: null
                },
                createStore: (reducers) => Redux.createStore(reducers)
            });

            m.initialize();

            expect(m.getState()).to.equal({ a: 0, c: 0 });

            m.dispatch({ type: 'a' });
            m.dispatch({ type: 'c' });
            m.dispatch({ type: 'a' });

            expect(m.getState()).to.equal({ a: 2, c: 1 });
        });

        it('has action and dispatch from mod branches.', () => {

            const m = MiddleEnd.create({
                mods: {
                    a: {
                        reducer: (state = 0, { type }) => state + Number(type === 'a'),
                        actions: {
                            increment: () => ({ type: 'a' })
                        }
                    },
                    b: {},
                    c: {
                        reducer: (state = 0, { type }) => state + Number(type === 'c'),
                        actions: {
                            increment: () => ({ type: 'c' })
                        }
                    },
                    d: null
                },
                createStore: (reducers) => Redux.createStore(reducers)
            });

            m.initialize();

            expect(m.actions).to.only.contain(['a', 'c']);
            expect({ ...m.dispatch }).to.only.contain(['a', 'c']);
            expect(m.dispatch).to.not.shallow.equal(m.store.dispatch);

            expect(m.getState()).to.equal({ a: 0, c: 0 });

            m.dispatch(m.actions.a.increment());
            m.dispatch.c.increment();
            m.dispatch.a.increment();

            expect(m.getState()).to.equal({ a: 2, c: 1 });
        });

        it('has selectors from mod branches.', () => {

            const m = MiddleEnd.create({
                mods: {
                    a: { selectors: {} },
                    b: {},
                    c: { selectors: {} },
                    d: null
                },
                createStore: () => Redux.createStore(() => null)
            });

            m.initialize();

            expect(m.selectors).to.only.contain(['a', 'c']);
            expect(m.selectors.a).to.shallow.equal(m.mods.a.selectors);
            expect(m.selectors.c).to.shallow.equal(m.mods.c.selectors);
        });
    });

    describe('middleware', () => {

        it('thunk is redux-thunk.', () => {

            expect(MiddleEnd.middleware.thunk).to.shallow.equal(ReduxThunk);

            const store = Redux.createStore((_, { type }) => type, Redux.applyMiddleware(MiddleEnd.middleware.thunk));

            store.dispatch((dispatch) => dispatch({ type: 'a' }));

            expect(store.getState()).to.equal('a');
        });

        it('errorLogger logs errors.', (flags) => {

            let lastErrorLog;
            const originalErrorLog = console.error;

            console.error = (...args) => {

                lastErrorLog = args;
            };

            flags.onCleanup = () => {

                console.error = originalErrorLog;
            };

            const store = Redux.createStore(() => null, Redux.applyMiddleware(MiddleEnd.middleware.errorLogger));

            store.dispatch({ type: 'a' });
            expect(lastErrorLog).to.not.exist();

            store.dispatch({ type: 'a', error: true, meta: { meta: true }, payload: { message: 'badness' } });
            expect(lastErrorLog).to.equal(['Error from action "a"', { meta: true }, '\n', { message: 'badness' }]);
        });
    });

    describe('createAction()', () => {

        it('', () => {});
    });

    describe('createTypes() and type', () => {

        it('creates simple action types.', () => {

            const types = MiddleEnd.createTypes({
                BIG: true,
                BAD: MiddleEnd.type.simple
            });

            expect(types).to.equal({
                BIG: 'BIG',
                BAD: 'BAD'
            });
        });

        it('creates async action types.', () => {

            const types = MiddleEnd.createTypes({
                BIG: MiddleEnd.type.async,
                BAD: MiddleEnd.type.async
            });

            expect(types).to.equal({
                BIG: {
                    BASE: 'BIG',
                    BEGIN: 'BIG/BEGIN',
                    SUCCESS: 'BIG/SUCCESS',
                    FAIL: 'BIG/FAIL'
                },
                BAD: {
                    BASE: 'BAD',
                    BEGIN: 'BAD/BEGIN',
                    SUCCESS: 'BAD/SUCCESS',
                    FAIL: 'BAD/FAIL'
                }
            });
        });

        it('creates action types with prefix.', () => {

            const types = MiddleEnd.createTypes('XXX', {
                BIG: MiddleEnd.type.simple,
                BAD: MiddleEnd.type.async
            });

            expect(types).to.equal({
                BIG: 'XXX/BIG',
                BAD: {
                    BASE: 'XXX/BAD',
                    BEGIN: 'XXX/BAD/BEGIN',
                    SUCCESS: 'XXX/BAD/SUCCESS',
                    FAIL: 'XXX/BAD/FAIL'
                }
            });
        });

        it('passes through other action types.', () => {

            const types = MiddleEnd.createTypes({
                BIG: 'VERY_BIG',
                BAD: {
                    OK: 'BAD/OK',
                    OOPS: 'BAD/OOPS'
                }
            });

            expect(types).to.equal({
                BIG: 'VERY_BIG',
                BAD: {
                    OK: 'BAD/OK',
                    OOPS: 'BAD/OOPS'
                }
            });
        });
    });

    describe('isTypeOfBase()', () => {

        it('checks base of simple and async actions.', () => {

            const types = MiddleEnd.createTypes({
                BIG: MiddleEnd.type.async,
                BAD: MiddleEnd.type.simple
            });

            expect(MiddleEnd.isTypeOfBase(types.BIG.BASE, types.BIG.BASE)).to.equal(true);
            expect(MiddleEnd.isTypeOfBase(types.BIG.BEGIN, types.BIG.BASE)).to.equal(true);
            expect(MiddleEnd.isTypeOfBase(types.BIG.SUCCESS, types.BIG.BASE)).to.equal(true);
            expect(MiddleEnd.isTypeOfBase(types.BIG.FAIL, types.BIG.BASE)).to.equal(true);
            expect(MiddleEnd.isTypeOfBase(types.BAD, types.BAD)).to.equal(true);
            expect(MiddleEnd.isTypeOfBase(types.BIG.BASE, 'BIGX')).to.equal(false);
            expect(MiddleEnd.isTypeOfBase(types.BAD, 'BADX')).to.equal(false);
        });
    });

    describe('isTypeBegin()', () => {

        it('checks base of beginning async actions.', () => {

            const types = MiddleEnd.createTypes({
                BIG: MiddleEnd.type.async,
                BAD: MiddleEnd.type.simple
            });

            expect(MiddleEnd.isTypeBegin(types.BIG.BASE, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeBegin(types.BIG.BEGIN, types.BIG.BASE)).to.equal(true);
            expect(MiddleEnd.isTypeBegin(types.BIG.SUCCESS, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeBegin(types.BIG.FAIL, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeBegin(types.BAD, types.BAD)).to.equal(false);
            expect(MiddleEnd.isTypeBegin(types.BIG.BASE, 'BIGX')).to.equal(false);
            expect(MiddleEnd.isTypeBegin(types.BAD, 'BADX')).to.equal(false);
        });
    });

    describe('isTypeSuccess()', () => {

        it('checks base of successful async actions.', () => {

            const types = MiddleEnd.createTypes({
                BIG: MiddleEnd.type.async,
                BAD: MiddleEnd.type.simple
            });

            expect(MiddleEnd.isTypeSuccess(types.BIG.BASE, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeSuccess(types.BIG.BEGIN, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeSuccess(types.BIG.SUCCESS, types.BIG.BASE)).to.equal(true);
            expect(MiddleEnd.isTypeSuccess(types.BIG.FAIL, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeSuccess(types.BAD, types.BAD)).to.equal(false);
            expect(MiddleEnd.isTypeSuccess(types.BIG.BASE, 'BIGX')).to.equal(false);
            expect(MiddleEnd.isTypeSuccess(types.BAD, 'BADX')).to.equal(false);
        });
    });

    describe('isTypeFail()', () => {

        it('checks base of failing async actions.', () => {

            const types = MiddleEnd.createTypes({
                BIG: MiddleEnd.type.async,
                BAD: MiddleEnd.type.simple
            });

            expect(MiddleEnd.isTypeFail(types.BIG.BASE, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeFail(types.BIG.BEGIN, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeFail(types.BIG.SUCCESS, types.BIG.BASE)).to.equal(false);
            expect(MiddleEnd.isTypeFail(types.BIG.FAIL, types.BIG.BASE)).to.equal(true);
            expect(MiddleEnd.isTypeFail(types.BAD, types.BAD)).to.equal(false);
            expect(MiddleEnd.isTypeFail(types.BIG.BASE, 'BIGX')).to.equal(false);
            expect(MiddleEnd.isTypeFail(types.BAD, 'BADX')).to.equal(false);
        });
    });

    describe('createReducer()', () => {

        it('', () => {});
    });

    describe('createEntityReducer()', () => {

        it('', () => {});
    });
});
