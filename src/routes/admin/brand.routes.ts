import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../config/database.js';
import { brandProfiles, tenants } from '../../db/schema.js';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

const addressSchema = z.object({
  label: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().optional(),
});

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.string().optional(),
  duration: z.string().optional(),
});

const policySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const staffSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  department: z.string().optional(),
  specialty: z.string().optional(),
});

const brandVoiceSchema = z.object({
  toneKeywords: z.array(z.string()).default([]),
  wordsToUse: z.array(z.string()).default([]),
  wordsToAvoid: z.array(z.string()).default([]),
  samplePhrases: z.array(z.string()).default([]),
});

const escalationRuleSchema = z.object({
  trigger: z.string().min(1),
  action: z.string().min(1),
});

const upsertBrandSchema = z.object({
  businessName: z.string().min(1),
  tagline: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  addresses: z.array(addressSchema).default([]),
  services: z.array(serviceSchema).default([]),
  policies: z.array(policySchema).default([]),
  faqs: z.array(faqSchema).default([]),
  staff: z.array(staffSchema).default([]),
  brandVoice: brandVoiceSchema.default({ toneKeywords: [], wordsToUse: [], wordsToAvoid: [], samplePhrases: [] }),
  escalationRules: z.array(escalationRuleSchema).default([]),
});

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

    const body = upsertBrandSchema.parse(request.body);

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
