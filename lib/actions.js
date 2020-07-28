'use strict';

const Normalizr = require('normalizr');

const internals = {};

exports.createAction = (actionTypes, config) => {

    if (typeof actionTypes === 'string') {
        return internals.simpleAction(actionTypes, config);
    }

    return internals.asyncAction(actionTypes, config);
};

internals.simpleAction = (actionType, config = {}) => {

    if (typeof config === 'function') {
        config = { transform: config };
    }

    const {
        transform = internals.defaultTransform
    } = config;

    return (...args) => ({
        type: actionType,
        payload: transform(...args)
    });
};

internals.asyncAction = (actionTypes, config = {}) => {

    if (typeof config === 'function') {
        config = { handler: config };
    }

    const {
        handler = internals.defaultTransform,
        transform = internals.defaultTransform,
        after,
        schema,
        index: indexed = false
    } = config;

    return (...args) => {

        return async (dispatch) => {

            const beginPayload = transform(...args);
            const computedArgs = ([].concat(beginPayload));
            const index = (() => {

                if (!indexed) {
                    return null;
                }

                if (typeof indexed === 'string') {
                    return indexed;
                }

                if (typeof indexed === 'function') {
                    return indexed(...computedArgs);
                }

                return actionTypes.BASE;
            })();

            try {

                dispatch({
                    type: actionTypes.BEGIN,
                    payload: beginPayload,
                    meta: {
                        index
                    }
                });

                let successPayload = await handler(...computedArgs);

                if (schema) {
                    successPayload = Normalizr.normalize(successPayload, schema);
                }

                dispatch({
                    type: actionTypes.SUCCESS,
                    payload: successPayload,
                    meta: {
                        original: beginPayload,
                        index
                    }
                });

                // after will possibly fire async

                if (after) {
                    after({
                        original: beginPayload,
                        result: successPayload
                    });
                }

                return [null, successPayload];
            }
            catch (errObj) {

                const error = internals.ensureError(errObj);

                dispatch({
                    type: actionTypes.FAIL,
                    payload: error,
                    error: true,
                    meta: {
                        original: beginPayload,
                        index
                    }
                });

                return [error];
            }
        };
    };
};

internals.defaultTransform = (...args) => {

    if (args.length <= 1) {
        return Array.isArray(args[0]) ? [args[0]] : args[0];
    }

    return args;
};

internals.ensureError = (obj) => {

    if (obj instanceof Error) {
        return obj;
    }

    const error = new Error(obj.message);
    error.data = obj;

    return error;
};
