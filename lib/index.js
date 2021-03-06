'use strict';

const Core = require('./core');
const Actions = require('./actions');
const Types = require('./types');
const Reducers = require('./reducers');
const ReactBindings = require('./react');

exports.create = Core.create;

exports.middleware = Core.middleware;

exports.relatedFields = Core.relatedFields;

exports.createAction = Actions.createAction;

exports.createTypes = Types.createTypes;

exports.type = Types.type;

exports.isTypeOfBase = Types.isTypeOfBase;

exports.isTypeBegin = Types.isTypeBegin;

exports.isTypeSuccess = Types.isTypeSuccess;

exports.isTypeFail = Types.isTypeFail;

exports.createReducer = Reducers.createReducer;

exports.createEntityReducer = Reducers.createEntityReducer;

exports.Provider = ReactBindings.Provider;

exports.useMiddleEnd = ReactBindings.useMiddleEnd;
