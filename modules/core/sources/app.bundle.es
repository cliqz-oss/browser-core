import Promise from '../core/helpers/promise';
import App from './app';
import config from '../core/config';

global.Promise = Promise;
global.App = App;
global.config = config;
