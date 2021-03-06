# API Reference

## Core

#### `create({ mods, createStore })`
Composes a new [redux](https://github.com/reduxjs/redux)-backed application.

 - `mods` - a mod represents a single branch of the application, i.e. a single branch of state and some "namespaced" actions and selectors.  The `mods` config is an object containing mods keyed by their name, or a function returning this object.  Each mod has the following shape:

   - `reducer` - the reducer to run at this branch of the redux store.
   - `actions` - an object containing actions keyed by name.
   - `selectors` - an object containing selectors keyed by name.  Note that this does not have to be a flat object: selectors can be placed deeply within the object.
   - `schema` - an object containing [normalizr](https://github.com/paularmstrong/normalizr) entities keyed by name.
   - `initialize(app, mod)` - a function to run during application initialization.  It is passed the composed application `app` and its mod `mod`.

 - `createStore` - a function returning a redux store: `(reducer, mods) => store`.  The `reducer` is created by strange-middle-end.  Note that this store must use redux-thunk middleware (see [`middleware.thunk`](#middlewarethunk)).

Returns an uninitialized application:
 - `app.initialized` - a boolean indicating whether the application has been initialized.
 - `app.initialize()` - initializes the application.  This causes a few things to happen:
    - If `mods` was configured as a function, that function is called to resolve the mods.  This is useful to break circular dependencies between mod implementations and the application.
    - Each of the properties mentioned below (`app.mods`, `app.store`, `app.actions`, etc.) become available for use.  Before initialization, trying to access any of these properties will throw an error.
    - Each mod `schema` is initialized by calling each entity's `relations()` function, passing that function the entire `schema`.  This makes it convenient to configure schemas with many entities that reference each other: the relations can be co-located with the rest of the entity configuration.
    - Each `schema`'s entities are given a `relatedFields()` method with the `idAttribute` configured properly per entity.  For more info see [`relatedFields()`](#relatedfields-entity-fields-idattribute).
    - Each `mod`'s `initialize(app, mod)` function is called.
    - The `app.initialized` property switches from `false` to `true`.
 - `app.mods` - an object containing mods keyed by their name.
 - `app.store` - the redux store returned from the application's `createStore` config.
 - `app.getState()` - an alias to `app.store.getState()`.
 - `app.dispatch()` - an alias to `app.store.dispatch()`.
 - `app.dispatch.MOD.ACTION()` - dispatches `MOD`'s action named `ACTION`, passing along arguments to that action.  Same as `app.dispatch(app.actions.MOD.ACTION())`.
 - `app.actions.MOD.ACTION()` - an alias for `MOD`'s action named `ACTION`.  Same as `app.mods.MOD.actions.ACTION()`.
 - `app.select.MOD.SELECTOR()` - calls `MOD`'s selector named `SELECTOR` with the app's current state bound as the first argument and passing along additional arguments.  Same as `app.mods.MOD.selectors.SELECTOR(app.getState())`.
 - `app.selectors.MOD.SELECTOR()` - an alias for `MOD`'s selector named `SELECTOR`.  Same as `app.mods.MOD.selectors.SELECTOR()`.

#### `middleware`
Some required and/or useful redux middleware.  Typically these come in handy when implementing the `createStore` configuration of [`create()`](#create-mods-createstore).

##### `middleware.thunk`
This is an alias for the redux-thunk package.  It is required if you are utilizing strange-middle-end's async actions functionality.

##### `middleware.errorLogger`
This is a very minimal middleware to log action info for any action tagged with `error: true`, i.e. any failure actions generated by strange-middle-end's async actions functionality.

#### `relatedFields(entity, fields, [{ idAttribute }])`
Sometimes it is convenient to break-up larger entities into smaller ones, for the purposes of store normalization or otherwise.  If the passed `entity` (a simple object) contains any fields listed in `fields`, then an object is returned containing those fields and their values, plus the entity's id field and its value.  If the passed `entity` does not contain any of those fields, then nothing (`undefined`) is returned.  The id field for the entity can be configred with `idAttribute`, which defaults to `'id'`.

```js
const person = {
    id: 10,
    name: 'Harper',
    age: 28
};

MiddleEnd.relatedFields(person, ['name']);      // { id: 10, name: 'Harper' }
MiddleEnd.relatedFields(person, ['location']);  // undefined
```

## Types

### `createTypes([prefix], config)` and `type`

These are utilities to create action types for simple actions (which occur synchronously and have no success/failure state) and async actions (which may succeed or fail).

The `config` argument is an object containing action type configs keyed by each action type's base name.  The configs can be one of several values:

 - `type.simple` - this indicates a simple action type.  This action type takes the form a string containing its base name.
 - `type.async` - this indicates an async action type.  This action type has sub-types, so it will take the form `{ BASE, BEGIN, SUCCESS, FAIL }`, where each value is a string containing its base name plus a suffix to indicate success, failure, etc.
 - `true` - an alias for `type.simple`.
 - anything else - this will be passed directly through `createTypes()`, i.e. if you need some custom action types.

When `prefix` is specified, simple and async action (sub-)types are prefixed with this string followed by a slash `/`.

### `isTypeOfBase(type, base)`
Indicates whether the action `type` has a certain `base`.  This is particularly applicable in the case of async action types, which have multiple sub-types of the same base.

```js
const { INCREMENT, FETCH_USER } = MiddleEnd.createTypes({
    INCREMENT: MiddleEnd.type.simple,
    FETCH_USER: MiddleEnd.type.async
});

MiddleEnd.isTypeOfBase(INCREMENT, FETCH_USER.BASE);             // false
MiddleEnd.isTypeOfBase(FETCH_USER.SUCCESS, FETCH_USER.BASE);    // true
```

### `isTypeBegin(type)`
Indicates whether the action `type` indicates the beginning of an async action.

### `isTypeSuccess(type)`
Indicates whether the action `type` indicates the success of an async action.

### `isTypeFail(type)`
Indicates whether the action `type` indicates the failure of an async action.

## Actions

#### `createAction(type, config)`
This utility makes an action creator from an action type and some configuration.  The configuration varies depending on whether the action type is simple or async, as described in [`createTypes()`](#createtypesprefix-config-and-type).

When `type` is a simple action type (i.e. a string) then `config` takes the following options:

 - `transform(...args)` - returns the action payload from the arguments passed to the action.  Defaults to return the array `args` unless there is only one argument, in which case it returns that sole argument.  Note that if `config` is a function, then it is taken to be the configuration for this option.

Resulting actions take the shape `{ type, payload }`.

When `type` is an async action type (i.e. an object `{ BASE, BEGIN, SUCCESS, FAIL }`) then `config` takes the following options:

 - `async handler(...args)` - the asynchronous handler to run for this action.  Returning a value indicates success, and the value is used as the payload of the success action.  Throwing an error indicates failure, and is used as the payload of the error action.
 - `after({ original, result })` - a function to run after a successful handler result.  The result of the handler is passed as `result`, while `original` contains the arguments passed to the handler.
 - `index` - the name of an index to use with this action.  May be specified as a string, a function with the same arguments as `handler` returning the name, or `true` to use the action type base name.  For more information on indexes see [`createEntityReducer()`](#createentityreducer-schema-shouldmerge-shouldindex).
 - `schema` - a [normalizr](https://github.com/paularmstrong/normalizr) schema used to normalize a successful `handler` result.  For more information on normalization see [`createEntityReducer()`].(#createentityreducer-schema-shouldmerge-shouldindex).
 - `transform(...args)` - returns the original/"begin" action payload, and in turn the arguments to `handler()`, from the arguments passed to the action.  Defaults to return the array `args` unless there is only one argument, in which case it returns that sole argument.

Resulting actions take the following shapes:
 - When beginning `{ type: type.BEGIN, payload, meta: { index } }`
 - Upon success `{ type: type.SUCCESS, payload, meta: { index, original } }`
 - Upon failure `{ type: type.FAIL, error: true, payload, meta: { index, original } }`

> **Note**
>
>Pardon the slight misnomer here: we found the name `createActionCreator()` to be more confusing than it's worth, so we're taking a liberty to conflate an action and it's creator.  We think it's clear from the purpose of this function that it would never actually return an action object or thunk.  If this bugs you, feel free to make your own alias.

## Reducers

#### `createReducer([config], initialState, handlers)`

Returns a redux reducer where:
 - `config` - configures the reducer to use mutable handlers when `config.mutable` is `true`.  Mutable handlers are wrapped using [immer](https://github.com/immerjs/immer)'s `produce()`.
 - `initialState` - the initial state of the reducer, or a function returning its initial state.
 - `handler` - an object containing handlers keyed by action type.

```js
const { INCREMENT, FETCH_USER } = MiddleEnd.createTypes({
    INCREMENT: MiddleEnd.type.simple,
    FETCH_USER: MiddleEnd.type.async
});

const reducer = MiddleEnd.createReducer({ mutable: true }, { value: 0 }, {
    [INCREMENT]: (draft) => {

        draft.value++;
    },
    [FETCH_USER.FAIL]: (draft) => {

        draft.value = 0;
    }
})
```

#### `createEntityReducer({ schema, shouldMerge, shouldIndex })`

Returns a redux reducer for handling normalized, id-keyed entities (e.g. from an external data source) and for indexing action results.  The resulting reducer has state of the shape `{ entities: {}, indexes: {} }`.

The `entities` branch keeps a dictionary of normalized (i.e. via normalizr) records, keyed by entity type then by record id.  The `schema` is a flat object containing normalizr entities.  Whenever an action has a payload shaped like the result of normalizr's `normalize()` function (`{ result, entities }`), the `entities` in that payload familiar to `schema` are processed into state.  The `shouldMerge` option can be `true`, `false`, or a function deciding whether to merge a given entity into the store, or to simply overwrite any records with the same id.  By default records do not merge unless they contain the property `_top: true`.

The `indexes` branch keeps a dictionary of indexes to store the status and results of any action containing an index name in `{ meta: { index } }`.  It is a flat object of indexes keyed by name, where each index has the following shape:
 - `inFlight` - the number of actions have begun per [`isTypeBegin()`](#istypebegintype), but not completed per [`isTypeSuccess()`](#istypesuccesstype) or [`isTypeFail()`](#istypefailtype).
 - `result` - The `payload` of the last successful action per [`isTypeSuccess()`](#istypesuccesstype).  If the payload appears to be the result of normalizr's `normalize()` function, then `payload.result` is stored instead.
 - `error` - The `payload` of the last action having `{ error: true }`.
 - `original` - The `meta.original` of the last failing or successful action per [`isTypeSuccess()`](#istypesuccesstype) and [`isTypeFail()`](#istypefailtype), typically containing the payload of the "beginning" action.

Indexing can be skipped by configuring `shouldIndex` to `false` or a function returning `true` or `false` given the index name.  Indexes are initialized in the store lazily, i.e. when they are first seen on an action's `meta.index` property.

Typically `entities` and `indexes` work in tandem to keep track of normalized results from an external data-source while keeping them properly normalized.

## React Bindings

#### `<Provider middleEnd={app} />`

React Context Provider component that handles providing the passed middle-end to any nested Context consumers.


It requires the following prop:

- `middleEnd` - A composed application that is set as the context value. The app must be initialized; the component throws otherwise.

```js
const StrangeMiddleEnd = require('strange-middle-end');

// const config = ... standard middle-end config e.g. input to create method

function App ({ props }) {

    const m = MiddleEnd.create(config).initialize();

    return (
        <MiddleEnd.Provider middleEnd={m}>
            {/* 
                Counter may now consume middleEnd context (see useMiddleEnd hook below) 
            */}
            <Counter />
        </MiddleEnd.Provider>
    )
}
```

#### `useMiddleEnd()`

Hook that returns the current middle-end as contextualized by the nearest parent `Provider`.
Follows the same rendering logic as [React's built-in `useContext`](https://reactjs.org/docs/hooks-reference.html#usecontext).

```js
function Counter ({ props }) {

    const m = useMiddleEnd();

    return (
        <div>
            <button onClick={() => m.dispatch.counter.increment()}>Increment</button>
        </div>
    )
}
```


If we want to subscribe to and rerender on the state changes dispatched by our button,
we can lean on react-redux, specifically its `useSelector` hook.


```js
const ReactRedux = require('react-redux');
const StrangeMiddleEnd = require('strange-middle-end');

function App ({ props }) {

    const m = MiddleEnd.create(config).initialize();

    return (
        <MiddleEnd.Provider middleEnd={m}>
            <ReactRedux.Provider store={m.store}>
                <Counter />
            </ReactRedux.Provider>
        </MiddleEnd.Provider>
    )
}

// Then back in our Counter component

const { useSelector } = require('react-redux');

function Counter ({ props }) {

    const m = useMiddleEnd();
    // Subscribe our selector to changes in our store 
    const count = useSelector(m.selectors.counter.get);

    return (
        <div>
            <p>The count is {count}</p>
            <button onClick={() => m.dispatch.counter.increment()}>Increment</button>
        </div>
    )
}
```
