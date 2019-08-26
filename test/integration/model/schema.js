'use strict';

const { schema: { Entity } } = require('normalizr');

exports.person = new Entity('people');

exports.person.relations = ({ dog }) => ({
    pets: [dog]
});

exports.dog = new Entity('dogs');
