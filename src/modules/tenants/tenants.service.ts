import { and, eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { badRequest, conflict, notFound } from '../../shared/errors/errors.js';
import { hashPassword } from '../../shared/auth/password.js';
import { tenantMembers, tenants, users } from '../../shared/db/schema.js';
import {
  assertTenantCanInviteRole,
  assignTenantSubscriptionInTx,
  getDefaultPlan,
  getPlanById,
} from '../plans/plans.service.js';

export async function listTenants() {
  return db.select().from(tenants);
}

export async function getTenantById(id: string) {
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0] || null;
}

export async function createTenant(input: {
  name: string;
  slug: string;
  industry?: string;
  timezone: string;
}) {
  const [tenant] = await db.insert(tenants).values(input).returning();
  return tenant;
}

export async function updateTenant(id: string, input: {
  name: string;
  slug: string;
  industry?: string;
  timezone: string;
}) {
  const [tenant] = await db
    .update(tenants)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();

  return tenant;
}

export async function buildUniqueTenantSlug(input: string, tx: any = db) {
  const baseSlug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'tenant';

  let candidate = baseSlug;
  let suffix = 1;

  for (;;) {
    const existing = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, candidate))
      .limit(1);

    if (!existing[0]) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

async function findUserByEmail(email: string, tx: any = db) {
  const result = await tx
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] ?? null;
}

async function addTenantMembershipInternal(
  tenantId: string,
  userId: string,
  role: 'tenant_admin' | 'tenant_manager' | 'tenant_viewer',
  tx: any = db
) {
  const [membership] = await tx
    .insert(tenantMembers)
    .values({
      tenantId,
      userId,
      role,
    })
    .onConflictDoNothing()
    .returning();

  return membership ?? null;
}

async function ensureAdminUser(
  input: { email: string; name: string; password?: string },
  tx: any = db
) {
  const existingUser = await findUserByEmail(input.email, tx);
  if (existingUser) {
    if (existingUser.platformRole) {
      throw conflict('Platform users cannot be reused as tenant admins in this v1 separation model.');
    }

    const [updatedUser] = await tx
      .update(users)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    return updatedUser ?? existingUser;
  }

  if (!input.password) {
    throw badRequest('A password is required when creating a brand-new admin account.');
  }

  const [createdUser] = await tx
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      platformRole: null,
    })
    .returning();

  if (!createdUser) {
    throw conflict('Failed to create the tenant admin user.');
  }

  return createdUser;
}

export async function addTenantAdmin(
  tenantId: string,
  input: { email: string; name: string; password?: string }
) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw notFound('Tenant not found.');
  }

  await assertTenantCanInviteRole(tenantId, 'tenant_admin');

  return db.transaction(async (tx) => {
    const user = await ensureAdminUser(input, tx);
    const existingMembership = await tx
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, user.id)))
      .limit(1);

    if (existingMembership[0]) {
      throw conflict('That user is already a member of this tenant.');
    }

    await addTenantMembershipInternal(tenantId, user.id, 'tenant_admin', tx);
    return user;
  });
}

export async function createTenantWithAdmin(input: {
  tenant: {
    name: string;
    slug?: string;
    industry?: string;
    timezone: string;
  };
  admin: {
    email: string;
    name: string;
    password?: string;
  };
  planId?: string;
  createdBy?: string;
}) {
  return db.transaction(async (tx) => {
    const slug = input.tenant.slug?.trim()
      ? input.tenant.slug.trim()
      : await buildUniqueTenantSlug(input.tenant.name, tx);

    const [tenant] = await tx
      .insert(tenants)
      .values({
        name: input.tenant.name,
        slug,
        industry: input.tenant.industry,
        timezone: input.tenant.timezone,
      })
      .returning();

    if (!tenant) {
      throw conflict('Failed to create tenant.');
    }

    const selectedPlan = input.planId
      ? await getPlanById(input.planId, tx)
      : await getDefaultPlan();
    const planId = selectedPlan?.id;
    if (!planId || !selectedPlan) {
      throw notFound('Plan not found.');
    }

    if (selectedPlan.entitlements.maxAdminSeats < 1 || selectedPlan.entitlements.maxTeamMembers < 1) {
      throw conflict('The selected plan cannot support an initial tenant admin.');
    }

    await assignTenantSubscriptionInTx({
      tenantId: tenant.id,
      planId,
      createdBy: input.createdBy,
    }, tx);

    const user = await ensureAdminUser(input.admin, tx);
    await addTenantMembershipInternal(tenant.id, user.id, 'tenant_admin', tx);

    return {
      tenant,
      admin: user,
    };
  });
}
