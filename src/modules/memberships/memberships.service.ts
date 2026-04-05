import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { tenantInvitations, tenantMembers, users } from '../../shared/db/schema.js';
import { assertTenantCanInviteRole } from '../plans/plans.service.js';

export async function listTenantMembers(tenantId: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(eq(tenantMembers.tenantId, tenantId));
}

export async function createInvitation(input: {
  tenantId: string;
  email: string;
  role: 'tenant_admin' | 'tenant_manager' | 'tenant_viewer';
  invitedBy: string;
}) {
  await assertTenantCanInviteRole(input.tenantId, input.role);

  const [invitation] = await db
    .insert(tenantInvitations)
    .values({
      tenantId: input.tenantId,
      email: input.email,
      role: input.role,
      invitedBy: input.invitedBy,
      token: randomBytes(24).toString('base64url'),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: [tenantInvitations.tenantId, tenantInvitations.email],
      set: {
        role: input.role,
        invitedBy: input.invitedBy,
        token: randomBytes(24).toString('base64url'),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    .returning();

  return invitation;
}
