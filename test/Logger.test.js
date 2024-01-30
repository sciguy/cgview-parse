import Logger from '../src/Logger.js';

describe('Logger', () => {

  test('- warn', () => {
    let logger = new Logger();
    logger.warn("Bob is close")
    expect(logger.logs.length).toBe(1);
    expect(logger.logs[0].level).toBe('warn');
    expect(logger.logs[0].message).toBe('Bob is close');
  });

});