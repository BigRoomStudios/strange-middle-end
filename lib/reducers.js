'use strict';

const Redux = require('redux');
const Immer = require('immer');
const { schema: { Entity } } = require('normalizr');
const Types = require('./types');

const internals = {};

exports.createReducer = (config, initialState, handlers) => {

    if (typeof handlers === 'undefined') {
        handlers = initialState;
        initialState = config;
        config = {};
    }

    if (handlers.hasOwnProperty('undefined')) {
        throw new Error('Reducer has an undefined handler. Ensure that all actions used in this reducer exist.');
    }

    const { mutable = false } = config;

    if (mutable) {
        handlers = { ...handlers };
        Object.keys(handlers).forEach((key) => {

            handlers[key] = Immer.produce(handlers[key]);
        });
    }

    const initialize = (s) => {

        return (typeof s === 'function') ? s() : s;
    };

    return (state = initialize(initialState), action) => {

        if (handlers.hasOwnProperty(action.type)) {
            return handlers[action.type](state, action);
        }

        return state;
    };
};

exports.createEntityReducer = ({ schema, shouldMerge = internals.defaultShouldMerge }) => {

    return Redux.combineReducers({
        indexes: (state = {}, { type, payload, error, meta }) => {

            if (!meta || !meta.index) {
                return state;
            }

            return Immer.produce(state, (draft) => {

                const index = draft[meta.index] = draft[meta.index] || {
                    original: undefined,
                    result: undefined,
                    error: null,
                    inFlight: 0
                };

                if (Types.isTypeBegin(type)) {
                    index.inFlight++;
                    index.original = payload;
                }

                if (Types.isTypeSuccess(type) || Types.isTypeFail(type)) {
                    index.inFlight--;
                    if (meta.hasOwnProperty('original')) {
                        index.original = meta.original;
                    }
                }

                if (Types.isTypeSuccess(type)) {
                    index.error = null;
                }

                if (error) {
                    index.error = payload || true;
                }

                // TODO is this how we want it to work?
                if (payload && payload.hasOwnProperty('result')) {
                    index.result = payload.result;
                }
            });
        },
        // Keeps a dictionary of entities by key and id
        entities: (state = internals.getInitialEntityState(schema), { payload, error }) => {

            if (error || !payload || !payload.entities) {
                return state;
            }

            return Immer.produce(state, (draft) => {

                const { entities } = payload;

                Object.keys(entities).forEach((entityKey) => {

                    if (!state[entityKey]) {
                        return;
                    }

                    Object.keys(entities[entityKey]).forEach((id) => {

                        const entity = entities[entityKey][id];
                        const doMerge = (typeof shouldMerge === 'function') ?
                            shouldMerge(entity) :
                            Boolean(shouldMerge);

                        if (doMerge) {

                            draft[entityKey][id] = draft[entityKey][id] || {};

                            // Preserve parts of an entity we've seen in past actions, but not this one
                            // We'll use forEach because Object.assign would set those aforementioned parts to undefined

                            Object.entries(entity).forEach(([key, val]) => {

                                if (typeof val !== 'undefined') {
                                    draft[entityKey][id][key] = val;
                                }
                            });
                        }
                        else {
                            draft[entityKey][id] = entity;
                        }
                    });
                });
            });
        }
    });
};

internals.defaultShouldMerge = (entity) => Boolean(entity._top);

internals.getInitialEntityState = (schema) => {

    return Object.values(schema)
        .filter((entity) => entity instanceof Entity)
        .reduce((collect, entity) => ({
            ...collect,
            [entity.key]: {}
        }), {});
};