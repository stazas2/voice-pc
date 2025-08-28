import { validateCommand, isValidUrl, sanitizeAlias } from '../validators';

describe('Validators', () => {
  describe('validateCommand', () => {
    it('should validate correct say_ok command', () => {
      const result = validateCommand({ command: 'say_ok' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.command).toBe('say_ok');
      }
    });

    it('should validate correct open_chrome command with URL', () => {
      const result = validateCommand({ 
        command: 'open_chrome', 
        url: 'https://youtube.com' 
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.command).toBe('open_chrome');
        expect(result.data.url).toBe('https://youtube.com');
      }
    });

    it('should validate correct open_app command with alias', () => {
      const result = validateCommand({ 
        command: 'open_app', 
        alias: 'calculator' 
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.command).toBe('open_app');
        expect(result.data.alias).toBe('calculator');
      }
    });

    it('should reject invalid command', () => {
      const result = validateCommand({ command: 'invalid_command' });
      expect(result.success).toBe(false);
    });

    it('should reject extra fields', () => {
      const result = validateCommand({ 
        command: 'say_ok', 
        extraField: 'not allowed' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const result = validateCommand({ 
        command: 'open_chrome', 
        url: 'not-a-url' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty alias', () => {
      const result = validateCommand({ 
        command: 'open_app', 
        alias: '' 
      });
      expect(result.success).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://youtube.com/watch?v=123')).toBe(true);
    });

    it('should validate HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject non-HTTP/HTTPS URLs', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('file:///c:/test')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('just text')).toBe(false);
    });
  });

  describe('sanitizeAlias', () => {
    it('should keep valid alias unchanged', () => {
      expect(sanitizeAlias('calculator')).toBe('calculator');
      expect(sanitizeAlias('my-app_2')).toBe('my-app_2');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeAlias('my app!')).toBe('myapp');
      expect(sanitizeAlias('calc@#$')).toBe('calc');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeAlias('MyApp')).toBe('myapp');
      expect(sanitizeAlias('CALCULATOR')).toBe('calculator');
    });

    it('should handle empty strings', () => {
      expect(sanitizeAlias('')).toBe('');
      expect(sanitizeAlias('!!!')).toBe('');
    });
  });
});