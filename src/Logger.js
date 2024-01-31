// OPTIONS:
// - logToConsole [Default: true]: log to console
// - showTimestamps [Default: true]: Add time stamps
// - levelIcons: Add level as icon: warn, info, etc (not implemented yet)
// NOTE:
// - logToConsole and showTimestamps can be overridden in each log call
// TODO:
// - add groups to group logs together for formatting and filtering
class Logger {

  constructor(options={}) {
    this.options = options;
    this.logToConsole = (options.logToConsole === undefined) ? true : options.logToConsole;
    this.showTimestamps = (options.showTimestamps === undefined) ? true : options.showTimestamps;
    this.logs = [];
  }

  get count() {
    return this.logs.length;
  }

  log(message, options={}) {
    this._log(message, 'log', options);
  }

  info(message, options={}) {
    this._log(message, 'info', options);
  }

  warn(message, options={}) {
    this._log(message, 'warn', options);
  }

  error(message, options={}) {
    this._log(message, 'error', options);
  }

  history() {
    let text = '';
    for (const log of this.logs) {
      text += `[${log.timestamp}] ${log.message}\n`;
    }
    return text;
  }

  ///////////////////////////////////////////////////////////////////////////
  // Private methods
  ///////////////////////////////////////////////////////////////////////////

  // level: warn, error, info, log
  _log(message, level, options={}) {
    const timestamp = this._formatTime(new Date());
    const logItem = { message, level, timestamp };
    this.logs.push(logItem);
    this._consoleMessage(logItem, options);
  }

  _consoleMessage(logItem, options={} ) {
    if (this.logToConsole && options.logToConsole !== false) {
      console[logItem.level](this._formatMessage(logItem, options));
    }
  }

  _formatMessage(logItem, options={}) {
    let message = "";
    if (this.showTimestamps && options.showTimestamps !== false) {
      message += `[${logItem.timestamp}] `;
    }
    message += logItem.message;
    return message
  }

  // e.g. 15:30:00
  _formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

}

export default Logger;