// OPTIONS:
// - logToConsole [Default: true]: log to console
// - showTimestamps [Default: true]: Add time stamps
// - howLevelIcons: Add level as icon: warn, info, etc (not implemented yet)
// NOTE:
// - logToConsole and showTimestamps can be overridden in each log call
//   as well as the history
// TODO:
// - add groups to group logs together for formatting and filtering
class Logger {

  constructor(options={}) {
    this.options = options;
    this.logToConsole = (options.logToConsole === undefined) ? true : options.logToConsole;
    this.showTimestamps = (options.showTimestamps === undefined) ? true : options.showTimestamps;
    this.showIcons = (options.showIcons === undefined) ? false : options.showIcons;
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

  break(divider="\n") {
    const logItem = { type: 'break', break: divider };
    this.logs.push(logItem);
  }

  history(options={}) {
    let text = '';
    for (const logItem of this.logs) {
      if (logItem.type === 'message') {
        text += `${this._formatMessage(logItem, options)}\n`;
      } else if (logItem.type === 'break') {
        text += logItem.break;
      }
    }
    return text;
  }

  ///////////////////////////////////////////////////////////////////////////
  // Private methods
  ///////////////////////////////////////////////////////////////////////////

  // level: warn, error, info, log
  _log(message, level, options={}) {
    const timestamp = this._formatTime(new Date());
    const logItem = { type: 'message', message, level, timestamp, icon: options.icon };
    this.logs.push(logItem);
    this._consoleMessage(logItem, options);
  }

  _consoleMessage(logItem, options={} ) {
    if (this._optionFor('logToConsole', options)) {
      console[logItem.level](this._formatMessage(logItem, options));
    }
  }

  _formatMessage(logItem, options={}) {
    let message = "";
    if (this._optionFor('showIcons', options)) {
      const icon = logItem.icon || logItem.level;
      message += this._icon(icon) + "";
    }
    if (this._optionFor('showTimestamps', options)) {
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
      timeZone: 'UTC',
      hour12: false
    });
  }

  // Return an icon for the name which may be a level or a custom icon
  // - name can be a level (e.g. log, info, warn, error), one of the other
  //   icons names (e.g. success, fail), or a custom icon (e.g. name = '🍎')
  _icon(name) {
      const icons = {
        log: '📝', info: 'ℹ️', warn: '⚠️', error: '🛑',
        success: '✅', fail: '🛑', none: ' ',
     };
     if (name) {
        return icons[name] || name;
      } else {
        return icons.none;
      }
  }

  // Return the value for the option name from the default options (provided in Logger constructor)
  // Options passed here will override the default options
  _optionFor(name, options={}) {
    if (options[name] !== undefined) {
      return options[name];
    } else {
      return this[name];
    }
  }

}

export default Logger;