import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { aiAssistants, tenants } from '../../db/schema.js';
import { normalizeLanguageTag } from '../../services/call/call-language.js';

const assistantSettingsSchema = z.object({
  primaryLanguage: z.string().trim().min(1).max(16),
  multilingualEnabled: z.boolean(),
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

export async function assistantRoutes(fastify: FastifyInstance) {
  type AssistantRouteParams = {
    tenantId?: string;
  };

  const getAssistantHandler = async (
    request: FastifyRequest<{ Params: AssistantRouteParams }>,
    reply: FastifyReply
  ) => {
    const tenant = await resolveTenant(request.params?.tenantId);

    if (!tenant) {
      reply.status(404).send({
        error: request.params?.tenantId
          ? 'Tenant not found.'
          : 'No tenants exist yet. Create a tenant before configuring assistant settings.',
      });
      return;
    }

    const result = await db
      .select({
        id: aiAssistants.id,
        tenantId: aiAssistants.tenantId,
        primaryLanguage: aiAssistants.primaryLanguage,
        multilingualEnabled: aiAssistants.multilingualEnabled,
        updatedAt: aiAssistants.updatedAt,
      })
      .from(aiAssistants)
      .where(eq(aiAssistants.tenantId, tenant.id))
      .limit(1);

    reply.send({ data: result[0] || null, tenant });
  };

  const updateAssistantHandler = async (
    request: FastifyRequest<{ Params: AssistantRouteParams; Body: unknown }>,
    reply: FastifyReply
  ) => {
    const tenant = await resolveTenant(request.params?.tenantId);

    if (!tenant) {
      reply.status(404).send({
        error: request.params?.tenantId
          ? 'Tenant not found.'
          : 'No tenants exist yet. Create a tenant before saving assistant settings.',
      });
      return;
    }

    const body = assistantSettingsSchema.parse(request.body);
    const primaryLanguage = normalizeLanguageTag(body.primaryLanguage);

    const [result] = await db
      .insert(aiAssistants)
      .values({
        tenantId: tenant.id,
        primaryLanguage,
        multilingualEnabled: body.multilingualEnabled,
      })
      .onConflictDoUpdate({
        target: aiAssistants.tenantId,
        set: {
          primaryLanguage,
          multilingualEnabled: body.multilingualEnabled,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: aiAssistants.id,
        tenantId: aiAssistants.tenantId,
        primaryLanguage: aiAssistants.primaryLanguage,
        multilingualEnabled: aiAssistants.multilingualEnabled,
        updatedAt: aiAssistants.updatedAt,
      });

    reply.send({ success: true, data: result, tenant });
  };

  fastify.get('/api/v1/admin/assistant', getAssistantHandler);
  fastify.get('/api/v1/admin/tenants/:tenantId/assistant', getAssistantHandler);
  fastify.put('/api/v1/admin/assistant', updateAssistantHandler);
  fastify.put('/api/v1/admin/tenants/:tenantId/assistant', updateAssistantHandler);
}
