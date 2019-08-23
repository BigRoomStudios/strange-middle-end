'use strict';

exports.type = {
    async: { isAsync: true },
    simple: { isSimple: true }
};

exports.createTypes = (prefix, config) => {

    if (!config) {
        config = prefix;
        prefix = null;
    }

    prefix = prefix ? `${prefix}/` : '';

    return Object.entries(config).reduce((collect, [name, type]) => {

        const base = `${prefix}${name}`;

        if (type.isAsync) {
            return {
                ...collect,
                [name]: {
                    BASE: base,
                    BEGIN: `${base}/BEGIN`,
                    SUCCESS: `${base}/SUCCESS`,
                    FAIL: `${base}/FAIL`
                }
            };
        }

        if (type.isSimple || type === true) {
            return {
                ...collect,
                [name]: base
            };
        }

        return {
            ...collect,
            [name]: type
        };
    }, {});
};

exports.isTypeOfBase = (type, base) => type.startsWith(`${base}/`) || (type === base);

exports.isTypeBegin = (type) => type.endsWith('/BEGIN');

exports.isTypeSuccess = (type) => type.endsWith('/SUCCESS');

exports.isTypeFail = (type) => type.endsWith('/FAIL');
