'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const MiddleEnd = require('../lib');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

describe('Types', () => {

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
});
