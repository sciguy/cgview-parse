import Logger from '../Support/Logger.js';
import * as helpers from '../Support/Helpers.js';

 /**
   * Base class for FeatureFile, SequenceFile, FeatureBuilder, CGViewBuilder
   * - Provides logging and status tracking
   * 
   * The status can be one of:
   * - 'success':  parsing/building was successful
   * - 'warnings': parsing/building was successful with warnings (can still proceed)
   * - 'failed':   parsing/building failed (cannot proceed)
   *
   * Using the methods _fail() and _warn() will set the status accordingly
   * - Once the status is set to 'failed', it cannot be changed
   *
   * Error codes can be provided to keep track of the type of errors
   * - Error codes can be provided as options to _fail() and _warn()
   * - They can also be added with the addErrorCode() method
   * - The errorCodes property returns an array of unique error codes
   * - To check if a specific error code is present, use the hasErrorCode(ERROR_CODE) method
   * - allowed error codes are set with the static property ERROR_CODES and are all lowercase
   *
   * @param {Object} Options - passed to logger
   *   - logger: logger object
   *   - maxLogCount: number (undefined means no limit) [Default: undefined]
   */
export default class Status {

  // constructor(options = {}, logTitle) {
  constructor(options = {}) {

    this._options = options;

    // Logger
    this.logger = options.logger || new Logger();
    options.logger = this.logger;
    if (options.maxLogCount) {
      this.logger.maxLogCount = options.maxLogCount;
    }
    // this.logger.divider();
    // if (logTitle) {
    //   this.logger.title(` ${logTitle} `);
    // } else {
    //   this.logger.divider();
    // }
    // this._info(`Date: ${new Date().toUTCString()}`);
    // this.logVersion();

    // Initialize status
    this._status = 'success'
    this._errorCodes = new Set();
  }

  static get ERROR_CODES() {
    return ['unknown', 'binary', 'empty', 'unknown_format', 'parsing', 'validating'];
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
  // Should be one of: 'success', 'warnings', 'failed'
  get status() {
    return this._status;
  }

  // Parsing is successful (No errors or warnings)
  // This can be confusing because it doesn't includes warnings use passed instead
  // get success() {
  //   return this.status === 'success';
  // }

  // Parsing has passed with success or warnings
  get passed() {
    return this.status === 'success' || this.status === 'warnings';
  }

  // Returns an array of unique error codes
  // See Status.ERROR_CODES for allowed error codes
  get errorCodes() {
    return Array.from(this._errorCodes);
  }


  /////////////////////////////////////////////////////////////////////////////
  // Methods
  /////////////////////////////////////////////////////////////////////////////

  // See Status.ERROR_CODES for allowed error codes
  addErrorCode(errorCode) {
    if (!Status.ERROR_CODES.includes(errorCode)) {
      this._fail(`Invalid error code: ${errorCode}`);
      return;
    }
    this._errorCodes.add(errorCode);
  }

  hasErrorCode(errorCode) {
    return this._errorCodes.has(errorCode);
  }

  // Alias for logger.info()
  _info(message, options={}) {
    this.logger.info(message, options);
  }

  // Parsing has failed
  // Optional error code can be provided to help identify the error
  // _fail(message, errorCode='unknown') {
  _fail(message, options={}) {
    this.logger.error(message, options);
    this._status = 'failed';
    // TODO: consider keeping error codes in Logger
    const errorCode = options.errorCode || 'unknown';
    this.addErrorCode(errorCode);
  }

  _warn(message, options={}) {
    this.logger.warn(message, options);
    if (this.status !== 'failed') {
      this._status = 'warnings';
    }
  }

  // Header with option title following by the date and time
  logHeader(title) {
    if (title) {
      this.logger.title(` ${title} `);
    } else {
      this.logger.divider();
    }
    this._info(`Date: ${new Date().toUTCString()}`);
  }

  logStatusLine() {
    if (this.status === 'success') {
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