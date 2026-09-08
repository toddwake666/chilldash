import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Chill Dash',
  slug: config.slug || 'chill-dash',
  userInterfaceStyle: 'light',
  extra: { ...config.extra, backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL },
});