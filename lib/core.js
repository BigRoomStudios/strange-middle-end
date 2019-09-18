'use strict';

const Redux = require('redux');
const { schema: Schema } = require('normalizr');
const { default: ReduxThunk } = require('redux-thunk');

const internals = {};

exports.create = ({ createStore, mods = {} }) => {

    const middleEnd = {
        initialized: false,
        initialize: () => {

            if (middleEnd.initialized !== false) {
                return middleEnd;
            }

            middleEnd.initialized = null;

            // Initialize props

            middleEnd.mods;
            middleEnd.store;
            middleEnd.getState;
            middleEnd.dispatch;
            middleEnd.actions;
            middleEnd.selectors;

            // Setup any schemas

            Object.values(internals.pickEach(middleEnd.mods, 'schema'))
                .forEach((schema) => {

                    Object.values(schema)
                        .filter((item) => item instanceof Schema.Entity)
                        .forEach((entity) => {

                            entity.relatedFields = (...args) => exports.relatedFields(...args, { idAttribute: entity.idAttribute });

                            if (entity.relations) {
                                entity.define(entity.relations(schema));
                            }
                        });
                });

            // Run mod initializers

            Object.values(middleEnd.mods)
                .filter((mod) => mod && mod.initialize)
                .forEach((mod) => mod.initialize(middleEnd, mod));

            middleEnd.initialized = true;

            return middleEnd;
        }
    };

    const initializedProp = (key, initializer) => {

        Object.defineProperty(middleEnd, key, {
            configurable: true,
            enumerable: true,
            get: () => {

                if (middleEnd.initialized === false) {
                    throw new Error(`Cannot access property "${key}" until middle-end is initialized.`);
                }

                const value = initializer();

                Object.defineProperty(middleEnd, key, { value, writable: true });

                return value;
            }
        });
    };

    initializedProp('mods', () => {

        return (typeof mods === 'function') ? mods() : mods;
    });

    initializedProp('store', () => {

        const reducer = Redux.combineReducers(internals.pickEach(middleEnd.mods, 'reducer'));

        return createStore(reducer, middleEnd.mods);
    });

    initializedProp('getState', () => {

        return middleEnd.store.getState;
    });

    initializedProp('dispatch', () => {

        const dispatch = (...args) => middleEnd.store.dispatch(...args);

        // Convenient dispatch,
        // dispatch.auth.login() versus dispatch(actions.auth.login())

        Object.entries(middleEnd.actions).forEach(([modName, actions]) => {

            dispatch[modName] = {};

            Object.entries(actions).forEach(([actionName, action]) => {

                dispatch[modName][actionName] = (...args) => dispatch(action(...args));
            });
        });

        return dispatch;
    });

    initializedProp('actions', () => {

        return internals.pickEach(middleEnd.mods, 'actions');
    });

    initializedProp('selectors', () => {

        return internals.pickEach(middleEnd.mods, 'selectors');
    });

    return middleEnd;
};

exports.middleware = {
    thunk: ReduxThunk,
    errorLogger: () => {

        return (next) => {

            return (action) => {

                const { type, error, payload, meta } = action;

                if (error) {
                    console.error(`Error from action "${type}"`, meta, '\n', payload);
                }

                return next(action);
            };
        };
    }
};

exports.relatedFields = (entity, fields, { idAttribute = 'id' } = {}) => {

    const subEntity = { [idAttribute]: entity[idAttribute] };

    fields.forEach((field) => {

        if (entity.hasOwnProperty(field)) {
            subEntity[field] = entity[field];
        }
    });

    return Object.keys(subEntity).length > 1 ? subEntity : undefined;
};

// pickEach({ a: { x: 1 }, b: { x: 2, y: 3 }, c: null }, 'x') -> { a: 1, b: 2 }
internals.pickEach = (obj, prop) => {

    return Object.entries(obj)
        .filter(([, value]) => value && typeof value[prop] !== 'undefined')
        .reduce((collect, [key, value]) => ({ ...collect, [key]: value[prop] }), {});
};
