/**
 * Frontend Logging Utility
 * 
 * Production-ready browser logging with Better Stack (Logtail).
 * Only sends logs in production environment.
 */

import { Logtail } from '@logtail/browser';

class FrontendLogger {
  private logtail: Logtail | null = null;
  private isProduction = process.env.NODE_ENV === 'production';
  private enabled = false;

  constructor() {
    if (this.isProduction && process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN) {
      try {
        this.logtail = new Logtail(process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN);
        this.enabled = true;
        console.log('✅ Frontend logging enabled');
      } catch (error) {
        console.error('❌ Failed to initialize Logtail:', error);
      }
    }
  }

  /**
   * Get current page information
   */
  private getPageContext() {
    if (typeof window === 'undefined') return {};

    return {
      page: window.location.pathname,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Get user context (if available from session/localStorage)
   */
  private getUserContext() {
    if (typeof window === 'undefined') return {};

    try {
      // Adjust this based on your auth implementation
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          userId: user.id || user.sub,
          userRole: user.role,
        };
      }
    } catch {
      // Ignore parsing errors
    }

    return {};
  }

  /**
   * Build log context
   */
  private buildContext(additionalContext?: any) {
    return {
      ...this.getPageContext(),
      ...this.getUserContext(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ...additionalContext,
    };
  }

  /**
   * Log info message
   */
  info(message: string, context?: any): void {
    console.log(`[INFO] ${message}`, context);

    if (this.enabled && this.logtail) {
      this.logtail.info(message, this.buildContext(context));
    }
  }

  /**
   * Log warning
   */
  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${message}`, context);

    if (this.enabled && this.logtail) {
      this.logtail.warn(message, this.buildContext(context));
    }
  }

  /**
   * Log error
   */
  error(message: string, error?: Error | any, context?: any): void {
    console.error(`[ERROR] ${message}`, error, context);

    if (this.enabled && this.logtail) {
      this.logtail.error(message, {
        ...this.buildContext(context),
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      });
    }
  }

  /**
   * Log debug message (dev only)
   */
  debug(message: string, context?: any): void {
    if (!this.isProduction) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Log user action (button click, form submit, etc.)
   */
  logAction(action: string, details?: any): void {
    this.info(`User Action: ${action}`, {
      type: 'user_action',
      action,
      ...details,
    });
  }

  /**
   * Log page view
   */
  logPageView(pageName: string): void {
    this.info(`Page View: ${pageName}`, {
      type: 'page_view',
      pageName,
    });
  }

  /**
   * Log API request (for monitoring)
   */
  logApiRequest(method: string, url: string, statusCode: number, duration: number): void {
    const isError = statusCode >= 400;
    const logFn = isError ? this.error.bind(this) : this.info.bind(this);

    logFn(`API ${method} ${url} - ${statusCode}`, {
      type: 'api_request',
      method,
      url,
      statusCode,
      duration,
      success: !isError,
    });
  }

  /**
   * Flush logs (call before page unload)
   */
  async flush(): Promise<void> {
    if (this.logtail) {
      await this.logtail.flush();
    }
  }
}

// Export singleton instance
export const logger = new FrontendLogger();

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.flush();
  });
}
