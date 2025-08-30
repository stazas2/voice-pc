// HTTP клиент для отправки команд на локальный сервер
const { WEBHOOK_URL, ALICE_TOKEN } = require('./config');

function sendToPC(commandPayload) {
  return new Promise((resolve, reject) => {
    const url = require('url');
    const requestData = JSON.stringify(commandPayload);
    const parsedUrl = url.parse(WEBHOOK_URL);
    
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
        'X-ALICE-TOKEN': ALICE_TOKEN
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

module.exports = { sendToPC };