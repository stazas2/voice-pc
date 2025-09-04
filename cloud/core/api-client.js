// HTTP клиент для отправки команд на локальный сервер
const config = require('../config/config');
const logger = require('../utils/logger');
const validator = require('../utils/validator');
const { createSecureRequest } = require('../utils/hmac');

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
    const parsedUrl = url.parse(fullUrl);
    
    // Создаем безопасный запрос с HMAC подписью
    const secureRequest = createSecureRequest(commandPayload, config.authToken);
    
    logger.debug('Sending secure command to PC', { url: fullUrl, command: commandPayload.command });
    
    // Выбираем нужный модуль в зависимости от протокола
    const httpModule = parsedUrl.protocol === 'https:' ? require('https') : require('http');

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        ...secureRequest.headers,
        'Content-Length': Buffer.byteLength(secureRequest.body)
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
          } else if (result && result.needsConfirmation) {
            // Специальный случай: запрос подтверждения не является ошибкой
            logger.info('PC server requests confirmation', { 
              statusCode: res.statusCode, 
              action: result.confirmationAction 
            });
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
    req.write(secureRequest.body);
    req.end();
  });
}

module.exports = { sendToPC };