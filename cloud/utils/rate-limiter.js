// Простой rate limiter для Cloud Function
const config = require('../config/config.js');

class RateLimiter {
    constructor() {
        this.requests = new Map(); // userId -> { count, resetTime }
        this.maxRequests = config.security?.rateLimit || 60; // запросов в минуту
        this.windowMs = 60 * 1000; // окно в 1 минуту
        
        // Очистка старых записей каждые 5 минут
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
    
    // Проверка лимита для пользователя
    checkLimit(userId) {
        const now = Date.now();
        const userRequests = this.requests.get(userId);
        
        // Если пользователя нет в кеше, создаем запись
        if (!userRequests) {
            this.requests.set(userId, {
                count: 1,
                resetTime: now + this.windowMs
            });
            return {
                allowed: true,
                remaining: this.maxRequests - 1,
                resetTime: now + this.windowMs
            };
        }
        
        // Если окно времени прошло, сбрасываем счетчик
        if (now > userRequests.resetTime) {
            this.requests.set(userId, {
                count: 1,
                resetTime: now + this.windowMs
            });
            return {
                allowed: true,
                remaining: this.maxRequests - 1,
                resetTime: now + this.windowMs
            };
        }
        
        // Проверяем лимит
        if (userRequests.count >= this.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: userRequests.resetTime,
                retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
            };
        }
        
        // Увеличиваем счетчик
        userRequests.count++;
        this.requests.set(userId, userRequests);
        
        return {
            allowed: true,
            remaining: this.maxRequests - userRequests.count,
            resetTime: userRequests.resetTime
        };
    }
    
    // Очистка устаревших записей
    cleanup() {
        const now = Date.now();
        for (const [userId, data] of this.requests.entries()) {
            if (now > data.resetTime + this.windowMs) {
                this.requests.delete(userId);
            }
        }
    }
    
    // Получение статистики
    getStats() {
        return {
            totalUsers: this.requests.size,
            maxRequests: this.maxRequests,
            windowMs: this.windowMs,
            users: Array.from(this.requests.entries()).map(([userId, data]) => ({
                userId: userId.substring(0, 8) + '...', // Частично скрываем ID
                count: data.count,
                resetTime: new Date(data.resetTime).toISOString()
            }))
        };
    }
    
    // Сброс лимита для пользователя (для админ функций)
    resetUser(userId) {
        this.requests.delete(userId);
    }
    
    // Полный сброс всех лимитов
    resetAll() {
        this.requests.clear();
    }
}

// Экспортируем singleton
module.exports = new RateLimiter();