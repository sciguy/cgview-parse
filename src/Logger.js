class Logger {

  // TODO:
  // - add groups to group logs
  constructor() {
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

  // level: warn, error, info, log
  _log(message, level, options={}) {
    const timestamp = this.formatTime(new Date());
    this.logs.push({ message, level, timestamp });
    console[level](`[${timestamp}] ${message}`);
  }

  // 15:30:00
  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

}

export default Logger;