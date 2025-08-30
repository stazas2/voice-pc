// Контекстная память команд (в памяти Cloud Function)
let sessionContexts = {};

const CONTEXT_COMMANDS = {
  'повтори': 'repeat_last',
  'повтори последнюю команду': 'repeat_last',
  'сделай то же самое': 'repeat_last',
  'ещё раз': 'repeat_last',
  'закрой то что открывал': 'close_last_opened',
  'закрой последнее': 'close_last_opened',
  'убей то что запускал': 'close_last_opened'
};

function saveCommandToContext(sessionId, userText, commandPayload, result) {
  if (!sessionContexts[sessionId]) {
    sessionContexts[sessionId] = {
      lastCommands: [],
      lastOpenedApps: []
    };
  }
  
  const context = sessionContexts[sessionId];
  
  // Сохраняем последнюю команду
  context.lastCommands.unshift({
    userText,
    commandPayload,
    result,
    timestamp: Date.now()
  });
  
  // Ограничиваем историю
  if (context.lastCommands.length > 5) {
    context.lastCommands = context.lastCommands.slice(0, 5);
  }
  
  // Отслеживаем открытые приложения
  if (commandPayload.command === 'open_app' || commandPayload.command === 'open_chrome') {
    context.lastOpenedApps.unshift({
      processName: getProcessNameFromCommand(commandPayload),
      timestamp: Date.now()
    });
    
    if (context.lastOpenedApps.length > 3) {
      context.lastOpenedApps = context.lastOpenedApps.slice(0, 3);
    }
  }
}

function getProcessNameFromCommand(commandPayload) {
  if (commandPayload.alias) {
    const aliasMap = {
      'calculator': 'calc',
      'explorer': 'explorer',
      'taskmgr': 'taskmgr',
      'cmd': 'cmd',
      'powershell': 'powershell'
    };
    return aliasMap[commandPayload.alias] || commandPayload.alias;
  }
  
  if (commandPayload.command === 'open_chrome') {
    return 'chrome';
  }
  
  return 'unknown';
}

function parseContextCommand(sessionId, userText) {
  const text = userText.toLowerCase().trim();
  const contextCmd = CONTEXT_COMMANDS[text];
  
  if (!contextCmd || !sessionContexts[sessionId]) {
    return null;
  }
  
  const context = sessionContexts[sessionId];
  
  switch (contextCmd) {
    case 'repeat_last':
      if (context.lastCommands.length > 0) {
        return context.lastCommands[0].commandPayload;
      }
      break;
      
    case 'close_last_opened':
      if (context.lastOpenedApps.length > 0) {
        const lastApp = context.lastOpenedApps[0];
        return { 
          command: 'close_window', 
          processName: lastApp.processName 
        };
      }
      break;
  }
  
  return null;
}

// Очистка старых сессий (каждые 30 минут)
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  Object.keys(sessionContexts).forEach(sessionId => {
    const context = sessionContexts[sessionId];
    if (context.lastCommands.length > 0) {
      const lastActivity = context.lastCommands[0].timestamp;
      if (now - lastActivity > thirtyMinutes) {
        delete sessionContexts[sessionId];
      }
    }
  });
}, 30 * 60 * 1000);

module.exports = { 
  saveCommandToContext, 
  parseContextCommand,
  getSessionContext: (sessionId) => sessionContexts[sessionId] || null
};