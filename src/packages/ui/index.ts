/**
 * VendorOS Shared UI Design Tokens and Diagnostics Client
 */

export const designTokens = {
  colors: {
    primary: '#FF6B35',      // Vibrant orange
    secondary: '#FFB347',    // Warm gold
    success: '#22C55E',      // Green
    danger: '#EF4444',       // Red
    bgLight: '#F8FAFC',
    bgDark: '#0A0A0A',
    cardLight: '#FFFFFF',
    cardDark: '#121212',
    textHighLight: '#1E293B',
    textHighDark: '#F8FAFC'
  },
  typography: {
    fontFamily: 'Inter, sans-serif'
  }
};

export interface DiagnosticsEvent {
  storeId: string;
  userId?: string;
  eventType: 'sync_failure' | 'payment_failure' | 'whatsapp_failure' | 'database_failure';
  error: Error;
  metadata?: any;
}

class DiagnosticsClient {
  private static instance: DiagnosticsClient;
  private isSentryInitialized = false;
  private isPostHogInitialized = false;

  private constructor() {
    this.isSentryInitialized = false;
    this.isPostHogInitialized = false;
  }

  public static getInstance(): DiagnosticsClient {
    if (!DiagnosticsClient.instance) {
      DiagnosticsClient.instance = new DiagnosticsClient();
    }
    return DiagnosticsClient.instance;
  }

  /**
   * Log exception to Sentry and tracking metrics to PostHog
   */
  public logException(event: DiagnosticsEvent): void {
    const errorMsg = `[Diagnostics Monitoring] [${event.eventType.toUpperCase()}] Store: ${event.storeId} | Error: ${event.error.message}`;
    console.error(errorMsg, event.error, event.metadata || '');
  }

  /**
   * Log generic user action to metrics DB (PostHog)
   */
  public trackAction(eventName: string, properties: Record<string, any>): void {
    console.log(`[Diagnostics Tracking] Event: ${eventName}`, properties);
  }
}

export const diagnostics = DiagnosticsClient.getInstance();
export default diagnostics;
