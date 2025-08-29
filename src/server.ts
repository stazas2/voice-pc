import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { CommandRequest, ApiResponse, HealthResponse } from './types';
import { validateCommand } from './validators';
import { logger } from './logger';
import { createSecurityManager } from './security';
import { windowsCommands } from './commands';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const ALICE_TOKEN = process.env.ALICE_TOKEN;

if (!ALICE_TOKEN || ALICE_TOKEN === 'change_me' || ALICE_TOKEN.length < 10) {
  logger.error('ALICE_TOKEN is not set or insecure. Please set a strong token in .env file.');
  process.exit(1);
}

// Track server start time for uptime
const serverStartTime = Date.now();

// Create security manager
const security = createSecurityManager(ALICE_TOKEN);

// Middleware
app.use(cors({
  origin: false, // No browser CORS - webhook only
  credentials: false
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply logging to all requests
app.use(security.logRequestMiddleware);

// Apply rate limiting to all endpoints
app.use(security.rateLimitMiddleware);

// Routes

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response<HealthResponse>) => {
  const uptime = Date.now() - serverStartTime;
  res.json({
    ok: true,
    uptime: Math.floor(uptime / 1000),
    ts: new Date().toISOString()
  });
});

// Webhook GET endpoint for status check
app.get('/webhook', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'Voice PC Controller',
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for Alice (no token required)
app.post('/webhook', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.connection.remoteAddress || 'unknown';
  
  logger.info(`Alice webhook from ${clientIp}:`, req.body);

  try {
    const userText = req.body?.request?.command || '';
    const sessionId = req.body?.session?.session_id || 'unknown';
    
    // Parse user command to API command
    const commandPayload = parseUserCommand(userText);
    logger.info(`[${sessionId}] User: "${userText}" -> Command: ${JSON.stringify(commandPayload)}`);
    
    // Execute command
    const result = await windowsCommands.executeCommandRequest(commandPayload);
    
    // Generate Alice response
    const aliceResponse = generateAliceResponse(commandPayload, result);
    
    res.json({
      response: {
        text: aliceResponse.text,
        tts: aliceResponse.tts || aliceResponse.text,
        end_session: false
      },
      version: '1.0'
    });
    
  } catch (error: any) {
    logger.error('Alice webhook error:', error);
    
    res.json({
      response: {
        text: 'Произошла ошибка при выполнении команды.',
        tts: 'Произошла ошибка при выполнении команды.',
        end_session: false
      },
      version: '1.0'
    });
  }
});

// Main command endpoint (auth required)
app.post('/command', security.authMiddleware, async (req: Request, res: Response<ApiResponse>) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.connection.remoteAddress || 'unknown';

  try {
    // Validate request body
    const validation = validateCommand(req.body);
    if (!validation.success) {
      logger.logAction({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        command: req.body?.command || 'invalid',
        payload: req.body,
        result: 'error',
        error: 'Validation failed: ' + validation.error.message
      });

      return res.status(400).json({
        ok: false,
        error: `Validation error: ${validation.error.message}`
      });
    }

    const commandRequest: CommandRequest = validation.data;

    // Additional validation for specific commands
    if (commandRequest.command === 'open_chrome' && !commandRequest.url) {
      logger.logAction({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        command: commandRequest.command,
        payload: commandRequest,
        result: 'error',
        error: 'URL required for open_chrome'
      });

      return res.status(400).json({
        ok: false,
        error: 'URL is required for open_chrome command'
      });
    }

    if (commandRequest.command === 'open_app' && !commandRequest.alias) {
      logger.logAction({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        command: commandRequest.command,
        payload: commandRequest,
        result: 'error',
        error: 'Alias required for open_app'
      });

      return res.status(400).json({
        ok: false,
        error: 'Alias is required for open_app command'
      });
    }

    // Execute command
    const result = await windowsCommands.executeCommandRequest(commandRequest);

    // Log the action
    logger.logAction({
      timestamp: new Date().toISOString(),
      ip: clientIp,
      command: commandRequest.command,
      payload: commandRequest,
      result: result.ok ? 'success' : 'error',
      error: result.ok ? undefined : result.error
    });

    if (result.ok) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    logger.error('Unexpected error in /command endpoint', error);
    
    logger.logAction({
      timestamp: new Date().toISOString(),
      ip: clientIp,
      command: req.body?.command || 'unknown',
      payload: req.body,
      result: 'error',
      error: error instanceof Error ? error.message : 'Unknown server error'
    });

    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

// Info endpoint (no auth) - for manual testing
app.get('/', (req: Request, res: Response) => {
  const availableApps = windowsCommands.getAvailableApps();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Voice PC Controller</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .command { background: #f8f8f8; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007acc; }
        .endpoint { font-family: 'Courier New', monospace; background: #333; color: #fff; padding: 10px; border-radius: 4px; margin: 5px 0; }
        .apps { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
        .app { background: #e8f4f8; padding: 8px; border-radius: 4px; border: 1px solid #bee5eb; }
        input[type="text"], textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 5px 0; }
        button { background: #007acc; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a9e; }
        .result { margin-top: 15px; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎙️ Voice PC Controller</h1>
        <p>Server is running and ready to accept commands from Alice voice assistant.</p>
        
        <h2>Available Commands:</h2>
        <div class="command">
          <strong>say_ok</strong> - Health check response
          <div class="endpoint">POST /command {"command":"say_ok"}</div>
        </div>
        <div class="command">
          <strong>open_notepad</strong> - Open Windows Notepad
          <div class="endpoint">POST /command {"command":"open_notepad"}</div>
        </div>
        <div class="command">
          <strong>open_chrome</strong> - Open URL in Chrome or default browser
          <div class="endpoint">POST /command {"command":"open_chrome","url":"https://youtube.com"}</div>
        </div>
        <div class="command">
          <strong>shutdown_now</strong> - Shutdown computer immediately
          <div class="endpoint">POST /command {"command":"shutdown_now"}</div>
        </div>
        <div class="command">
          <strong>sleep_now</strong> - Put computer to sleep
          <div class="endpoint">POST /command {"command":"sleep_now"}</div>
        </div>
        <div class="command">
          <strong>open_app</strong> - Open application by alias
          <div class="endpoint">POST /command {"command":"open_app","alias":"calculator"}</div>
        </div>

        <h2>Available App Aliases:</h2>
        <div class="apps">
          ${availableApps.map(app => `<div class="app">${app}</div>`).join('')}
        </div>

        <h2>Test Commands:</h2>
        <div style="margin: 20px 0;">
          <input type="text" id="token" placeholder="X-ALICE-TOKEN" value="">
          <textarea id="payload" placeholder='{"command":"say_ok"}' rows="3">{"command":"say_ok"}</textarea>
          <button onclick="testCommand()">Send Command</button>
          <div id="result"></div>
        </div>

        <h2>Endpoints:</h2>
        <div class="endpoint">GET /health - Check server status</div>
        <div class="endpoint">POST /command - Execute command (requires X-ALICE-TOKEN header)</div>
        <div class="endpoint">GET / - This page</div>
      </div>

      <script>
        async function testCommand() {
          const token = document.getElementById('token').value;
          const payload = document.getElementById('payload').value;
          const resultDiv = document.getElementById('result');
          
          try {
            const response = await fetch('/command', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-ALICE-TOKEN': token
              },
              body: payload
            });
            
            const data = await response.json();
            resultDiv.innerHTML = '<div class="result ' + (data.ok ? 'success' : 'error') + '">' + JSON.stringify(data, null, 2) + '</div>';
          } catch (error) {
            resultDiv.innerHTML = '<div class="result error">Error: ' + error.message + '</div>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Handle 404
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled server error', error);
  res.status(500).json({
    ok: false,
    error: 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Voice PC Server started on http://0.0.0.0:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Available apps: ${windowsCommands.getAvailableApps().join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Command parsing functions for Alice webhook
function parseUserCommand(userText: string): CommandRequest {
  const text = userText.toLowerCase().trim();
  
  // Command mappings
  const mappings: Record<string, CommandRequest> = {
    // Блокнот
    'запусти блокнот': { command: 'open_notepad' },
    'открой блокнот': { command: 'open_notepad' },
    'блокнот': { command: 'open_notepad' },
    
    // Браузер с конкретными сайтами
    'открой ютуб': { command: 'open_chrome', url: 'https://youtube.com' },
    'запусти ютуб': { command: 'open_chrome', url: 'https://youtube.com' },
    'открой гугл': { command: 'open_chrome', url: 'https://google.com' },
    'открой хром': { command: 'open_chrome', url: 'https://google.com' },
    'открой браузер': { command: 'open_chrome', url: 'https://google.com' },
    
    // Выключение и сон
    'выключи компьютер': { command: 'shutdown_now' },
    'выключи пк': { command: 'shutdown_now' },
    'выключи ноутбук': { command: 'shutdown_now' },
    'усыпи компьютер': { command: 'sleep_now' },
    'усыпи пк': { command: 'sleep_now' },
    'переведи в сон': { command: 'sleep_now' },
    
    // Приложения по алиасам
    'запусти калькулятор': { command: 'open_app', alias: 'calculator' },
    'открой калькулятор': { command: 'open_app', alias: 'calculator' },
    'запусти проводник': { command: 'open_app', alias: 'explorer' },
    'открой проводник': { command: 'open_app', alias: 'explorer' },
    'запусти диспетчер задач': { command: 'open_app', alias: 'taskmgr' },
    'открой диспетчер': { command: 'open_app', alias: 'taskmgr' },
    
    // Fallback команды
    'тест': { command: 'say_ok' },
    'проверка': { command: 'say_ok' },
    'статус': { command: 'say_ok' }
  };
  
  // Прямое соответствие
  if (mappings[text]) {
    return mappings[text];
  }
  
  // Если ничего не найдено - возвращаем say_ok
  return { command: 'say_ok' };
}

function generateAliceResponse(command: CommandRequest, result: ApiResponse) {
  if (!result.ok) {
    return {
      text: `Ошибка: ${result.error}`,
      tts: 'Произошла ошибка при выполнении команды.'
    };
  }

  switch (command.command) {
    case 'open_notepad':
      return {
        text: 'Блокнот открыт.',
        tts: 'Блокнот открыт.'
      };
      
    case 'open_chrome':
      const domain = command.url ? command.url.replace('https://', '').split('/')[0] : 'браузер';
      return {
        text: `Открываю ${domain}.`,
        tts: `Открываю ${domain}.`
      };
      
    case 'shutdown_now':
      return {
        text: 'Компьютер выключается.',
        tts: 'Компьютер выключается. До свидания!'
      };
      
    case 'sleep_now':
      return {
        text: 'Компьютер переходит в спящий режим.',
        tts: 'Усыпляю компьютер.'
      };
      
    case 'open_app':
      return {
        text: `Запускаю ${command.alias}.`,
        tts: `Запускаю ${command.alias}.`
      };
      
    case 'say_ok':
    default:
      return {
        text: 'OK. Система работает.',
        tts: 'OK. Система работает.'
      };
  }
}

export default app;