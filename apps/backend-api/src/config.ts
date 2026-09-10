import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'pos-rumah-makan-dev-secret-change-in-production',
  nodeEnv: process.env.NODE_ENV || 'development',
};