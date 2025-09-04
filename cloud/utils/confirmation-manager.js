// Менеджер подтверждений для опасных команд
const logger = require('./logger');

class ConfirmationManager {
    constructor() {
        // Храним ожидающие подтверждения команды (sessionId -> commandData)
        this.pendingConfirmations = new Map();
        
        // Команды, требующие подтверждения
        this.dangerousCommands = [
            'shutdown_now',
            'sleep_now', 
            'empty_recycle_bin'
        ];
        
        // Специальные действия, требующие подтверждения
        this.confirmationActions = [
            'full_disk_search'
        ];
        
        // Фразы подтверждения
        this.confirmationPhrases = [
            'да',
            'подтверждаю',
            'согласен',
            'согласна',
            'выполнить',
            'делай',
            'давай'
        ];
        
        // Фразы отмены
        this.cancelPhrases = [
            'нет',
            'отмена',
            'отменить',
            'стой',
            'стоп',
            'не надо',
            'передумал',
            'передумала'
        ];
        
        // Очищаем старые подтверждения каждые 5 минут
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
    
    // Проверяет, нужно ли подтверждение для команды
    requiresConfirmation(command) {
        return this.dangerousCommands.includes(command);
    }
    
    // Проверяет, нужно ли подтверждение для действия
    requiresConfirmationForAction(action) {
        return this.confirmationActions.includes(action);
    }
    
    // Создает запрос на подтверждение
    createConfirmationRequest(sessionId, originalCommand, commandPayload, userText, actionType = null) {
        const confirmationData = {
            command: originalCommand,
            payload: commandPayload,
            userText: userText,
            timestamp: Date.now(),
            attempts: 0,
            actionType: actionType // для специальных действий типа full_disk_search
        };
        
        this.pendingConfirmations.set(sessionId, confirmationData);
        
        logger.debug('Created confirmation request', { 
            sessionId, 
            command: originalCommand, 
            actionType 
        });
        
        return this.getConfirmationMessage(originalCommand, actionType);
    }
    
    // Проверяет ответ пользователя на подтверждение
    checkConfirmationResponse(sessionId, userText) {
        const pending = this.pendingConfirmations.get(sessionId);
        if (!pending) {
            return null; // Нет ожидающих подтверждений
        }
        
        const text = userText.toLowerCase().trim();
        
        // Проверяем на отмену
        if (this.cancelPhrases.some(phrase => text.includes(phrase))) {
            this.pendingConfirmations.delete(sessionId);
            logger.info('Command cancelled by user', { sessionId, originalCommand: pending.command });
            return {
                type: 'cancelled',
                message: this.getCancelMessage()
            };
        }
        
        // Проверяем на подтверждение
        if (this.confirmationPhrases.some(phrase => text.includes(phrase))) {
            const commandToExecute = pending;
            this.pendingConfirmations.delete(sessionId);
            logger.info('Command confirmed by user', { sessionId, originalCommand: pending.command });
            return {
                type: 'confirmed',
                command: commandToExecute.command,
                payload: commandToExecute.payload,
                originalText: commandToExecute.userText
            };
        }
        
        // Увеличиваем счетчик попыток
        pending.attempts++;
        
        if (pending.attempts >= 3) {
            // После 3 попыток автоматически отменяем
            this.pendingConfirmations.delete(sessionId);
            return {
                type: 'timeout',
                message: 'Слишком много попыток. Команда отменена для безопасности.'
            };
        }
        
        // Повторяем вопрос подтверждения
        return {
            type: 'retry',
            message: this.getRetryMessage(pending.command, pending.attempts)
        };
    }
    
    // Генерирует сообщение для запроса подтверждения
    getConfirmationMessage(command, actionType = null) {
        // Специальные сообщения для действий
        if (actionType === 'full_disk_search') {
            const searchMessages = [
                '🔍 Поиск по всем дискам может занять несколько минут. Продолжить? Скажите "да" или "нет".',
                '💿 Запустить полный поиск приложения на всех дисках? Это займет время. "Да" продолжить или "нет" отменить.',
                '⏳ Глубокий поиск по компьютеру. Может быть медленным. Подтвердите "да" или отмените "нет".'
            ];
            return searchMessages[Math.floor(Math.random() * searchMessages.length)];
        }

        const messages = {
            'shutdown_now': [
                '⚠️ Вы уверены, что хотите выключить компьютер? Скажите "да" для подтверждения или "нет" для отмены.',
                '🔴 Внимание! Выключение компьютера. Подтвердите командой "да" или отмените "нет".',
                '⚡ Подтвердите выключение компьютера. Скажите "подтверждаю" или "отмена".'
            ],
            'sleep_now': [
                '😴 Перевести компьютер в спящий режим? Скажите "да" для подтверждения.',
                '💤 Подтвердите переход в спящий режим. "Да" или "нет"?',
                '🌙 Спящий режим. Подтверждаете? Скажите "да" или "отмена".'
            ],
            'empty_recycle_bin': [
                '🗑️ Очистить корзину навсегда? Файлы будут удалены безвозвратно. "Да" или "нет"?',
                '⚠️ Внимание! Полная очистка корзины. Подтвердите "да" или отмените.',
                '🔥 Безвозвратное удаление файлов из корзины. Подтверждаете?'
            ]
        };
        
        const commandMessages = messages[command] || [
            '⚠️ Потенциально опасная команда. Подтвердите выполнение.'
        ];
        
        return commandMessages[Math.floor(Math.random() * commandMessages.length)];
    }
    
    // Генерирует сообщение повторного запроса
    getRetryMessage(command, attempt) {
        if (attempt === 1) {
            return '🤔 Не совсем поняла. Скажите четко "да" для выполнения или "нет" для отмены.';
        } else {
            return `⏰ Последний шанс (попытка ${attempt}/3). "Да" выполнить или "нет" отменить.`;
        }
    }
    
    // Генерирует сообщение об отмене
    getCancelMessage() {
        const messages = [
            '✅ Команда отменена. Безопасность прежде всего!',
            '🛡️ Отменено. Лучше перестраховаться!',
            '👍 Команда не выполнена. Всё в порядке!',
            '✋ Остановлено. Правильное решение!'
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    // Очищает старые подтверждения (старше 10 минут)
    cleanup() {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 минут
        
        for (const [sessionId, data] of this.pendingConfirmations.entries()) {
            if (now - data.timestamp > maxAge) {
                this.pendingConfirmations.delete(sessionId);
                logger.debug('Cleaned up old confirmation request', { sessionId, command: data.command });
            }
        }
    }
    
    // Получает статистику подтверждений
    getStats() {
        return {
            pending: this.pendingConfirmations.size,
            dangerousCommands: this.dangerousCommands.length
        };
    }
}

// Экспортируем singleton
module.exports = new ConfirmationManager();