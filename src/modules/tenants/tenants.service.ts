import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { tenants } from '../../shared/db/schema.js';

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
