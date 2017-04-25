import utils from "core/utils";
import events from "core/events";
import ABTests from "core/ab-tests";
import HistoryManager from "core/history-manager";
import { isMobile } from "core/platform";

export default class {

  constructor(settings) {
  	this.window = settings.window;
    this.actions = {
      addClassToWindow: this.addClassToWindow.bind(this),
      removeClassFromWindow: this.removeClassFromWindow.bind(this)
    }
  }

  init() {
    // expose globals
    this.window.CliqzUtils = utils;
    this.window.CliqzEvents = events;
    this.window.CliqzHistoryManager = HistoryManager;
    // Do not wait for AB to load
    if (!isMobile) {
      ABTests.check();
    }
  }

  unload() {
    delete this.window.CliqzUtils;
    delete this.window.CliqzEvents;
    delete this.window.CliqzHistoryManager;
  }

  addClassToWindow() {
    var args = [].slice.call(arguments);
    var mainWindow = this.window.document.getElementById('main-window');
    args.forEach(function(aClass) {
      mainWindow.classList.add(aClass);
    });
  }

  removeClassFromWindow() {
    var args = [].slice.call(arguments);
    var mainWindow = this.window.document.getElementById('main-window');
      args.forEach(function(aClass) {
        mainWindow.classList.remove(aClass);
      });
  }
}
