/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_DATA_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_PUSH_SUBSCRIPTION_URL?: string;
}
