import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../config/database.js';
import { aiAssistants, brandProfiles, tenants } from '../../db/schema.js';
import { asc, eq } from 'drizzle-orm';
import {
  brandProfileInputSchema,
  createAssistantDefaultsForBrand,
} from '../../lib/brand-profile.js';

async function resolveTenant(tenantId?: string) {
  if (tenantId) {
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

  const result = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
    })
    .from(tenants)
    .orderBy(asc(tenants.createdAt))
    .limit(1);

  return result[0] || null;
}

export async function brandRoutes(fastify: FastifyInstance) {
  type BrandRouteParams = {
    tenantId?: string;
  };

  const getBrandHandler = async (
    request: FastifyRequest<{ Params: BrandRouteParams }>,
    reply: FastifyReply
  ) => {
    const tenant = await resolveTenant(request.params?.tenantId);

    if (!tenant) {
      reply.status(404).send({
        error: request.params?.tenantId
          ? 'Tenant not found.'
          : 'No tenants exist yet. Create a tenant before configuring a brand profile.',
      });
      return;
    }

    const result = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.tenantId, tenant.id))
      .limit(1);

    reply.send({ data: result[0] || null, tenant });
  };

  const upsertBrandHandler = async (
    request: FastifyRequest<{ Params: BrandRouteParams; Body: unknown }>,
    reply: FastifyReply
  ) => {
    const tenant = await resolveTenant(request.params?.tenantId);

    if (!tenant) {
      reply.status(404).send({
        error: request.params?.tenantId
          ? 'Tenant not found.'
          : 'No tenants exist yet. Create a tenant before saving a brand profile.',
      });
      return;
    }

    const body = brandProfileInputSchema.parse(request.body);

    const existing = await db
      .select({ id: brandProfiles.id })
      .from(brandProfiles)
      .where(eq(brandProfiles.tenantId, tenant.id))
      .limit(1);

    let result;
    if (existing[0]) {
      [result] = await db
        .update(brandProfiles)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(brandProfiles.tenantId, tenant.id))
        .returning();
    } else {
      [result] = await db
        .insert(brandProfiles)
        .values({ tenantId: tenant.id, ...body })
        .returning();
    }

    const assistantDefaults = createAssistantDefaultsForBrand(body);
    await db
      .insert(aiAssistants)
      .values({
        tenantId: tenant.id,
        ...assistantDefaults,
      })
      .onConflictDoUpdate({
        target: aiAssistants.tenantId,
        set: {
          ...assistantDefaults,
          updatedAt: new Date(),
        },
      });

    reply.send({ success: true, data: result, tenant });
  };

  /**
   * GET /api/v1/admin/brand
   * Get brand profile for the default tenant in phase 1.
   */
  fastify.get('/api/v1/admin/brand', getBrandHandler);

  /**
   * GET /api/v1/admin/tenants/:tenantId/brand
   * Get brand profile for a tenant
   */
  fastify.get('/api/v1/admin/tenants/:tenantId/brand', getBrandHandler);

  /**
   * PUT /api/v1/admin/brand
   * Create or update brand profile for the default tenant in phase 1.
   */
  fastify.put('/api/v1/admin/brand', upsertBrandHandler);

  /**
   * PUT /api/v1/admin/tenants/:tenantId/brand
   * Create or update brand profile for a tenant (upsert)
   */
  fastify.put('/api/v1/admin/tenants/:tenantId/brand', upsertBrandHandler);
}
