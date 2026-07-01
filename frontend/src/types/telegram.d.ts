// Глобальные типы для Telegram WebApp SDK (telegram-web-app.js подключается в index.html).
// Описываем только то, что реально используется в приложении.

export interface TelegramWebAppContact {
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;
}

export interface TelegramWebApp {
  initData: string;
  version?: string;
  ready: () => void;
  expand: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  requestContact?: (callback: (sent: boolean, contact?: TelegramWebAppContact) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export {};
