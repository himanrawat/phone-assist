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
import { tenantMembers, tenants, users } from '../../shared/db/schema.js';
import {
  assignTenantSubscriptionInTx,
  getDefaultPlan,
  getTenantBillingContext,
} from '../plans/plans.service.js';
import { buildUniqueTenantSlug } from '../tenants/tenants.service.js';

export const authService = {
  async register(input: { email: string; password: string; name: string; businessName: string; timezone?: string }, meta: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const existing = await this.findUserByEmail(input.email);
    if (existing) {
      throw conflict('An account with this email already exists.');
    }

    const defaultPlan = await getDefaultPlan();
    const { user, tenant } = await db.transaction(async (tx) => {
      const passwordHash = await hashPassword(input.password);
      const [createdUser] = await tx
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

      if (!createdUser) {
        throw new Error('Failed to create user.');
      }

      const slug = await buildUniqueTenantSlug(input.businessName, tx);
      const [createdTenant] = await tx
        .insert(tenants)
        .values({
          name: input.businessName,
          slug,
          timezone: input.timezone?.trim() || 'UTC',
        })
        .returning({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
        });

      if (!createdTenant) {
        throw new Error('Failed to create tenant.');
      }

      await tx.insert(tenantMembers).values({
        tenantId: createdTenant.id,
        userId: createdUser.id,
        role: 'tenant_admin',
      });

      await assignTenantSubscriptionInTx({
        tenantId: createdTenant.id,
        planId: defaultPlan.id,
        createdBy: createdUser.id,
      }, tx);

      return {
        user: createdUser,
        tenant: createdTenant,
      };
    });

    const session = await createSession({
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      activeTenantId: tenant.id,
    });

    const billingContext = await getTenantBillingContext(tenant.id);

    return {
      cookie: session.cookie,
      user: {
        ...user,
        activeTenantId: tenant.id,
      },
      memberships: [
        {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          role: 'tenant_admin' as const,
        },
      ],
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        role: 'tenant_admin' as const,
      },
      subscription: billingContext.subscription,
      entitlements: billingContext.entitlements,
      allowedLanguages: billingContext.allowedLanguages,
      usage: billingContext.usage,
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
    const activeTenantId = user.platformRole ? null : memberships[0]?.id ?? null;
    const session = await createSession({
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      activeTenantId,
    });
    const tenant = memberships.find((membership) => membership.id === activeTenantId) ?? null;
    const billingContext = activeTenantId
      ? await getTenantBillingContext(activeTenantId)
      : null;

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
      tenant,
      subscription: billingContext?.subscription ?? null,
      entitlements: billingContext?.entitlements ?? null,
      allowedLanguages: billingContext?.allowedLanguages ?? [],
      usage: billingContext?.usage ?? null,
    };
  },

  async logout(sessionId: string) {
    await deleteSession(sessionId);
  },

  async switchTenant(input: { sessionId: string; userId: string; tenantId: string }) {
    const user = await db
      .select({
        platformRole: users.platformRole,
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (user[0]?.platformRole) {
      throw unauthorized('Platform users cannot switch into tenant sessions in this portal model.');
    }

    const memberships = await listMemberships(input.userId);
    const membership = memberships.find((item) => item.id === input.tenantId);
    if (!membership) {
      throw unauthorized('You do not belong to that tenant.');
    }

    const cookie = await switchActiveTenant(input.sessionId, input.tenantId);
    const billingContext = await getTenantBillingContext(input.tenantId);
    return {
      cookie,
      tenant: membership,
      subscription: billingContext.subscription,
      entitlements: billingContext.entitlements,
      allowedLanguages: billingContext.allowedLanguages,
      usage: billingContext.usage,
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
