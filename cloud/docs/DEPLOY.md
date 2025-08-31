# 🚀 Инструкция по развертыванию Voice PC в Yandex Cloud

Подробная инструкция по настройке и развертыванию системы голосового управления ПК через Yandex Alice.

## 📋 Предварительные требования

### 1. Аккаунты и сервисы
- ✅ Аккаунт Yandex Cloud
- ✅ Доступ к Yandex.Dialogs (для навыков Алисы)  
- ✅ Cloudflare Tunnel или домен с SSL
- ✅ Windows ПК с установленным Node.js

### 2. Локальная подготовка
```bash
# Установите зависимости проекта
npm install

# Соберите проект
npm run build

# Протестируйте локально
npm start
```

## 🌐 Настройка Cloudflare Tunnel

### Шаг 1: Получение токена
1. Зайдите в [Cloudflare Zero Trust](https://dash.teams.cloudflare.com/)
2. Access → Tunnels → Create a tunnel
3. Выберите "Cloudflared" → Назовите туннель
4. Скопируйте токен из команды установки

### Шаг 2: Настройка туннеля
```bash
# Установите cloudflared (если не установлен)
# Токен уже есть в батнике start-voice-pc-final.bat

# Настройте маршрутизацию:
# Public hostname: ваш-домен.space
# Service: http://localhost:3000
```

### Шаг 3: Проверка
- Откройте `https://ваш-домен.space`
- Должна открыться главная страница Voice PC
- API доступно по адресу: `https://ваш-домен.space/command`

## ☁️ Развертывание в Yandex Cloud Functions

### Шаг 1: Создание функции

1. **Зайдите в консоль Yandex Cloud**
   - Functions → Create Function
   - Имя: `voice-pc-handler`
   - Описание: `Voice PC Alice Skill Handler`

2. **Настройка среды**
   - Runtime: `Node.js 18`
   - Entrypoint: `core/index.handler`
   - Timeout: `10 секунд`
   - Memory: `128 MB`

### Шаг 2: Загрузка кода

**Вариант A: Через веб-интерфейс**
1. Выберите "Code editor"
2. Удалите весь существующий код
3. Создайте структуру папок:
```
/
├── core/
│   ├── index.js
│   ├── api-client.js
│   └── response-generator.js
├── parsers/
│   ├── command-parser.js
│   ├── smart-parser.js
│   ├── fuzzy-matcher.js
│   └── context-memory.js
└── config/
    ├── config.js
    └── command-mappings.js
```
4. Скопируйте содержимое каждого файла из локальной папки `cloud/`

**Вариант B: Через CLI**
```bash
# Установите Yandex Cloud CLI
yc functions version create \
  --function-name=voice-pc-handler \
  --runtime=nodejs18 \
  --entrypoint=core/index.handler \
  --memory=128m \
  --execution-timeout=10s \
  --source-path=./cloud
```

### Шаг 3: Настройка конфигурации

Отредактируйте `config/config.js` в Cloud Function:
```javascript
const config = {
    // Замените на ваш реальный домен
    serverUrl: 'https://your-domain.space',
    apiEndpoint: '/command',
    
    // ОБЯЗАТЕЛЬНО: Токен аутентификации
    // Должен совпадать с ALICE_TOKEN в .env локального сервера
    authToken: 'VoicePC_SecureToken_2024_ваш_случайный_токен',
    
    timeout: 5000,
    
    // Дополнительные настройки
    retryAttempts: 2,
    logLevel: 'info'
};

module.exports = config;
```

**ВАЖНО:** `authToken` в облачной функции должен точно совпадать с `ALICE_TOKEN` в файле `.env` на локальном сервере.

### Шаг 4: Тестирование функции

1. **Создайте тестовое событие:**
```json
{
  "httpMethod": "POST",
  "body": "{\"request\":{\"command\":\"блокнот\",\"original_utterance\":\"блокнот\"},\"session\":{\"session_id\":\"test\",\"user_id\":\"test\"}}",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

2. **Запустите тест** - должен вернуться успешный ответ
3. **Проверьте логи** на наличие ошибок

## 🗣️ Настройка навыка в Yandex.Dialogs

### Шаг 1: Создание навыка

1. Зайдите в [Yandex.Dialogs](https://dialogs.yandex.ru/)
2. Создать диалог → Навык в Алисе
3. **Настройки навыка:**
   - Название: `Головной отрыв` (или ваше название)
   - Призывные фразы: `головной отрыв`, `управление пк`
   - Описание: `Голосовое управление компьютером`

### Шаг 2: Настройка Webhook

1. **Backend → Webhook**
2. **URL:** `https://functions.yandexcloud.net/ваш-id-функции`
   
   Получить URL функции:
   ```bash
   yc functions function get voice-pc-handler --format json | grep http_invoke_url
   ```

3. **Проверка соединения** - должна быть зеленая галочка

### Шаг 3: Настройка интентов

```
Название интента: execute_command
Грамматики: 
- $COMMAND
- выполни $COMMAND  
- сделай $COMMAND

Где $COMMAND - любая команда из command-mappings.js
```

### Шаг 4: Тестирование навыка

1. **В симуляторе диалогов:**
   ```
   Пользователь: "Алиса, запусти навык головной отрыв"
   Алиса: "Привет! Готова выполнять команды."
   Пользователь: "открой блокнот"  
   Алиса: "Открываю блокнот"
   ```

2. **На реальном устройстве:**
   - Активируйте навык голосом
   - Проверьте выполнение команд

## 🔧 Мониторинг и отладка

### Просмотр логов
```bash
# Логи Cloud Function
yc functions logs voice-pc-handler --limit 100

# Логи локального сервера
# Смотрите в окне cmd после запуска батника
```

### Дашборд мониторинга
- Откройте `https://ваш-домен.space/dashboard`
- Просматривайте статистику команд
- Редактируйте команды в реальном времени

### Типичные проблемы

**Ошибка: "serverUrl не настроен"**
```javascript
// В config/config.js должен быть реальный домен:
serverUrl: 'https://your-domain.space'  // НЕ localhost!
```

**Ошибка: "Connection timeout"**
```bash
# Убедитесь что локальный сервер запущен:
cd voice-pc && npm start

# Проверьте доступность через туннель:
curl https://your-domain.space/api/status
```

**Навык не отвечает**
```bash
# Проверьте webhook URL в Yandex.Dialogs
# Должен быть: https://functions.yandexcloud.net/d4e...
```

**Ошибка: "Unauthorized. Invalid or missing X-ALICE-TOKEN header"**
```javascript
// Убедитесь что authToken в config/config.js совпадает с ALICE_TOKEN в .env:
// В cloud/config/config.js:
authToken: 'VoicePC_SecureToken_2024_abcd1234efgh5678'

// В локальном .env файле:
ALICE_TOKEN=VoicePC_SecureToken_2024_abcd1234efgh5678
```

## 📊 Оптимизация производительности

### Cloud Function
- **Memory**: 128MB достаточно для всех операций
- **Timeout**: 10 сек для надежности
- **Concurrency**: 10-100 в зависимости от нагрузки

### Местный сервер  
```bash
# В production запускайте через PM2:
npm install -g pm2
pm2 start dist/server.js --name voice-pc
pm2 startup
pm2 save
```

## 🔒 Безопасность

### Рекомендуемые настройки
1. **Cloud Function**: Ограничьте доступ по IP (только Yandex)
2. **Туннель**: Используйте Access Policies если нужно
3. **Локальная сеть**: Firewall правила для порта 3000

### Проверка безопасности
```bash
# Проверьте открытые порты:
netstat -an | grep :3000

# Проверьте SSL сертификат:
curl -I https://ваш-домен.space
```

## 🚀 Готово к использованию!

После выполнения всех шагов у вас будет:
- ✅ Работающая Cloud Function
- ✅ Настроенный навык Алисы  
- ✅ Постоянный домен через Cloudflare
- ✅ 150+ голосовых команд
- ✅ Веб-дашборд управления

**Скажите: "Алиса, запусти навык головной отрыв" и начинайте управлять ПК голосом! 🎉**

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи Cloud Function и локального сервера
2. Убедитесь в корректности конфигурации
3. Протестируйте каждый компонент отдельно

**Система протестирована на Windows 10/11 с Node.js 18+**