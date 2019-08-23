'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Redux = require('redux');
const { schema: { Entity }, ...Normalizr } = require('normalizr');
const MiddleEnd = require('../lib');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

describe('StrangeMiddleEnd', () => {

    describe.only('create() creates a middle-end', () => {

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
                    c: { initialize: () => called++ }
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
                }
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
                    c: { reducer: (state = 0, { type }) => state + Number(type === 'c') }
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
                    c: { reducer: (state = 0, { type }) => state + Number(type === 'c') }
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
                    }
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
                    c: { selectors: {} }
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

        it('', () => {});
    });

    describe('createAction()', () => {

        it('', () => {});
    });

    describe('createTypes()', () => {

        it('', () => {});
    });

    describe('type', () => {

        it('', () => {});
    });

    describe('isTypeOfBase()', () => {

        it('', () => {});
    });

    describe('isTypeBegin()', () => {

        it('', () => {});
    });

    describe('isTypeSuccess()', () => {

        it('', () => {});
    });

    describe('isTypeFail()', () => {

        it('', () => {});
    });

    describe('createReducer()', () => {

        it('', () => {});
    });

    describe('createEntityReducer()', () => {

        it('', () => {});
    });
});
