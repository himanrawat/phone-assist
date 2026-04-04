import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { conflict, unauthorized } from '../../shared/errors/errors.js';
import { hashPassword, verifyPassword } from '../../shared/auth/password.js';
import {
  createSession,
  deleteSession,
  listMemberships,
  switchActiveTenant,
} from '../../shared/auth/session.js';
import { users } from '../../shared/db/schema.js';

export const authService = {
  async register(input: { email: string; password: string; name: string }, meta: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const existing = await this.findUserByEmail(input.email);
    if (existing) {
      throw conflict('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        name: input.name,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        platformRole: users.platformRole,
      });

    if (!user) {
      throw new Error('Failed to create user.');
    }

    const session = await createSession({
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      activeTenantId: null,
    });

    return {
      cookie: session.cookie,
      user,
      memberships: [],
      tenant: null,
    };
  },

  async login(input: { email: string; password: string }, meta: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const user = await this.findUserByEmail(input.email);
    if (!user) {
      throw unauthorized('Invalid email or password.');
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      throw unauthorized('Invalid email or password.');
    }

    const memberships = await listMemberships(user.id);
    const activeTenantId = memberships[0]?.id ?? null;
    const session = await createSession({
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      activeTenantId,
    });

    return {
      cookie: session.cookie,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        platformRole: user.platformRole,
        activeTenantId,
      },
      memberships,
      tenant: memberships.find((membership) => membership.id === activeTenantId) ?? null,
    };
  },

  async logout(sessionId: string) {
    await deleteSession(sessionId);
  },

  async switchTenant(input: { sessionId: string; userId: string; tenantId: string }) {
    const memberships = await listMemberships(input.userId);
    const membership = memberships.find((item) => item.id === input.tenantId);
    if (!membership) {
      throw unauthorized('You do not belong to that tenant.');
    }

    const cookie = await switchActiveTenant(input.sessionId, input.tenantId);
    return {
      cookie,
      tenant: membership,
    };
  },

  async findUserByEmail(email: string) {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        name: users.name,
        platformRole: users.platformRole,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] || null;
  },
};
