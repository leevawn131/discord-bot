const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function writeLog(filename, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(path.join(logsDir, filename), logMessage, 'utf8');
}

module.exports = {
  info: (msg) => writeLog('interaction.log', `[INFO] ${msg}`),
  error: (msg, err) => writeLog('error.log', `[ERROR] ${msg} ${err ? (err.stack || err) : ''}`),
};
