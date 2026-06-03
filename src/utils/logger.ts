import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelSeverity: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private static shouldLog(level: LogLevel): boolean {
    const configuredLevel = (config?.LOG_LEVEL || 'info') as LogLevel;
    return levelSeverity[level] >= levelSeverity[configuredLevel];
  }

  private static formatLog(level: LogLevel, message: string, context?: any): string {
    const isProduction = config?.NODE_ENV === 'production';
    const timestamp = new Date().toISOString();

    if (isProduction) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(context !== undefined ? { context } : {}),
      });
    }

    const contextStr = context !== undefined ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  static debug(message: string, context?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', message, context));
    }
  }

  static info(message: string, context?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatLog('info', message, context));
    }
  }

  static warn(message: string, context?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  static error(message: string, context?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, context));
    }
  }
}
