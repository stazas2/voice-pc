import fetch from 'node-fetch';
import { logger } from './logger';

interface NotionConfig {
  token: string;
  databaseId: string;
}

type Normalized =
  | { type: "text"; value: string }
  | { type: "number"; value: number | null }
  | { type: "bool"; value: boolean }
  | { type: "multi"; value: string[] }
  | { type: "date"; value: { start: string | null; end: string | null; time_zone?: string | null } }
  | { type: "person"; value: { id: string; name?: string }[] }
  | { type: "url"; value: string | null }
  | { type: "file"; value: { name: string; url: string }[] }
  | { type: "relation"; value: string[] }
  | { type: "status"; value: string | null }
  | { type: "raw"; value: unknown };

interface NormalizedPage {
  pageId: string;
  title: string;
  status: string | null;
  byId: Record<string, Normalized>;
  byName: Record<string, Normalized>;
  raw: any;
}

interface Task {
  id: string;
  title: string;
  status?: string | null;
  dueDate?: string | null;
  priority?: string | null;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
}

class DynamicNotionAdapter {
  private config: NotionConfig | null = null;
  private schemaCache: any = null;
  private schemaCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
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
      logger.info('✅ Notion dynamic adapter configured');
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
      const errorText = await response.text();
      logger.error('Notion API error details:', { 
        status: response.status, 
        statusText: response.statusText, 
        body: errorText 
      });
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  private async getDatabaseSchema(): Promise<any> {
    if (!this.config) throw new Error('Notion not configured');
    
    const now = Date.now();
    if (this.schemaCache && (now - this.schemaCacheTime) < this.CACHE_TTL) {
      return this.schemaCache;
    }
    
    logger.info('📊 Fetching Notion database schema...');
    const schema = await this.makeRequest(`databases/${this.config.databaseId}`);
    
    this.schemaCache = schema;
    this.schemaCacheTime = now;
    
    logger.info('📊 Schema cached:', { 
      title: schema.title?.[0]?.plain_text || 'Untitled',
      propertyCount: Object.keys(schema.properties).length,
      properties: Object.keys(schema.properties)
    });
    
    return schema;
  }
  
  private normalizePropertyValue(prop: any): Normalized {
    switch (prop.type) {
      case "title":
        return { type: "text", value: prop.title.map((t: any) => t.plain_text).join("") };
      case "rich_text":
        return { type: "text", value: prop.rich_text.map((t: any) => t.plain_text).join("") };
      case "number":
        return { type: "number", value: prop.number ?? null };
      case "select":
        return { type: "text", value: prop.select?.name ?? "" };
      case "multi_select":
        return { type: "multi", value: (prop.multi_select || []).map((o: any) => o.name) };
      case "status":
        return { type: "status", value: prop.status?.name ?? null };
      case "date":
        return { type: "date", value: { 
          start: prop.date?.start ?? null, 
          end: prop.date?.end ?? null, 
          time_zone: prop.date?.time_zone ?? null 
        }};
      case "people":
        return { type: "person", value: (prop.people || []).map((u: any) => ({ id: u.id, name: u.name })) };
      case "files":
        return { type: "file", value: (prop.files || []).map((f: any) =>
          f.type === "file" ? { name: f.name, url: f.file.url } :
          f.type === "external" ? { name: f.name ?? f.external.url, url: f.external.url } :
          { name: "unknown", url: "" }
        )};
      case "checkbox":
        return { type: "bool", value: !!prop.checkbox };
      case "url":
        return { type: "url", value: prop.url ?? null };
      case "email":
        return { type: "text", value: prop.email ?? "" };
      case "phone_number":
        return { type: "text", value: prop.phone_number ?? "" };
      case "relation":
        return { type: "relation", value: (prop.relation || []).map((r: any) => r.id) };
      case "created_time":
        return { type: "date", value: { start: prop.created_time, end: null } };
      case "last_edited_time":
        return { type: "date", value: { start: prop.last_edited_time, end: null } };
      case "created_by":
      case "last_edited_by":
        return { type: "person", value: prop[prop.type] ? [{ id: prop[prop.type].id, name: prop[prop.type].name }] : [] };
      default:
        return { type: "raw", value: prop };
    }
  }
  
