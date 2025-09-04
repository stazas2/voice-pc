// Главная функция для Yandex Cloud Functions
const { parseUserCommand, saveCommand } = require('./parsers/command-parser');
const { sendToPC } = require('./core/api-client');
const { generateResponse } = require('./core/response-generator');
const logger = require('./utils/logger');
const validator = require('./utils/validator');
const rateLimiter = require('./utils/rate-limiter');
const confirmationManager = require('./utils/confirmation-manager');

module.exports.handler = async (event, context) => {
    const startTime = Date.now();
    let sessionId = 'unknown';  // Объявляем заранее для использования в catch
    let userId = 'unknown';
    
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
        const userText = req.request?.original_utterance || '';
        sessionId = req.session?.session_id || 'unknown';  // Присваиваем значение
        userId = req.session?.user_id || 'unknown';

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

        // Сначала проверяем, ожидается ли подтверждение команды
        const confirmationResult = confirmationManager.checkConfirmationResponse(sessionId, userText);
        if (confirmationResult) {
            if (confirmationResult.type === 'confirmed') {
                // Пользователь подтвердил команду/действие
                logger.info('Executing confirmed action', { 
                    sessionId, 
                    command: confirmationResult.command,
                    actionType: confirmationResult.actionType 
                });
                
                let commandToSend;
                
                // Для специальных действий создаём команду
                if (confirmationResult.command === 'full_disk_search') {
                    commandToSend = {
                        command: 'full_disk_search',
                        appName: confirmationResult.payload.appName
                    };
                } else {
                    // Обычные команды
                    commandToSend = confirmationResult.payload;
                }
                
                const result = await sendToPC(commandToSend);
                const responseTime = Date.now() - startTime;
                logger.logCommand(confirmationResult.command, confirmationResult.originalText, result.ok, responseTime);
                
                const responseText = generateResponse(commandToSend, result, confirmationResult.originalText);
                return {
                    response: {
                        text: responseText,
                        tts: responseText,
                        end_session: false
                    },
                    version: '1.0'
                };
            } else {
                // Отмена, повтор или таймаут
                return {
                    response: {
                        text: confirmationResult.message,
                        tts: confirmationResult.message,
                        end_session: false
                    },
                    version: '1.0'
                };
            }
        }

        // Парсим команду пользователя с учётом контекста
        const commandPayload = parseUserCommand(userText, sessionId);
        logger.debug('Command mapped', { commandPayload });

        // Проверяем на неизвестную команду
        if (commandPayload.command === 'unknown_command') {
            logger.info('Unknown command received', { userText, sessionId });
            const responseText = generateResponse(commandPayload, { ok: true }, userText);
            return {
                response: {
                    text: responseText,
                    end_session: false
                },
                version: '1.0'
            };
        }

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

        // Проверяем, нужно ли подтверждение для этой команды
        if (confirmationManager.requiresConfirmation(commandPayload.command)) {
            const confirmationMessage = confirmationManager.createConfirmationRequest(
                sessionId, 
                commandPayload.command, 
                commandPayload, 
                userText
            );
            
            logger.info('Requesting confirmation for dangerous command', { 
                sessionId, 
                command: commandPayload.command 
            });
            
            return {
                response: {
                    text: confirmationMessage,
                    tts: confirmationMessage,
                    end_session: false
                },
                version: '1.0'
            };
        }

        // Отправляем на локальный сервер
        const result = await sendToPC(commandPayload);
        logger.debug('PC response received', { result });

        // Проверяем, нужно ли подтверждение
        if (result.needsConfirmation && result.confirmationAction) {
            logger.info('Command requires confirmation', {
                action: result.confirmationAction,
                data: result.confirmationData
            });
            
            // Создаём запрос подтверждения
            const confirmationMessage = confirmationManager.createConfirmationRequest(
                sessionId,
                result.confirmationAction, // full_disk_search
                result.confirmationData,   // { appName: '...' }
                userText,
                result.confirmationAction  // actionType
            );
            
            return {
                response: {
                    text: confirmationMessage,
                    tts: confirmationMessage,
                    end_session: false
                },
                version: '1.0'
            };
        }

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
        logger.error('Handler error occurred', { 
            sessionId, 
            userId, 
            error: error.message, 
            stack: error.stack 
        });

        // Случайный ответ об ошибке из конфигурации
        const config = require('./config/config');
        const errors = config.responses.error;
        const errorText = errors[Math.floor(Math.random() * errors.length)];

        return {
            response: {
                text: errorText,
                end_session: false
            },
            version: '1.0'
        };
    }
};