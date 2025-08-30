// Главная функция для Yandex Cloud Functions
const { parseUserCommand } = require('./command-parser');
const { sendToPC } = require('./api-client');
const { generateResponse } = require('./response-generator');

module.exports.handler = async (event, context) => {
    const req = event;
    const userText = req.request?.command || '';
    const sessionId = req.session?.session_id || 'unknown';

    console.log(`[${sessionId}] User said: "${userText}"`);

    try {
        // Парсим команду пользователя
        const commandPayload = parseUserCommand(userText);
        console.log(`[${sessionId}] Mapped to:`, commandPayload);

        // Отправляем на локальный сервер
        const result = await sendToPC(commandPayload);
        console.log(`[${sessionId}] PC response:`, result);

        // Генерируем ответ для Алисы
        const responseText = generateResponse(commandPayload, result, userText);

        return {
            response: {
                text: responseText,
                tts: responseText,
                end_session: false
            },
            version: '1.0'
        };

    } catch (error) {
        console.error(`[${sessionId}] Error:`, error);

        return {
            response: {
                text: 'Сервер недоступен. Проверьте подключение к компьютеру.',
                tts: 'Сервер недоступен.',
                end_session: false
            },
            version: '1.0'
        };
    }
};