  private async queryAndNormalize(query: any = {}): Promise<NormalizedPage[]> {
    if (!this.config) throw new Error('Notion not configured');
    
    const pages = await this.makeRequest(`databases/${this.config.databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(query)
    });

    return pages.results.map((page: any) => {
      const props = page.properties as Record<string, any>;
      const byId: Record<string, Normalized> = {};
      const byName: Record<string, Normalized> = {};

      for (const [name, prop] of Object.entries(props)) {
        const norm = this.normalizePropertyValue(prop);
        byName[name] = norm;
        if (prop.id) byId[prop.id] = norm;
      }

      // Умные угадайки
      const titleEntry = Object.entries(props).find(([, p]) => p.type === "title");
      const statusEntry = Object.entries(props).find(([, p]) => p.type === "status");

      return {
        pageId: page.id,
        title: titleEntry ? this.normalizePropertyValue(titleEntry[1] as any).value as string : "",
        status: statusEntry ? this.normalizePropertyValue(statusEntry[1] as any).value as string : null,
        byId,
        byName,
        raw: page,
      };
    });
  }
  
  async getTodayTasks(): Promise<Task[]> {
    try {
      // Получаем схему для понимания доступных полей
      await this.getDatabaseSchema();
      
      const today = new Date().toISOString().split('T')[0];
      
      // Запрашиваем все задачи и фильтруем локально (Notion API фильтры сложны)
      const pages = await this.queryAndNormalize({});
      
      // Адаптируем к нашему формату Task
      return pages.map(page => {
        // Ищем поле с датой (умная угадайка)
        const dateFields = Object.entries(page.byName).filter(([name, norm]) => 
          norm.type === "date" && (
            /due|deadline|date/i.test(name) || 
            name.toLowerCase().includes('date')
          )
        );
        
        const priorityFields = Object.entries(page.byName).filter(([name, norm]) =>
          (norm.type === "text" || norm.type === "status") && /priority|важность/i.test(name)
        );
        
        let dueDate: string | null = null;
        if (dateFields.length > 0) {
          const dateValue = dateFields[0][1].value as any;
          dueDate = dateValue?.start || null;
        }
        
        let priority: string | null = null;
        if (priorityFields.length > 0) {
          priority = priorityFields[0][1].value as string;
        }
        
        return {
          id: page.pageId,
          title: page.title || 'Без названия',
          status: page.status,
          dueDate,
          priority
        };
      })
      .filter(task => {
        // Фильтруем только задачи на сегодня
        if (!task.dueDate) return false;
        const taskDate = task.dueDate.split('T')[0]; // Убираем время, оставляем только дату
        return taskDate === today;
      })
      .slice(0, 10); // Лимит для голосового ответа
      
    } catch (error) {
      logger.error('Failed to get today tasks from Notion', error);
      throw error;
    }
  }
  
  async getUpcomingEvents(): Promise<Event[]> {
    try {
      await this.getDatabaseSchema();
      
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const pages = await this.queryAndNormalize({});
      
      // Фильтруем и адаптируем
      return pages.filter(page => {
        // Ищем поле с датой
        const dateFields = Object.entries(page.byName).filter(([name, norm]) => 
          norm.type === "date" && norm.value && (norm.value as any).start
        );
        
        if (dateFields.length === 0) return false;
        
        const dateValue = (dateFields[0][1].value as any).start;
        return dateValue >= today && dateValue <= nextWeek;
      }).map(page => {
        // Берем первое date-поле
        const dateFields = Object.entries(page.byName).filter(([name, norm]) => 
          norm.type === "date" && norm.value && (norm.value as any).start
        );
        
        const timeFields = Object.entries(page.byName).filter(([name, norm]) =>
          norm.type === "text" && /time|время/i.test(name)
        );
        
        const dateValue = dateFields[0] ? (dateFields[0][1].value as any) : { start: null };
        const timeValue = timeFields[0] ? timeFields[0][1].value as string : undefined;
        
        return {
          id: page.pageId,
          title: page.title || 'Без названия', 
          date: dateValue.start || 'Дата не указана',
          time: timeValue
        };
      }).slice(0, 5);
      
    } catch (error) {
      logger.error('Failed to get upcoming events from Notion', error);
      throw error;
    }
  }
  
  async createTask(title: string, dueDate?: string): Promise<Task> {
    try {
      const schema = await this.getDatabaseSchema();
      
      // Найдем нужные поля по типу
      const titleProp = Object.entries(schema.properties).find(([name, prop]: [string, any]) => 
        prop.type === 'title'
      );
      
      if (!titleProp) {
        throw new Error('No title property found in database');
      }
      
      const properties: any = {
        [titleProp[0]]: {
          title: [{ text: { content: title } }]
        }
      };
      
      // Если есть поле для даты, добавим
      if (dueDate) {
        const dateProp = Object.entries(schema.properties).find(([name, prop]: [string, any]) => 
          prop.type === 'date' && /due|deadline|date/i.test(name)
        );
        
        if (dateProp) {
          properties[dateProp[0]] = {
            date: { start: dueDate }
          };
        }
      }
      
      const response = await this.makeRequest('pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: this.config!.databaseId },
          properties
        })
      });
      
      return {
        id: response.id,
        title,
        status: 'Создано',
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

export const dynamicNotionAdapter = new DynamicNotionAdapter();