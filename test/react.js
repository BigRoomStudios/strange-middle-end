'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const React = require('react');
const Redux = require('redux');
const TestingHooks = require('@testing-library/react-hooks');
const TestRenderer = require('react-test-renderer');
const MiddleEnd = require('../lib');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

const createMiddleEnd = (init = true, initialState = 0) => {

    const { INCREMENT } = MiddleEnd.createTypes({
        INCREMENT: MiddleEnd.type.simple
    });

    const m = MiddleEnd.create({
        mods: {
            counter: {
                actions: {
                    increment: MiddleEnd.createAction(INCREMENT)
                },
                reducer: MiddleEnd.createReducer(initialState, {
                    [INCREMENT]: (state) => state + 1
                }),
                selectors: {
                    get: ({ counter }) => counter
                }
            }
        },
        createStore: (reducer) => Redux.createStore(reducer, Redux.applyMiddleware(MiddleEnd.middleware.thunk))
    });
    if (init) {
        m.initialize();
    }

    return m;
};

describe('React', () => {

    describe('useMiddleEnd', () => {

        it('throws if user does not provide a middle-end.', (flags) => {

            flags.onCleanup = TestingHooks.cleanup;

            const { result } = TestingHooks.renderHook(() => MiddleEnd.useMiddleEnd());

            expect(result.error.message).to.equal(
                'No middle-end found. Make sure this component is wrapped in strange-middle-end\'s <Provider>.'
            );
        });

        it('returns the provided middle-end', (flags) => {

            flags.onCleanup = TestingHooks.cleanup;

            const middleEnd = createMiddleEnd();

            const { result } = TestingHooks.renderHook(() => MiddleEnd.useMiddleEnd(), {
                wrapper: ({ children }) => {

                    return React.createElement(MiddleEnd.Provider, {
                        middleEnd
                    }, children);
                }
            });

            expect(result.current).to.shallow.equal(middleEnd);

            TestingHooks.act(() => {

                result.current.dispatch.counter.increment();
            });

            expect(result.current.select.counter.get()).to.equal(1);
        });

        it('returns the nearest provided middle-end', (flags) => {

            flags.onCleanup = TestingHooks.cleanup;

            const m1 = createMiddleEnd(true, 20);
            const m2 = createMiddleEnd(true, 55);

            const { result } = TestingHooks.renderHook(() => MiddleEnd.useMiddleEnd(), {
                wrapper: ({ children }) => {

                    return React.createElement(MiddleEnd.Provider, {
                        middleEnd: m1
                    },
                    React.createElement(MiddleEnd.Provider, {
                        middleEnd: m2
                    }, children)
                    );
                }
            });

            expect(result.current).to.equal(m2);


            const M = ({ count, dispatch, id }) => {

                return null;
            };

            const Container = ({ id }) => {

                const m = MiddleEnd.useMiddleEnd();
                return React.createElement(M, {
                    count: m.select.counter.get(),
                    id,
                    m
                });
            };

            let tree;
            TestRenderer.act(() => {

                tree = TestRenderer.create(React.createElement(MiddleEnd.Provider, {
                    middleEnd: m1
                }, React.Children.toArray([
                    React.createElement(Container, { id: 'outer' }),
                    React.createElement(
                        MiddleEnd.Provider,
                        { middleEnd: m2 },
                        React.createElement(Container, { id: 'inner' })
                    )
                ])
                ));
            });

            tree.root.findAllByType(M).forEach((el) => {

                const { id, count, m } = el.props;
                if (id === 'outer') {
                    expect(count).to.equal(20);
                    expect(m).to.equal(m1);
                }

                if (id === 'inner') {
                    expect(count).to.equal(55);
                    expect(m).to.equal(m2);
                }
            });
        });
    });

    describe('Provider', () => {

        it('throws if falsey or uninitialized middle-end provided.', (flags) => {

            const message = 'StrangeMiddleEnd.Provider received an unitialized middle-end. Please pass an initialized middle-end.';

            // react-test-renderer calls console.error internally
            // hide those from our test logs
            const origError = console.error;
            console.error = () => {};

            flags.onCleanup = () => {

                console.error = origError;
            };

            expect(() => {

                TestRenderer.act(() => {

                    TestRenderer.create(React.createElement(MiddleEnd.Provider));
                });
            }).to.throw(Error, message);

            expect(() => {

                const uninitialized = createMiddleEnd(false);
                TestRenderer.act(() => {

                    TestRenderer.create(React.createElement(MiddleEnd.Provider, { middleEnd: uninitialized }));
                });
            }).to.throw(Error, message);
        });
    });

    it('integrates into a usual component tree.', () => {

        const m = createMiddleEnd();

        const Counter = () => {

            const mE = MiddleEnd.useMiddleEnd();

            return React.createElement('div', null,
                React.Children.toArray([
                    React.createElement('button', { onClick: () => mE.dispatch.counter.increment() }),
                    mE.select.counter.get()
                ])
            );
        };

        const App = () => {

            return React.createElement(MiddleEnd.Provider, {
                middleEnd: m
            }, React.createElement(Counter));
        };

        let tree;
        TestRenderer.act(() => {

            tree = TestRenderer.create(App(1));
        });

        let button;
        let text;

        // initial state
        [button, text] = tree.root.findByType(Counter).children[0].children;
        expect(m.select.counter.get()).to.equal(0);
        expect(text).to.equal(String(m.select.counter.get()));

        TestRenderer.act(() => {

            button.props.onClick();
        });

        // Counter hasn't rerender; selector isn't subscribed, dispatch isn't effectful,
        // so clicking didn't trigger a rerender
        [button, text] = tree.root.findByType(Counter).children[0].children;
        expect(m.select.counter.get()).to.equal(1);
        expect(text).to.equal(String(0));

        // force rerender
        TestRenderer.act(() => {

            tree.update(App());
        });

        [button, text] = tree.root.findByType(Counter).children[0].children;
        expect(m.select.counter.get()).to.equal(1);
        expect(text).to.equal(String(m.select.counter.get()));
    });
});
