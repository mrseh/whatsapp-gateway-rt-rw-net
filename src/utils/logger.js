const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message) {
    return `[${this.getTimestamp()}] [${level}] ${message}`;
  }

  writeToFile(level, message) {
    const logFile = path.join(this.logsDir, `${level}.log`);
    const formattedMessage = this.formatMessage(level, message) + '\n';
    fs.appendFileSync(logFile, formattedMessage);
  }

  info(message) {
    const formatted = this.formatMessage('INFO', message);
    console.log('\x1b[36m%s\x1b[0m', formatted); // Cyan
    this.writeToFile('info', message);
  }

  success(message) {
    const formatted = this.formatMessage('SUCCESS', message);
    console.log('\x1b[32m%s\x1b[0m', formatted); // Green
    this.writeToFile('info', message);
  }

  warn(message) {
    const formatted = this.formatMessage('WARN', message);
    console.log('\x1b[33m%s\x1b[0m', formatted); // Yellow
    this.writeToFile('warn', message);
  }

  error(message, error = null) {
    const errorMsg = error ? `${message}: ${error.message}` : message;
    const formatted = this.formatMessage('ERROR', errorMsg);
    console.log('\x1b[31m%s\x1b[0m', formatted); // Red
    this.writeToFile('error', errorMsg);
    if (error && error.stack) {
      this.writeToFile('error', error.stack);
    }
  }
}

module.exports = new Logger();
