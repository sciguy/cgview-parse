// This will be the base class for any class that has status
import Logger from '../Support/Logger.js';
import * as helpers from '../Support/Helpers.js';

export default class Status {

  // Options:
  // - logger: logger object
  // - maxLogCount: number (undefined means no limit) [Default: undefined]
  constructor(options = {}, logTitle) {

    this._options = options;

    // Logger
    this.logger = options.logger || new Logger();
    options.logger = this.logger;
    if (options.maxLogCount) {
      this.logger.maxLogCount = options.maxLogCount;
    }
    // this.logger.divider();
    if (logTitle) {
      this.logger.title(` ${logTitle} `);
    } else {
      this.logger.divider();
    }
    this.logger.info(`Date: ${new Date().toUTCString()}`);
    // this.logVersion();

    // Initialize status
    this._status = 'success'
    this._errorCodes = new Set();
  }


  /////////////////////////////////////////////////////////////////////////////
  // Properties
  /////////////////////////////////////////////////////////////////////////////

  get options() {
    return this._options;
  }

  get version() {
    return helpers.CGPARSE_VERSION;
  }

  // Parsing status
  // Should be one of: 'success', 'warnings', 'fail'
  get status() {
    return this._status;
  }

  // Parsing is successful
  get success() {
    return this.status === 'success';
  }

  // Parsing has passed with success or warnings
  get passed() {
    return this.status === 'success' || this.status === 'warnings';
  }

  // Returns an array of unique error codes
  // Codes: unknown, binary, empty, unknown_format
  get errorCodes() {
    return Array.from(this._errorCodes);
  }


  /////////////////////////////////////////////////////////////////////////////
  // Methods
  /////////////////////////////////////////////////////////////////////////////

  // Parsing has failed
  // Optional error code can be provided to help identify the error
  _fail(message, errorCode='unknown') {
    this.logger.error(message);
    this._status = 'failed';
    this._errorCodes.add(errorCode);
  }

  _warn(message) {
    this.logger.warn(message);
    if (this.status !== 'fail') {
      this._status = 'warnings';
    }
  }

  logStatusLine() {
    if (this.success) {
      this.logger.info('- Status: ', { padded: 'Success', icon: 'success' });
    } else if (this.status === 'warnings') {
      this.logger.warn('- Status: ', { padded: 'Warnings', icon: 'warn' });
    } else {
      this.logger.error('- Status: ', { padded: 'FAILED', icon: 'fail' });
    }
  }

  // logVersion() {
  //   this.logger.info(`- Version: ${this.version}`);
  // }

}