const logger = require('../utils/logger');

module.exports = (client) => {
  const msg = `🔥 Vaxloz online: ${client.user.tag}`;
  logger.info(msg);
};
