import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { aiAssistants, brandProfiles, tenants } from '../../shared/db/schema.js';
import { createAssistantDefaultsForBrand, type BrandProfileInput } from './brand.schemas.js';

export async function getTenantSummary(tenantId: string) {
  const result = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return result[0] || null;
}

export async function getBrandProfileByTenantId(tenantId: string) {
  const result = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.tenantId, tenantId))
    .limit(1);

  return result[0] || null;
}

export async function upsertBrandProfile(tenantId: string, body: BrandProfileInput) {
  const existing = await db
    .select({ id: brandProfiles.id })
    .from(brandProfiles)
    .where(eq(brandProfiles.tenantId, tenantId))
    .limit(1);

  let result;
  if (existing[0]) {
    [result] = await db
      .update(brandProfiles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(brandProfiles.tenantId, tenantId))
      .returning();
  } else {
    [result] = await db
      .insert(brandProfiles)
      .values({ tenantId, ...body })
      .returning();
  }

  const assistantDefaults = createAssistantDefaultsForBrand(body);
  await db
    .insert(aiAssistants)
    .values({
      tenantId,
      ...assistantDefaults,
    })
    .onConflictDoUpdate({
      target: aiAssistants.tenantId,
      set: {
        ...assistantDefaults,
        updatedAt: new Date(),
      },
    });

  return result;
}
