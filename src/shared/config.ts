export const i18nConfig = {
  debug: process.env.NODE_ENV !== 'production',
  ns: 'translation',
  supportedLngs: ['en', 'de'],
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
};
