import fetch from 'node-fetch';
import { logger } from './logger';

interface NotionConfig {
  token: string;
  databaseId: string;
}

interface NotionTask {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  priority?: string;
}

interface NotionEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
}

class NotionClient {
  private config: NotionConfig | null = null;
  
  constructor() {
    this.loadConfig();
  }
  
  private loadConfig() {
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;
    
    logger.info('🔍 Notion config debug:', { 
      hasToken: !!token, 
      hasDatabaseId: !!databaseId,
      tokenLength: token?.length || 0,
      databaseIdLength: databaseId?.length || 0 
    });
    
    if (token && databaseId) {
      this.config = { token, databaseId };
      logger.info('✅ Notion integration configured');
    } else {
      logger.warn('⚠️ Notion integration not configured (missing NOTION_TOKEN or NOTION_DATABASE_ID)');
    }
  }
  
  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    if (!this.config) {
      throw new Error('Notion not configured');
    }
    
    const url = `https://api.notion.com/v1/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getTodayTasks(): Promise<NotionTask[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await this.makeRequest(`databases/${this.config!.databaseId}/query`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            or: [
              {
                property: 'Due Date',
                date: {
                  equals: today
                }
              },
              {
                property: 'Due Date',
                date: {
                  is_empty: true
                }
              }
            ]
          },
          sorts: [
            {
              property: 'Priority',
              direction: 'descending'
            }
          ]
        })
      });
      
      return response.results.map((item: any) => ({
        id: item.id,
        title: item.properties.Title?.title?.[0]?.plain_text || 'Без названия',
        status: item.properties.Status?.select?.name || 'Не указан',
        dueDate: item.properties['Due Date']?.date?.start,
        priority: item.properties.Priority?.select?.name
      }));
      
    } catch (error) {
      logger.error('Failed to get today tasks from Notion', error);
      throw error;
    }
  }
  
  async getUpcomingEvents(): Promise<NotionEvent[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await this.makeRequest(`databases/${this.config!.databaseId}/query`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            and: [
              {
                property: 'Date',
                date: {
                  on_or_after: today
                }
              },
              {
                property: 'Date',
                date: {
                  before: nextWeek
                }
              }
            ]
          },
          sorts: [
            {
              property: 'Date',
              direction: 'ascending'
            }
          ]
        })
      });
      
      return response.results.map((item: any) => ({
        id: item.id,
        title: item.properties.Title?.title?.[0]?.plain_text || 'Без названия',
        date: item.properties.Date?.date?.start || 'Дата не указана',
        time: item.properties.Time?.rich_text?.[0]?.plain_text
      }));
      
    } catch (error) {
      logger.error('Failed to get upcoming events from Notion', error);
      throw error;
    }
  }
  
  async createTask(title: string, dueDate?: string): Promise<NotionTask> {
    try {
      const properties: any = {
        Title: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        Status: {
          select: {
            name: 'Не начато'
          }
        }
      };
      
      if (dueDate) {
        properties['Due Date'] = {
          date: {
            start: dueDate
          }
        };
      }
      
      const response = await this.makeRequest('pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: {
            database_id: this.config!.databaseId
          },
          properties
        })
      });
      
      return {
        id: response.id,
        title,
        status: 'Не начато',
        dueDate
      };
      
    } catch (error) {
      logger.error('Failed to create task in Notion', error);
      throw error;
    }
  }
  
  isConfigured(): boolean {
    return this.config !== null;
  }
}

export const notionClient = new NotionClient();