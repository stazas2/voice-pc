// HMAC utilities для подписи запросов
const crypto = require('crypto');

/**
 * Генерирует HMAC подпись для запроса
 * @param {string} body - JSON строка тела запроса
 * @param {string} timestamp - Unix timestamp в секундах
 * @param {string} secret - Секретный ключ
 * @returns {string} HMAC подпись в формате sha256=hash
 */
function generateSignature(body, timestamp, secret) {
    const payload = `${timestamp}.${body}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `sha256=${signature}`;
}

/**
 * Генерирует уникальный ID запроса
 * @returns {string} UUID v4
 */
function generateRequestId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Создает заголовки для безопасного запроса
 * @param {Object} payload - Объект для отправки
 * @param {string} authToken - Токен аутентификации
 * @returns {Object} Объект с заголовками и телом запроса
 */
function createSecureRequest(payload, authToken) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const requestId = generateRequestId();
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, timestamp, authToken);

    return {
        body,
        headers: {
            'Content-Type': 'application/json',
            'X-ALICE-TOKEN': authToken,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
            'X-Request-Id': requestId,
            'User-Agent': 'Voice-PC-Cloud-Function/2.0'
        }
    };
}

module.exports = {
    generateSignature,
    generateRequestId,
    createSecureRequest
};