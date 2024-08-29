import Logger from '../src/Support/Logger.js';

describe('Logger', () => {

  test('- warn', () => {
    let logger = new Logger();
    logger.warn("Bob is close")
    expect(logger.logs.length).toBe(1);
    expect(logger.logs[0].level).toBe('warn');
    expect(logger.logs[0].message).toBe('Bob is close');
  });

  test('- showTimestamps default to true', () => {
    let logger = new Logger();
    expect(logger.showTimestamps).toBeTruthy();
  });

  test('- optionFor will show default value', () => {
    let logger = new Logger();
    expect(logger._optionFor('showTimestamps')).toBeTruthy();
  });

  test('- optionFor can be overridden', () => {
    let logger = new Logger();
    expect(logger._optionFor('showTimestamps', {showTimestamps: false})).toBe(false);
  });



});