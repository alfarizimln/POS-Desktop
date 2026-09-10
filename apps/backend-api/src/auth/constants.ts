import { config } from '../config.js';

export const JWT_SECRET = config.jwtSecret || 'pos-rumah-makan-dev-secret-change-in-production';
export const JWT_EXPIRES_IN = '7d';