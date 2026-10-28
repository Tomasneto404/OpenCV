export const notificationChannels = ['discord', 'telegram', 'ntfy', 'gotify'] as const;
export type NotificationChannel = typeof notificationChannels[number];
export type NotificationEvent = 'registration' | 'pdf_export';
export interface NotificationConfig {
  enabled: boolean; events: NotificationEvent[]; url: string; token: string; chatId: string; topic: string;
}
export interface PublicNotificationConfig extends NotificationConfig {
  hasToken: boolean; hasUrl: boolean; lastDelivery: { at: string; ok: boolean; code: string } | null;
}
export interface OIDCConfig { enabled: boolean; issuer: string; clientId: string; clientSecret: string; label: string }
export interface PublicOIDCConfig extends OIDCConfig { hasSecret: boolean; callback: string }
export interface IntegrationsConfig { oidc: PublicOIDCConfig; notifications: Record<NotificationChannel, PublicNotificationConfig> }
