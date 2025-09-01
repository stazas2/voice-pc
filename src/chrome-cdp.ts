import CDP from 'chrome-remote-interface';
import { logger } from './logger';

export class ChromeCDP {
  private client: any = null;
  private isConnected = false;
  
  async connect(): Promise<boolean> {
    try {
      // Попробуем подключиться к Chrome по умолчанию
      const targets = await CDP.List();
      const activeTab = targets.find(target => target.type === 'page' && target.url !== 'chrome://newtab/');
      
      if (!activeTab) {
        logger.warn('No active Chrome tab found');
        return false;
      }
      
      this.client = await CDP({ target: activeTab.id });
      
      // Включим необходимые домены
      await this.client.Runtime.enable();
      await this.client.DOM.enable();
      
      this.isConnected = true;
      logger.info('✅ Connected to Chrome via CDP');
      return true;
      
    } catch (error) {
      logger.error('Failed to connect to Chrome via CDP:', error);
      return false;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        logger.error('Error disconnecting from Chrome:', error);
      }
      this.client = null;
      this.isConnected = false;
    }
  }
  
  async ensureConnection(): Promise<boolean> {
    if (!this.isConnected) {
      return await this.connect();
    }
    return true;
  }
  
  async executeScript(script: string): Promise<any> {
    if (!await this.ensureConnection()) {
      throw new Error('Could not connect to Chrome');
    }
    
    try {
      const result = await this.client.Runtime.evaluate({
        expression: script,
        returnByValue: true
      });
      
      if (result.exceptionDetails) {
        throw new Error(`Script error: ${result.exceptionDetails.text}`);
      }
      
      return result.result.value;
    } catch (error) {
      logger.error('CDP script execution failed:', error);
      throw error;
    }
  }
  
  async scrollPage(direction: 'up' | 'down', pixels: number = 500): Promise<boolean> {
    try {
      const script = `
        window.scrollBy(0, ${direction === 'down' ? pixels : -pixels});
        true;
      `;
      await this.executeScript(script);
      return true;
    } catch (error) {
      logger.error('Failed to scroll page:', error);
      return false;
    }
  }
  
  async clickElement(selector: string): Promise<boolean> {
    try {
      const script = `
        const element = document.querySelector('${selector}');
        if (element) {
          element.click();
          true;
        } else {
          false;
        }
      `;
      const result = await this.executeScript(script);
      return !!result;
    } catch (error) {
      logger.error('Failed to click element:', error);
      return false;
    }
  }
  
  async findTextOnPage(searchText: string): Promise<{ found: boolean; count: number }> {
    try {
      const script = `
        const searchTerm = '${searchText}';
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let count = 0;
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent && node.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
            count++;
          }
        }
        
        // Подсветим первое вхождение, если найдено
        if (count > 0) {
          window.find(searchTerm, false, false, true, false, true, false);
        }
        
        { found: count > 0, count: count }
      `;
      
      const result = await this.executeScript(script);
      return result || { found: false, count: 0 };
    } catch (error) {
      logger.error('Failed to search text on page:', error);
      return { found: false, count: 0 };
    }
  }
  
  async clickLink(linkText: string): Promise<boolean> {
    try {
      const script = `
        const links = Array.from(document.querySelectorAll('a'));
        const targetLink = links.find(link => 
          link.textContent && link.textContent.toLowerCase().includes('${linkText.toLowerCase()}')
        );
        
        if (targetLink) {
          targetLink.click();
          true;
        } else {
          false;
        }
      `;
      
      const result = await this.executeScript(script);
      return !!result;
    } catch (error) {
      logger.error('Failed to click link:', error);
      return false;
    }
  }
  
  async getCurrentPageInfo(): Promise<{ title: string; url: string }> {
    try {
      const script = `
        ({
          title: document.title,
          url: window.location.href
        })
      `;
      
      return await this.executeScript(script);
    } catch (error) {
      logger.error('Failed to get page info:', error);
      return { title: '', url: '' };
    }
  }
}

export const chromeCDP = new ChromeCDP();