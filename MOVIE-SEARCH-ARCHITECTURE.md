# 🎬 Архитектура поиска фильмов Voice PC

## 🔄 Поток выполнения команды

```
Алиса → Cloud Function → Local Server → Kinopoisk API → Browser
```

## 📁 Критические файлы для обновления

### 1️⃣ **Локальный сервер (TypeScript)**
- `src/types.ts` - интерфейсы и типы команд
- `src/validators.ts` - валидация параметров Zod
- `src/commands.ts` - логика выполнения `find_movie`
- `src/kinopoisk-adapter.ts` - работа с API, NLU парсинг

### 2️⃣ **Cloud функция (JavaScript)**
- `cloud/parsers/nlp-parser.js` - **КЛЮЧЕВОЙ ФАЙЛ!** Распознавание команд Алисы
- `cloud/config/command-mappings.js` - статичные фразы → команды
- `cloud/utils/validator.js` - разрешённые команды
- `cloud/core/response-generator.js` - ответы Алисы

## ⚡ КРИТИЧНЫЕ МОМЕНТЫ

### 🚨 NLP Parser - главный узел
**Файл:** `cloud/parsers/nlp-parser.js`

**Проблема:** Новые типы команд НЕ РАБОТАЮТ, если не добавить паттерны в `intentPatterns.find_movie`

**Решение:** Всегда обновлять ОБА места:
1. **Regex паттерны** в `intentPatterns.find_movie[]`
2. **Логику обработки** в `processMovieIntent()`

### 📝 Пример добавления новой возможности

**Хочу добавить:** "найди ужастик 2020 года"

**Нужно обновить:**

1. **Паттерн** (добавить в `intentPatterns.find_movie`):
```javascript
/^(?:найди|покажи)\s+(.+?)\s+(\d{4})\s+года?$/i
```

2. **Обработку** (в `processMovieIntent`):
```javascript
// Проверка на год в конце
const yearMatch = fullText.match(/(.+?)\s+(\d{4})\s+года?$/i);
if (yearMatch) {
    const genre = yearMatch[1].trim();
    const year = parseInt(yearMatch[2]);
    return {
        command: 'find_movie',
        movieTitle: '',
        genre: normalizeGenre(genre),
        movieYear: year
    };
}
```

## 🛠 Алгоритм добавления новых команд

### Шаг 1: Анализ
- Какие фразы должна понимать Алиса?
- Какие параметры извлекать? (жанр, год, сезон, рейтинг)
- Как это должно работать в итоге?

### Шаг 2: Local Server (если нужны новые параметры)
1. `src/types.ts` - добавить поля в `CommandRequest`
2. `src/validators.ts` - добавить валидацию Zod
3. `src/commands.ts` - обновить логику для `find_movie`
4. `src/kinopoisk-adapter.ts` - обработка в API функциях

### Шаг 3: Cloud Function (обязательно!)
1. **`cloud/parsers/nlp-parser.js`:**
   - Добавить regex в `intentPatterns.find_movie`
   - Обновить `processMovieIntent()` под новые паттерны
2. `cloud/config/command-mappings.js` - статичные фразы
3. `cloud/utils/validator.js` - если новая команда
4. `cloud/core/response-generator.js` - новые ответы

### Шаг 4: Тестирование
1. **Local API test:**
```bash
curl -X POST "http://localhost:3001/command" \
  -H "Content-Type: application/json" \
  -H "X-ALICE-TOKEN: VoicePC_SecureToken_2024_abcd1234efgh5678" \
  -d '{"command":"find_movie",...}'
```

2. **Cloud function test:** развернуть и протестировать через Алису

## 🎯 Типы поиска фильмов

### 1. Базовый поиск
**Команды:** "найди фильм матрица"
**Параметры:** `movieTitle`, `movieYear?`, `movieType?`

### 2. Сезоны/эпизоды  
**Команды:** "включи во все тяжкие третий сезон вторую серию"
**Параметры:** `movieTitle`, `season`, `episode?`, `movieType: 'series'`

### 3. Фильтрованный поиск
**Команды:** "подбери хороший боевик"
**Параметры:** `genre`, `ratingMin`, `yearMin?`, `yearMax?`

## 🚨 Частые ошибки

### ❌ "Unknown command received" 
**Причина:** Не добавлен паттерн в `nlp-parser.js`
**Решение:** Добавить regex в `intentPatterns.find_movie`

### ❌ "Validation error: unrecognized keys"
**Причина:** Параметр есть в TypeScript, но нет в `validators.ts`
**Решение:** Синхронизировать типы и валидацию

### ❌ "Не нашёл фильмы по заданным критериям"
**Причина:** Неправильные параметры для Kinopoisk API
**Решение:** Проверить маппинг жанров, форматирование параметров

## 💡 Запомни!

**НЕ ЗАБЫВАЙ:** Каждая новая голосовая команда = обновление NLP parser!
**ВСЕГДА ПРОВЕРЯЙ:** Работает ли команда локально, прежде чем деплоить cloud

**КЛЮЧЕВАЯ ФОРМУЛА:**
```
Новая команда = Паттерн в NLP + Логика в processMovieIntent + Тест
```

Эта архитектура работает в связке - обновляй ВСЕ компоненты синхронно!