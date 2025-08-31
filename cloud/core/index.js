// Главная функция для Yandex Cloud Functions
const { parseUserCommand, saveCommand } = require('../parsers/command-parser');
const { sendToPC } = require('./api-client');
const { generateResponse } = require('./response-generator');
const logger = require('../utils/logger');
const validator = require('../utils/validator');
const rateLimiter = require('../utils/rate-limiter');

module.exports.handler = async (event, context) => {
    const startTime = Date.now();
    
    try {
        // Валидация запроса
        const validation = validator.validateAliceRequest(event);
        if (!validation.isValid) {
            logger.warn('Invalid request received', { error: validation.error });
            return {
                response: {
                    text: "Некорректный запрос",
                    end_session: false
                },
                version: '1.0'
            };
        }

        const req = validation.data;
        const userText = req.request?.command || '';
        const sessionId = req.session?.session_id || 'unknown';
        const userId = req.session?.user_id || 'unknown';

        // Rate limiting
        const limitCheck = rateLimiter.checkLimit(userId);
        if (!limitCheck.allowed) {
            logger.warn('Rate limit exceeded', { userId, remaining: limitCheck.remaining });
            return {
                response: {
                    text: "Слишком много запросов. Попробуйте через минуту.",
                    end_session: false
                },
                version: '1.0'
            };
        }

        logger.info('Processing command', { userText, sessionId, userId });

        // Парсим команду пользователя с учётом контекста
        const commandPayload = parseUserCommand(userText, sessionId);
        logger.debug('Command mapped', { commandPayload });

        // Валидация команды
        const commandValidation = validator.validateCommand(commandPayload.command, userText);
        if (!commandValidation.isValid) {
            logger.warn('Command validation failed', { 
                command: commandPayload.command, 
                reason: commandValidation.reason 
            });
            return {
                response: {
                    text: "Не понимаю эту команду. Попробуйте другую.",
                    end_session: false
                },
                version: '1.0'
            };
        }

        // Отправляем на локальный сервер
        const result = await sendToPC(commandPayload);
        logger.debug('PC response received', { result });

        // Сохраняем команду в контекст
        saveCommand(sessionId, userText, commandPayload, result);

        // Логируем выполнение команды
        const responseTime = Date.now() - startTime;
        logger.logCommand(commandPayload.command, userText, result.success, responseTime);

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