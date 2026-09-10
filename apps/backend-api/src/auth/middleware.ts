import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './constants.js';

export interface JWTPayload {
  tenant_id: string;
  outlet_id: string;
  user_id: string;
  role: string;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (request as FastifyRequest & { tenantId?: string }).tenantId = decoded.tenant_id;
    (request as FastifyRequest & { userId?: string }).userId = decoded.user_id;
    (request as FastifyRequest & { outletId?: string }).outletId = decoded.outlet_id;
  } catch {
    return reply.code(401).send({ error: 'Token tidak valid' });
  }
}