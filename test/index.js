'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Immer = require('immer');
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

    it('integrates into a typical setup, avoiding circular dependencies.', async () => {

        // Required down here because it's a singleton, and we want to experience any runtime errors in this test.

        const m = require('./integration');

        expect(m.initialized).to.equal(false);

        m.initialize();

        expect(m.initialized).to.equal(true);

        const simplifyIndexErrors = Immer.produce((draft) => {

            Object.values(draft.model.indexes).forEach((index) => {

                index.error = index.error && index.error.message;
            });
        });

        expect(m.getState()).to.equal({
            counter: 1,
            model: {
                entities: { dogs: {}, people: {} },
                indexes: {}
            }
        });

        expect(m.selectors.counter.get(m.getState())).to.equal(1);

        expect(m.selectors.model.fetchPerson(m.getState())).to.not.exist();

        await m.dispatch.model.fetchPerson({ id: 10 });

        expect(m.getState()).to.equal({
            counter: 3,
            model: {
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren' },
                        21: { id: 21, name: 'Sully' }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] }
                    }
                },
                indexes: {
                    FETCH_PERSON: {
                        error: null,
                        inFlight: 0,
                        original: { id: 10 },
                        result: 10
                    }
                }
            }
        });

        expect(m.selectors.counter.get(m.getState())).to.equal(3);

        expect(m.selectors.model.fetchPerson(m.getState())).to.equal({
            id: 10,
            name: 'Marisha',
            pets: [20, 21]
        });

        await m.dispatch.model.fetchPerson({ id: 11 });

        expect(m.getState()).to.equal({
            counter: 0, // Was reset by fetchPerson.after
            model: {
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren' },
                        21: { id: 21, name: 'Sul' },
                        22: { id: 22, name: 'Guinness' }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] },
                        11: { id: 11, name: 'Cassandra', pets: [20, 21, 22] }
                    }
                },
                indexes: {
                    FETCH_PERSON: {
                        error: null,
                        inFlight: 0,
                        original: { id: 11 },
                        result: 11
                    }
                }
            }
        });

        expect(m.selectors.counter.get(m.getState())).to.equal(0);

        expect(m.selectors.model.fetchPerson(m.getState())).to.equal({
            id: 11,
            name: 'Cassandra',
            pets: [20, 21, 22]
        });

        await m.dispatch.model.fetchPerson({ id: 12 });

        expect(simplifyIndexErrors(m.getState())).to.equal({
            counter: 2,
            model: {
                entities: {
                    dogs: {
                        20: { id: 20, name: 'Ren' },
                        21: { id: 21, name: 'Sul' },
                        22: { id: 22, name: 'Guinness' }
                    },
                    people: {
                        10: { id: 10, name: 'Marisha', pets: [20, 21] },
                        11: { id: 11, name: 'Cassandra', pets: [20, 21, 22] }
                    }
                },
                indexes: {
                    FETCH_PERSON: {
                        error: 'Could not find person 12.',
                        inFlight: 0,
                        original: { id: 12 },
                        result: 11
                    }
                }
            }
        });

        expect(m.selectors.counter.get(m.getState())).to.equal(2);

        expect(m.selectors.model.fetchPerson(m.getState())).to.equal({
            id: 11,
            name: 'Cassandra',
            pets: [20, 21, 22]
        });
    });
});
