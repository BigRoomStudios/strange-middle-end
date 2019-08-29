# strange-middle-end

a middle-end composer using redux, normalizr, and immer

[![Build Status](https://travis-ci.org/bigroomstudios/strange-middle-end.svg?branch=master)](https://travis-ci.org/bigroomstudios/strange-middle-end) [![Coverage Status](https://coveralls.io/repos/bigroomstudios/strange-middle-end/badge.svg?branch=master&service=github)](https://coveralls.io/github/bigroomstudios/strange-middle-end?branch=master)

## Usage
> See also the [API Reference](API.md)

This package is a suite of utilities for building application "middle-ends" (everything between your interface and your persistent data source).  Each utility is meant to be functional on its own, but everything is designed to work nicely together.

```sh
npm install strange-middle-end normalizr immer redux redux-thunk
```

### Create a basic application

```js
const Redux = require('redux');
const MiddleEnd = require('strange-middle-end');

(async () => {

    const { FETCH_USER, INCREMENT } = MiddleEnd.createTypes({
        INCREMENT: MiddleEnd.type.simple,
        FETCH_USER: MiddleEnd.type.async
    });

    const actions = {
        increment: MiddleEnd.createAction(INCREMENT),
        fetchUser: MiddleEnd.createAction(FETCH_USER, {
            handler: async ({ id }) => {

                const res = await fetch(`/user/${id}`);

                return await res.json();
            }
        })
    };

    const reducer = MiddleEnd.createReducer({ mutable: true }, { count: 0, user: null }, {
        [INCREMENT]: (draft) => {

            draft.count++;
        },
        [FETCH_USER.SUCCESS]: (draft, { payload }) => {

            draft.user = payload;
        }
    });

    const store = Redux.createStore(reducer, Redux.applyMiddleware(
        MiddleEnd.middleware.thunk
    ));

    await store.dispatch(actions.fetchUser({ id: 42 }));

    console.log(store.getState());

    store.dispatch(actions.increment());

    console.log(store.getState());
})();
```

### Compose an application

```js
const Redux = require('redux');
const { schema: { Entity } } = require('normalizr');
const MiddleEnd = require('strange-middle-end');

(async () => {

    const { FETCH_USER, INCREMENT } = MiddleEnd.createTypes({
        INCREMENT: MiddleEnd.type.simple,
        FETCH_USER: MiddleEnd.type.async
    });

    const schema = {};

    schema.user = new Entity('users');
    schema.user.relations = ({ user }) => ({
        friends: [user]
    });

    const app = MiddleEnd.create({
        mods: {
            counter: {
                actions: {
                    increment: MiddleEnd.createAction(INCREMENT)
                },
                reducer: MiddleEnd.createReducer(0, {
                    [INCREMENT]: (state) => state + 1
                }),
                selectors: {
                    get: ({ counter }) => counter
                }
            },
            model: {
                schema,
                actions: {
                    fetchUser: MiddleEnd.createAction(FETCH_USER, {
                        index: true,
                        schema: schema.user,
                        handler: async ({ id }) => {

                            const res = await fetch(`/user/${id}`);

                            return await res.json();
                        },
                        after: ({ original: { id } }) => {

                            if (id > 42) {
                                app.dispatch.counter.increment();
                            }
                        }
                    })
                },
                reducer: MiddleEnd.createEntityReducer({ schema }),
                selectors: {
                    getUser: ({ model }) => {

                        const { result: id } = model.indexes[FETCH_USER.BASE] || {};
                        const { [id]: user } = model.entities.users;

                        return user;
                    }
                }
            }
        },
        createStore: (reducer) => {

            return Redux.createStore(reducer, Redux.applyMiddleware(
                MiddleEnd.middleware.thunk,
                MiddleEnd.middleware.errorLogger
            ));
        }
    });

    app.initialize();

    await app.dispatch.model.fetchUser({ id: 42 });

    console.log(app.selectors.model.getUser(app.getState()));

    app.dispatch.counter.increment();

    console.log(app.selectors.counter.get(app.getState()));
})();
```
