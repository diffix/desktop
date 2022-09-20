export const i18nConfig = {
  debug: process.env.NODE_ENV === 'development',
  saveMissing: process.env.NODE_ENV === 'development',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  keySeparator: '::',
  ns: 'translation',
  nsSeparator: ':::',
  supportedLngs: ['en', 'de'],
  nonExplicitSupportedLngs: true,
} as const;
