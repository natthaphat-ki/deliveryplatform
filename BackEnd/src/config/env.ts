import 'dotenv/config';

// Central place to read and validate environment variables.
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME ?? 'delivery_platform',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  externalApis: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    weatherApiKey: process.env.WEATHER_API_KEY ?? '',
  },
};
