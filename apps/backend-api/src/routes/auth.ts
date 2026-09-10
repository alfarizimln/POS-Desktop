import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from '../db.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../auth/constants.js';

interface RegisterBody {
  email: string;
  password: string;
  nama_pemilik: string;
  nama_outlet: string;
  nama_toko: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export default async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/api/auth/register', async (request, reply) => {
    const { email, password, nama_pemilik, nama_outlet, nama_toko } = request.body;

    if (!email || !password || !nama_pemilik || !nama_outlet) {
      return reply.code(400).send({ error: 'Semua field wajib diisi' });
    }

    const existing = await sql`SELECT id FROM tenants WHERE email = ${email}`;
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'Email sudah terdaftar' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await sql.begin(async (tx) => {
      const [tenant] = await tx`
        INSERT INTO tenants (nama_pemilik, email, password_hash)
        VALUES (${nama_pemilik}, ${email}, ${passwordHash})
        RETURNING id
      `;

      const [outlet] = await tx`
        INSERT INTO outlets (tenant_id, nama_outlet, alamat)
        VALUES (${tenant.id}, ${nama_outlet}, ${nama_toko || ''})
        RETURNING id
      `;

      const [user] = await tx`
        INSERT INTO users (tenant_id, outlet_id, nama, pin_hash, role)
        VALUES (${tenant.id}, ${outlet.id}, ${nama_pemilik}, ${passwordHash}, 'owner')
        RETURNING id
      `;

      return { tenantId: tenant.id, outletId: outlet.id, userId: user.id };
    });

    const token = jwt.sign(
      { tenant_id: result.tenantId, outlet_id: result.outletId, user_id: result.userId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token,
      tenant_id: result.tenantId,
      outlet_id: result.outletId,
      user_id: result.userId,
    };
  });

  app.post<{ Body: LoginBody }>('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email dan password wajib diisi' });
    }

    const [tenant] = await sql`SELECT id, password_hash FROM tenants WHERE email = ${email}`;
    if (!tenant) {
      return reply.code(401).send({ error: 'Email atau password salah' });
    }

    const valid = await bcrypt.compare(password, tenant.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Email atau password salah' });
    }

    const [outlet] = await sql`SELECT id FROM outlets WHERE tenant_id = ${tenant.id} LIMIT 1`;
    const [user] = await sql`SELECT id, role FROM users WHERE tenant_id = ${tenant.id} LIMIT 1`;

    const token = jwt.sign(
      { tenant_id: tenant.id, outlet_id: outlet?.id, user_id: user?.id, role: user?.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token,
      tenant_id: tenant.id,
      outlet_id: outlet?.id,
      user_id: user?.id,
    };
  });
}