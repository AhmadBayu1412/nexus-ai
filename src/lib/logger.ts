/**
 * lib/logger.ts
 * 
 * Structured JSON logging utility.
 * Provides consistent log format across all services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private service = 'my-ai-chatbot';

  private format(level: LogLevel, message: string, context?: LogContext) {
    return JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...context,
    });
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.format('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.format('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.format('warn', message, context));
  }

  error(message: string, context?: LogContext) {
    console.error(this.format('error', message, context));
  }
}

export const logger = new Logger();
