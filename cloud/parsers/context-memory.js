// Контекстная память команд (в памяти Cloud Function)
let sessionContexts = {};

const CONTEXT_COMMANDS = {
  'повтори': 'repeat_last',
  'повтори последнюю команду': 'repeat_last',
  'сделай то же самое': 'repeat_last',
  'ещё раз': 'repeat_last',
  'закрой то что открывал': 'close_last_opened',
  'закрой последнее': 'close_last_opened',
  'убей то что запускал': 'close_last_opened',
  'отмени': 'cancel_last',
  'отмени последнюю команду': 'cancel_last',
  'отменить': 'cancel_last',
  'отменить последнее': 'cancel_last',
  'верни как было': 'cancel_last',
  'назад': 'cancel_last'
};

function saveCommandToContext(sessionId, userText, commandPayload, result) {
  if (!sessionContexts[sessionId]) {
    sessionContexts[sessionId] = {
      lastCommands: [],
      lastOpenedApps: [],
      cancelableCommands: []
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
  
  // Сохраняем команды, которые можно отменить
  const cancelableCommands = [
    'open_app', 'open_chrome', 'open_notepad',
    'volume_set', 'volume_mute', 'volume_unmute',
    'minimize_all', 'show_desktop'
  ];
  
  if (cancelableCommands.includes(commandPayload.command) && result.ok) {
    const cancelAction = getCancelActionForCommand(commandPayload);
    if (cancelAction) {
      context.cancelableCommands.unshift({
        originalCommand: commandPayload,
        cancelAction: cancelAction,
        timestamp: Date.now()
      });
      
      if (context.cancelableCommands.length > 3) {
        context.cancelableCommands = context.cancelableCommands.slice(0, 3);
      }
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

function getCancelActionForCommand(commandPayload) {
  switch (commandPayload.command) {
    case 'open_app':
    case 'open_chrome':
    case 'open_notepad':
      return { 
        command: 'close_window', 
        processName: getProcessNameFromCommand(commandPayload) 
      };
    
    case 'volume_mute':
      return { command: 'volume_unmute' };
    
    case 'volume_unmute':
      return { command: 'volume_mute' };
    
    case 'volume_set':
      // Возвращаем к предыдущему уровню громкости (сложно реализовать)
      return { command: 'volume_set', level: 50 }; // Дефолтный уровень
    
    case 'minimize_all':
      return { command: 'show_desktop' }; // Не идеально, но логично
    
    case 'show_desktop':
      return { command: 'minimize_all' }; // И наоборот
    
    default:
      return null;
  }
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
    
    case 'cancel_last':
      if (context.cancelableCommands.length > 0) {
        const lastCancelable = context.cancelableCommands[0];
        // Удаляем из списка, чтобы не отменять повторно
        context.cancelableCommands.shift();
        return lastCancelable.cancelAction;
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