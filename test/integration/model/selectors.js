'use strict';

const { FETCH_PERSON } = require('./action-types');

exports.fetchPerson = ({ model }) => {

    const { result: id } = model.indexes[FETCH_PERSON.BASE] || {};
    const { people: { [id]: person } } = model.entities;

    return person;
};
