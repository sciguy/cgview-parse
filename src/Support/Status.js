// This will be the base class for any class that has status
import Logger from '../Support/Logger.js';

export default class Status {

  // Options:
  // - logger: logger object
  // - maxLogCount: number (undefined means no limit) [Default: undefined]
  constructor(options = {}) {

    // Logger
    this.logger = options.logger || new Logger();
    options.logger = this.logger;
    if (options.maxLogCount) {
      this.logger.maxLogCount = options.maxLogCount;
    }
    this.logger.info(`Date: ${new Date().toUTCString()}`);

    // Initialize status
    this._success = true
    this._status = 'success'
    this._errorCodes = new Set();
  }


  /////////////////////////////////////////////////////////////////////////////
  // Properties
  /////////////////////////////////////////////////////////////////////////////

  // Should be one of: 'success', 'warnings', 'fail'
  get status() {
    return this._status;
  }

  get success() {
    return this.status == 'success';
  }

  get passed() {
    return this.status === 'success' || this.status === 'warnings';
  }

  // Returns an array of unique error codes
  // Codes: unknown, binary, empty, unknown_format
  get errorCodes() {
    return Array.from(this._errorCodes);
  }

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

}