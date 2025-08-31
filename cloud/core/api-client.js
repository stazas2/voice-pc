// HTTP клиент для отправки команд на локальный сервер
const config = require('../config/config');
const logger = require('../utils/logger');
const validator = require('../utils/validator');

function sendToPC(commandPayload) {
  return new Promise((resolve, reject) => {
    // Валидация URL сервера
    const urlValidation = validator.validateServerUrl(config.serverUrl);
    if (!urlValidation.isValid) {
      logger.error('Invalid server URL', { url: config.serverUrl, reason: urlValidation.reason });
      return reject(new Error(`Server URL error: ${urlValidation.reason}`));
    }

    // Валидация параметров команды
    const paramsValidation = validator.validateCommandParams(commandPayload.parameters);
    if (!paramsValidation.isValid) {
      logger.warn('Invalid command parameters', { params: commandPayload.parameters, reason: paramsValidation.reason });
      return reject(new Error(`Parameters error: ${paramsValidation.reason}`));
    }

    const url = require('url');
    const fullUrl = config.serverUrl + config.apiEndpoint;
    const requestData = JSON.stringify(commandPayload);
    const parsedUrl = url.parse(fullUrl);
    
    logger.debug('Sending command to PC', { url: fullUrl, command: commandPayload.command });
    
    // Выбираем нужный модуль в зависимости от протокола
    const httpModule = parsedUrl.protocol === 'https:' ? require('https') : require('http');

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'User-Agent': 'Voice-PC-Cloud-Function/1.0',
        'X-ALICE-TOKEN': config.authToken
      },
      timeout: config.timeout || 5000
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          logger.debug('PC response received', { statusCode: res.statusCode, result });
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            logger.warn('PC server error response', { statusCode: res.statusCode, data });
            reject(new Error(`Server returned status ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          logger.error('Failed to parse PC response', { data, error: error.message });
          reject(new Error('Invalid JSON response from PC'));
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

module.exports = { sendToPC };