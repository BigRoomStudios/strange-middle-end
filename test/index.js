'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const MiddleEnd = require('../lib');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

describe('StrangeMiddleEnd', () => {

    it('exports all utilities.', () => {

        expect(Object.keys(MiddleEnd)).to.only.contain([
            'create',
            'middleware',
            'relatedFields',
            'createAction',
            'createTypes',
            'type',
            'isTypeOfBase',
            'isTypeBegin',
            'isTypeSuccess',
            'isTypeFail',
            'createReducer',
            'createEntityReducer'
        ]);
    });
});
