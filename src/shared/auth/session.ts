import { randomBytes, createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { sessions, tenantMembers, tenants, users } from '../db/schema.js';
import type {
  AuthenticatedTenant,
  AuthenticatedUser,
  TenantMembershipSummary,
} from '../types/common.js';

export const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME;
export const SESSION_TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface SessionContext {
  user: AuthenticatedUser;
  tenant: AuthenticatedTenant | null;
  memberships: TenantMembershipSummary[];
  sessionId: string;
  sessionCookie: string | null;
  invalidActiveTenant: boolean;
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function signCookiePayload(payload: string) {
  return createHmac('sha256', env.SESSION_COOKIE_SECRET).update(payload).digest('hex');
}

function buildSessionCookieValue(sessionId: string, token: string) {
  const payload = `${sessionId}.${token}`;
  const signature = signCookiePayload(payload);
  return `${payload}.${signature}`;
}

function verifySessionCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parts = value.split('.');
  if (parts.length < 3) {
    return null;
  }

  const signature = parts.pop();
  const token = parts.pop();
  const sessionId = parts.join('.');

  if (!signature || !token || !sessionId) {
    return null;
  }

  const payload = `${sessionId}.${token}`;
  const expectedSignature = signCookiePayload(payload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  return { sessionId, token };
}

export function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};

  if (!header) {
    return cookies;
  }

  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    const name = rawName?.trim();
    if (!name) {
      continue;
    }

    cookies[name] = decodeURIComponent(rawValue.join('='));
  }

  return cookies;
}

function serializeCookie(name: string, value: string, options?: { maxAge?: number; clear?: boolean }) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (env.NODE_ENV === 'production') {
    attributes.push('Secure');
  }

  if (env.SESSION_COOKIE_DOMAIN) {
    attributes.push(`Domain=${env.SESSION_COOKIE_DOMAIN}`);
  }

  if (options?.clear) {
    attributes.push('Max-Age=0');
    attributes.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  } else if (options?.maxAge !== undefined) {
    attributes.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }

  return attributes.join('; ');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE_NAME, '', { clear: true });
}

export async function createSession(input: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  activeTenantId?: string | null;
}) {
  const sessionId = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: sessionId,
    userId: input.userId,
    tokenHash,
    activeTenantId: input.activeTenantId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    lastActiveAt: now,
    expiresAt,
  });

  return {
    sessionId,
    cookie: serializeCookie(
      SESSION_COOKIE_NAME,
      buildSessionCookieValue(sessionId, token),
      { maxAge: SESSION_TTL_MS }
    ),
  };
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function revokeUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function resolveSessionFromRequest(input: {
  cookieHeader?: string;
}) {
  const cookies = parseCookies(input.cookieHeader);
  const parsed = verifySessionCookieValue(cookies[SESSION_COOKIE_NAME]);

  if (!parsed) {
    return null;
  }

  const [sessionRow] = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      tokenHash: sessions.tokenHash,
      activeTenantId: sessions.activeTenantId,
      lastActiveAt: sessions.lastActiveAt,
      expiresAt: sessions.expiresAt,
      email: users.email,
      name: users.name,
      platformRole: users.platformRole,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, parsed.sessionId))
    .limit(1);

  if (!sessionRow || !sessionRow.isActive) {
    return null;
  }

  if (sessionRow.expiresAt.getTime() <= Date.now()) {
    await deleteSession(sessionRow.sessionId);
    return null;
  }

  if (!safeEqual(hashSessionToken(parsed.token), sessionRow.tokenHash)) {
    return null;
  }

  const memberships = await listMemberships(sessionRow.userId);
  let activeTenantId = sessionRow.activeTenantId;
  let tenant = activeTenantId
    ? memberships.find((membership) => membership.id === activeTenantId) ?? null
    : null;
  let invalidActiveTenant = false;

  if (!tenant && memberships.length === 1) {
    tenant = memberships[0] ?? null;
    activeTenantId = tenant?.id ?? null;
  } else if (!tenant && activeTenantId) {
    invalidActiveTenant = true;
    activeTenantId = null;
  }

  let sessionCookie: string | null = null;
  const now = Date.now();
  const shouldTouch = now - sessionRow.lastActiveAt.getTime() >= SESSION_TOUCH_INTERVAL_MS
    || activeTenantId !== sessionRow.activeTenantId;

  if (shouldTouch) {
    sessionCookie = await touchSession(sessionRow.sessionId, parsed.token, activeTenantId);
  }

  const user: AuthenticatedUser = {
    id: sessionRow.userId,
    email: sessionRow.email,
    name: sessionRow.name,
    platformRole: sessionRow.platformRole,
    activeTenantId,
    sessionId: sessionRow.sessionId,
  };

  return {
    user,
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          role: tenant.role,
        }
      : null,
    memberships: memberships.map((membership) => ({
      id: membership.id,
      name: membership.name,
      slug: membership.slug,
      role: membership.role,
    })),
    sessionId: sessionRow.sessionId,
    sessionCookie,
    invalidActiveTenant,
  } satisfies SessionContext;
}

export async function rotateSession(
  sessionId: string,
  options?: {
    activeTenantId?: string | null;
  }
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const token = randomBytes(32).toString('base64url');

  const [updated] = await db
    .update(sessions)
    .set({
      tokenHash: hashSessionToken(token),
      activeTenantId: options?.activeTenantId,
      lastActiveAt: now,
      expiresAt,
    })
    .where(eq(sessions.id, sessionId))
    .returning({
      sessionId: sessions.id,
      tokenHash: sessions.tokenHash,
    });

  if (!updated) {
    return null;
  }

  return serializeCookie(
    SESSION_COOKIE_NAME,
    buildSessionCookieValue(updated.sessionId, token),
    { maxAge: SESSION_TTL_MS }
  );
}

async function touchSession(sessionId: string, rawToken: string, activeTenantId: string | null) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const [updated] = await db
    .update(sessions)
    .set({
      activeTenantId,
      lastActiveAt: now,
      expiresAt,
    })
    .where(eq(sessions.id, sessionId))
    .returning({ sessionId: sessions.id });

  if (!updated) {
    return null;
  }

  return serializeCookie(
    SESSION_COOKIE_NAME,
    buildSessionCookieValue(updated.sessionId, rawToken),
    { maxAge: SESSION_TTL_MS }
  );
}

export async function switchActiveTenant(sessionId: string, tenantId: string | null) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const [updated] = await db
    .update(sessions)
    .set({
      tokenHash: hashSessionToken(token),
      activeTenantId: tenantId,
      lastActiveAt: now,
      expiresAt,
    })
    .where(eq(sessions.id, sessionId))
    .returning({ sessionId: sessions.id });

  if (!updated) {
    return null;
  }

  return serializeCookie(
    SESSION_COOKIE_NAME,
    buildSessionCookieValue(updated.sessionId, token),
    { maxAge: SESSION_TTL_MS }
  );
}

export async function listMemberships(userId: string) {
  return db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      role: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(and(eq(tenantMembers.userId, userId), eq(tenants.isActive, true)))
    .orderBy(asc(tenants.createdAt));
}
