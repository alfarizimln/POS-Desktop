import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';

const app = Fastify({
  logger: true,
});

await app.register(cors, { origin: true });

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(syncRoutes);

app.get('/', async () => {
  return { name: 'POS Rumah Makan API', version: '0.1.0' };
});

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`Server berjalan di http://localhost:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}