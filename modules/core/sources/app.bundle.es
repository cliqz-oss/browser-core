import Promise from '../core/helpers/promise';
import { debugModules } from '../platform/globals';
import App from './app';
import utils from '../core/utils';
import config from '../core/config';

global.Promise = Promise;
global.App = App;
global.App.debugModules = debugModules;
global.CliqzUtils = utils;
global.config = config;
