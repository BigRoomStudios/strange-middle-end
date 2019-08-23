'use strict';

const Core = require('./core');
const Actions = require('./actions');
const Types = require('./types');
const Reducers = require('./reducers');

exports.create = Core.create;

exports.middleware = Core.middleware;

exports.createAction = Actions.createAction;

exports.createTypes = Types.createTypes;

exports.type = Types.type;

exports.isTypeOfBase = Types.isTypeOfBase;

exports.isTypeBegin = Types.isTypeBegin;

exports.isTypeSuccess = Types.isTypeSuccess;

exports.isTypeFail = Types.isTypeFail;

exports.createReducer = Reducers.createReducer;

exports.createEntityReducer = Reducers.createEntityReducer;
