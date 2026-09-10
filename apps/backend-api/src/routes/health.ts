import type { FastifyInstance } from 'fastify';
import sql from '../db.js';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', async (_request, reply) => {
    try {
      const result = await sql`SELECT NOW() as time`;
      return {
        status: 'ok',
        database: 'connected',
        time: result[0].time,
      };
    } catch (err: unknown) {
      reply.code(503);
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'error', database: 'disconnected', error: message };
    }
  });
}