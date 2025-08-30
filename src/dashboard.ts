import { Request, Response, Router } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { commandParser, CommandCategory } from './command-parser';

export interface DashboardStats {
  uptime: number;
  totalCommands: number;
  recentCommands: Array<{
    command: string;
    timestamp: string;
    status: 'success' | 'error';
  }>;
  systemStatus: 'online' | 'offline' | 'busy';
}

export class DashboardManager {
  private router = Router();
  private wss: WebSocketServer | null = null;
  private recentCommands: DashboardStats['recentCommands'] = [];
  private totalCommands = 0;
  private serverStartTime = Date.now();

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes() {
    // Dashboard HTML page
    this.router.get('/dashboard', (req: Request, res: Response) => {
      const dashboardPath = path.join(__dirname, '..', 'public', 'dashboard.html');
      if (fs.existsSync(dashboardPath)) {
        res.sendFile(dashboardPath);
      } else {
        res.status(404).send('Dashboard not found. Please ensure dashboard.html exists in public/ directory.');
      }
    });

    // API: Get system status and stats
    this.router.get('/api/status', (req: Request, res: Response) => {
      const stats: DashboardStats = {
        uptime: Math.floor((Date.now() - this.serverStartTime) / 1000),
        totalCommands: this.totalCommands,
        recentCommands: this.recentCommands.slice(-10), // Last 10 commands
        systemStatus: 'online'
      };
      res.json(stats);
    });

    // API: Get all commands from mappings (structured)
    this.router.get('/api/commands', (req: Request, res: Response) => {
      try {
        const categories = commandParser.parseCommandMappings();
        
        // Calculate stats
        const totalCommands = categories.reduce((sum, cat) => sum + cat.commands.length, 0);
        const categoriesCount = categories.length;
        
        res.json({
          success: true,
          categories,
          stats: {
            totalCommands,
            categoriesCount,
            lastUpdated: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('Error parsing command mappings:', error);
        res.status(500).json({ 
          error: 'Failed to parse command mappings',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // API: Update commands (save back to file)
    this.router.post('/api/commands', async (req: Request, res: Response) => {
      try {
        const { categories }: { categories: CommandCategory[] } = req.body;
        
        if (!categories || !Array.isArray(categories)) {
          return res.status(400).json({ error: 'Invalid categories data' });
        }

        // Validate commands
        const validation = commandParser.validateCommands(categories);
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Command validation failed',
            validationErrors: validation.errors
          });
        }

        // Save to file
        await commandParser.saveCommandMappings(categories);
        
        const totalCommands = categories.reduce((sum, cat) => sum + cat.commands.length, 0);
        
        logger.info('Dashboard: Commands updated successfully', { 
          categoriesCount: categories.length,
          totalCommands 
        });
        
        res.json({ 
          success: true, 
          message: 'Commands updated successfully',
          stats: {
            categoriesCount: categories.length,
            totalCommands,
            savedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('Error updating commands:', error);
        res.status(500).json({ 
          error: 'Failed to update commands',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // API: Get recent logs
    this.router.get('/api/logs', (req: Request, res: Response) => {
      try {
        const logsPath = path.join(__dirname, '..', 'logs');
        const logFiles = fs.existsSync(logsPath) ? fs.readdirSync(logsPath) : [];
        
        const recentLogs = logFiles
          .filter(file => file.endsWith('.log'))
          .slice(-5) // Last 5 log files
          .map(file => ({
            filename: file,
            path: path.join(logsPath, file),
            modified: fs.statSync(path.join(logsPath, file)).mtime
          }));

        res.json({ 
          success: true, 
          logs: recentLogs,
          recentCommands: this.recentCommands.slice(-20)
        });
      } catch (error) {
        logger.error('Error reading logs:', error);
        res.status(500).json({ error: 'Failed to read logs' });
      }
    });
  }

  // Initialize WebSocket server for real-time updates
  initWebSocket(server: any) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('Dashboard: WebSocket client connected');
      
      // Send initial data
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          uptime: Math.floor((Date.now() - this.serverStartTime) / 1000),
          totalCommands: this.totalCommands,
          systemStatus: 'online'
        }
      }));

      ws.on('close', () => {
        logger.info('Dashboard: WebSocket client disconnected');
      });
    });
  }

  // Log command execution for dashboard
  logCommand(command: string, status: 'success' | 'error', details?: string) {
    const commandLog = {
      command,
      timestamp: new Date().toISOString(),
      status,
      details
    };

    this.recentCommands.push(commandLog);
    this.totalCommands++;

    // Keep only last 50 commands in memory
    if (this.recentCommands.length > 50) {
      this.recentCommands = this.recentCommands.slice(-50);
    }

    // Broadcast to WebSocket clients
    if (this.wss) {
      const message = JSON.stringify({
        type: 'command',
        data: commandLog
      });

      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  // Broadcast system status updates
  broadcastStatus(status: 'online' | 'offline' | 'busy') {
    if (this.wss) {
      const message = JSON.stringify({
        type: 'status',
        data: {
          systemStatus: status,
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - this.serverStartTime) / 1000),
          totalCommands: this.totalCommands
        }
      });

      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  getRouter() {
    return this.router;
  }
}

// Export singleton instance
export const dashboardManager = new DashboardManager();