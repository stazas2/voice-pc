// Простой логгер для Cloud Function
const config = require('../config/config.js');

class Logger {
    constructor() {
        this.logLevel = config.logLevel || 'info';
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }
    
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.logLevel];
    }
    
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    }
    
    debug(message, meta = {}) {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, meta));
        }
    }
    
    info(message, meta = {}) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, meta));
        }
    }
    
    warn(message, meta = {}) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }
    
    error(message, meta = {}) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, meta));
        }
    }
    
    // Специальный метод для логирования команд
    logCommand(command, userText, success, responseTime) {
        this.info('Command executed', {
            command,
            userText,
            success,
            responseTime: `${responseTime}ms`,
            timestamp: Date.now()
        });
    }
    
    // Логирование ошибок с деталями
    logError(error, context = {}) {
        this.error(`Error occurred: ${error.message}`, {
            error: error.name,
            stack: error.stack,
            context
        });
    }
}

// Экспортируем singleton
module.exports = new Logger();