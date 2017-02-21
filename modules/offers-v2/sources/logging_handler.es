// TODO maybe we need to move this logic to the higher level like writeFile in the
// fs (core cliqz fs).
try {
  Components.utils.import('resource://gre/modules/osfile.jsm');
} catch(e) { }
import { writeFile } from "../core/fs";
import console from '../core/console';

////////////////////////////////////////////////////////////////////////////////



var LoggingHandler = {
  //////////////////////////////////////////////////////////////////////////////
  // GLOBAL FLAGS
  //
  SAVE_TO_FILE: false,
  LOG_FILE_NAME: ['cliqz', 'offersV2', 'logging.log'],


  // nasty approach to "simulate macros :("
  LOG_ENABLED: true,

  //////////////////////////////////////////////////////////////////////////////
  // DEFINE THE ERROR CODES HERE
  //
  // no error
  ERR_NONE: 0,
  // unknown error (something very bad)
  ERR_INTERNAL: 1,
  // Backend error
  ERR_BACKEND: 2,
  // reading / writing error (local files)
  ERR_IO: 3,
  // JSON parsing error
  ERR_JSON_PARSE: 4,
  ERR_FILE_PARSE: 5,
  ERR_RULE_FILE: 6,




  //////////////////////////////////////////////////////////////////////////////
  //

  init() {
    // create the createWriteStream into a variable
    this.fileObj = null;
    this.tmpBuff = '';
    // get the full path
    var self = this;
    if (LoggingHandler.SAVE_TO_FILE) {
      try {
        const filePath = OS.Path.join(OS.Constants.Path.profileDir, ...LoggingHandler.LOG_FILE_NAME);
        let dirname = OS.Path.dirname(filePath);
        // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.File_for_the_main_thread#OS.File.exists()
        // create the directory with makeDir and catch the error if the directory exists
        OS.File.makeDir(dirname, {ignoreExisting: false}).then(() => {
          console.log('directory does not exist. Creating it...');
          OS.File.open(filePath, {write: true, append: true}).then(fileObject => {
            self.fileObj = fileObject;
          });
        }).catch(function(ee){
          console.log('directory exist. Opening the file to write and append: ');
          OS.File.open(filePath, {write: true, append: true}).then(fileObject => {
            self.fileObj = fileObject;
          });
        });
      } catch(ee) {
        // error here nasty
        console.log('something happened when trying to save the file or something: ' + ee, '[offersV2]');
      }
    }

  },

  uninit() {
    if (this.fileObj) {
      this.fileObj.flush();
      this.fileObj.close();
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  doLogging(messageType, moduleName, message, errorCode = LoggingHandler.ERR_NONE) {
    var strToLog = String(Date.now()) + ' - [offersV2][' + messageType + '][' + moduleName +']';
    if (errorCode !== LoggingHandler.ERR_NONE) {
      strToLog += '[ErrCode: ' + errorCode + ']: ';
    } else {
      strToLog += ': ';
    }
    strToLog += message + '\n';

    // log in the file if we have one
    if (this.fileObj) {
      // GR-145: logging system is not working properly, not saving all the data from the beginning
      if (this.tmpBuff) {
        let encoder = new TextEncoder();
        this.fileObj.write(encoder.encode(this.tmpBuff));
        delete this.tmpBuff;
        this.tmpBuff = null;
      }
      let encoder = new TextEncoder();
      this.fileObj.write(encoder.encode(strToLog)).catch(function(ee) {
        console.log('error logging to the file! something happened?: ' + ee, '[offersV2]');
      });
    } else {
      // GR-145: logging system is not working properly, not saving all the data from the beginning
      if (this.tmpBuff !== null) {
        this.tmpBuff += strToLog;
      }
    }
    // log to the console
    console.log(strToLog, '');
  },

  //////////////////////////////////////////////////////////////////////////////
  //                            "PUBLIC" METHODS
  //////////////////////////////////////////////////////////////////////////////

  // 3 function (one per error/log level)
  // - error()
  // - warning()
  // - info().


  error(moduleName, message, errorCode = LoggingHandler.ERR_NONE) {
    LoggingHandler.doLogging('error', moduleName, message, errorCode);
  },

  warning(moduleName, message, errorCode = LoggingHandler.ERR_NONE) {
    LoggingHandler.doLogging('warning', moduleName, message, errorCode);
  },

  info(moduleName, message) {
    LoggingHandler.doLogging('info', moduleName, message);
  },

};


export default LoggingHandler;
