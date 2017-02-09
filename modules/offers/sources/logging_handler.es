// TODO maybe we need to move this logic to the higher level like writeFile in the
// fs (core cliqz fs).
try {
  Components.utils.import('resource://gre/modules/osfile.jsm');
} catch(e) { }
// to log in console
import { utils } from 'core/cliqz';
import { writeFile } from "core/fs";

////////////////////////////////////////////////////////////////////////////////



var LoggingHandler = {
  //////////////////////////////////////////////////////////////////////////////
  // GLOBAL FLAGS
  //
  SAVE_TO_FILE: false,
  LOG_FILE_NAME: ['cliqz', 'offers', 'logging.log'],


  // nasty approach to "simulate macros :("
  LOG_ENABLED: false,

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

        // check https://developer.mozilla.org/es/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.File_for_the_main_thread#Example: Append to File
        OS.File.exists(filePath).then(exists => {
          if (!exists) {
            writeFile(filePath, (new TextEncoder()).encode('')).then(data => {
              utils.log('logging file created successfully: ', '[offers]');

              // now assign the file descriptor to it
              OS.File.open(filePath, {write: true, append: true}).then(fileObject => {
              self.fileObj = fileObject;
              }).catch(function(ee){
                utils.log('error opening the file to write and append: ' + ee, '[offers]');
              });
            }).catch(function(errMsg) {
              utils.log('error creating the file that doesnt exists: ' + errMsg, '[offers]');
            });
          } else {
            OS.File.open(filePath, {write: true, append: true}).then(fileObject => {
              self.fileObj = fileObject;
            });
          }
        });
      } catch(ee) {
        // error here nasty
        utils.log('something happened when trying to save the file or something: ' + ee, '[offers]');
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
    var strToLog = String(Date.now()) + ' - [offers][' + messageType + '][' + moduleName +']';
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
        utils.log('error logging to the file! something happened?: ' + ee, '[offers]');
      });
    } else {
      // GR-145: logging system is not working properly, not saving all the data from the beginning
      if (this.tmpBuff !== null) {
        this.tmpBuff += strToLog;
      }
    }
    // log to the console
    utils.log(strToLog, '');
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
