// OPTIONS:
// - logToConsole [Default: true]: log to console
// - showTimestamps [Default: true]: Add time stamps
// - showIcons: Add level as icon: warn, info, etc
// - maxLogCount: Maximum number of similar log messages to keep
// - lineLength: Number of characters to pad each line [Default: 48]
//   - lines are not wrapped
//   - this is for dividers and padded text
// NOTE:
// - logToConsole and showTimestamps can be overridden in each log call
//   as well as the history
// TODO:
// - add groups to group logs together for formatting and filtering
// Logging levels: log, info, warn, error
// Log messages can be a simgle message or an array of messages
// - When an array of messages is provided, if the count is more than maxLogCount
//   then only the first maxLogCount messages are shown.
class Logger {

  constructor(options={}) {
    this.options = options;
    this.logToConsole = (options.logToConsole === undefined) ? true : options.logToConsole;
    this.showTimestamps = (options.showTimestamps === undefined) ? true : options.showTimestamps;
    this.showIcons = (options.showIcons === undefined) ? false : options.showIcons;
    this.maxLogCount = (options.maxLogCount === undefined) ? false : options.maxLogCount;
    this.lineLength = options.lineLength || 48;
    this.logs = [];
  }

  get count() {
    return this.logs.length;
  }

  log(messages, options={}) {
    this._log(messages, 'log', options);
  }

  info(messages, options={}) {
    this._log(messages, 'info', options);
  }

  warn(messages, options={}) {
    this._log(messages, 'warn', options);
  }

  error(messages, options={}) {
    this._log(messages, 'error', options);
  }

  // Add a diver to the logs (e.g. a line of dashes)
  // divider: the character to use for the divider
  divider(divider="-") {
    const line = divider.repeat(this.lineLength) + '\n';
    const logItem = { type: 'break', break: line };
    this.logs.push(logItem);
  }

  // Add a break to the logs (e.g. a a return or a line of text)
  break(divider="\n") {
    const logItem = { type: 'break', break: divider };
    this.logs.push(logItem);
  }

  title(title, paddingChar = '-') {
    const length = this.lineLength;
    let text = title + '\n';
    if (title.length < length) {
      const totalPadding = length - title.length;
      const paddingLeft = Math.floor(totalPadding / 2);
      const paddingRight = totalPadding - paddingLeft;
      text = paddingChar.repeat(paddingLeft) + title + paddingChar.repeat(paddingRight) + "\n";
    }
    this.break(text);
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

  // - messages: a single message or an array of messages
  // - level: warn, error, info, log
  // - options:
  //   - logToConsole, showTimestamps, showIcons, maxLogCount, lineLength: override default options (see constructor)
  //   - padded: text or number that should be padded to the right of each line (based on lineLength)
  _log(messages, level, options={}) {
    const timestamp = this._formatTime(new Date());
    messages = (Array.isArray(messages)) ? messages : [messages];
    const maxLogCount = this._optionFor('maxLogCount', options);
    let messageLimitReached;
    for (const [index, message] of messages.entries()) {
      if (maxLogCount && index >= maxLogCount && index !== messages.length - 1) {
        const listPadding = messages[0].match(/^\s*/)[0];
        messageLimitReached = `${listPadding}- Only showing first ${maxLogCount}: ${messages.length - maxLogCount} more not shown (${messages.length.toLocaleString()} total)`;
      }
      const logItem = { type: 'message', message: (messageLimitReached || message), level, timestamp, icon: options.icon, padded: options.padded };
      this.logs.push(logItem);
      this._consoleMessage(logItem, options);
      if (messageLimitReached) { break; }
    }
    // const logItem = { type: 'message', messages, level, timestamp, icon: options.icon };
    // this.logs.push(logItem);
    // this._consoleMessage(logItem, options);
  }

  _consoleMessage(logItem, options={} ) {
    if (this._optionFor('logToConsole', options)) {
      console[logItem.level](this._formatMessage(logItem, options));
    }
  }

  _formatMessage(logItem, options={}) {
    let message = "";
    const showTimestamps = this._optionFor('showTimestamps', options);
    // Icons
    const showIcons = this._optionFor('showIcons', options);
    if (showIcons) {
      const icon = logItem.icon || logItem.level;
      message += this._icon(icon) + (showTimestamps ? '' : ' ');
    }
    // Timestamp
    if (showTimestamps) {
      message += `[${logItem.timestamp}] `;
    }
    // Message
    message += logItem.message;
    // Padded Text
    if (logItem.padded !== undefined) {
      const lineLength = this._optionFor('lineLength', options);
      let padding = lineLength - message.length;
      // Weirdness with emoji lengths. Adjust as needed.
      if (showIcons && logItem.icon == 'success') {
        padding = padding - 1;
      }
      const paddedText = `${logItem.padded.toLocaleString().padStart(padding)}`;
      message += paddedText;
    }

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