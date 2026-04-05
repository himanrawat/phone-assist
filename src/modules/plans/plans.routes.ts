import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePlatformRole, requireTenantRole } from '../../shared/auth/guards.js';
import {
  createPlan,
  getTenantBillingContext,
  listPlans,
  requestUpgrade,
  updatePlan,
  updateTenantLanguageAccess,
  assignTenantSubscription,
} from './plans.service.js';
import {
  planUpsertSchema,
  tenantLanguageAccessSchema,
  tenantSubscriptionAssignSchema,
  upgradeRequestSchema,
} from './plans.schemas.js';

export async function planRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/billing', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    reply.send({ data: await getTenantBillingContext(request.tenant!.id) });
  });

  fastify.get('/api/v1/admin/usage', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, async (request, reply) => {
    const context = await getTenantBillingContext(request.tenant!.id);
    reply.send({ data: context.usage, subscription: context.subscription, entitlements: context.entitlements });
  });

  fastify.post('/api/v1/admin/billing/upgrade-request', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    const body = upgradeRequestSchema.parse(request.body);
    const data = await requestUpgrade({
      tenantId: request.tenant!.id,
      requestedBy: request.user!.id,
      requestedPlanId: body.requestedPlanId,
      message: body.message,
    });

    reply.send({ success: true, data });
  });

  fastify.get('/api/v1/platform/plans', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (_request, reply) => {
    reply.send({ data: await listPlans() });
  });

  fastify.post('/api/v1/platform/plans', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const body = planUpsertSchema.parse(request.body);
    reply.send({ success: true, data: await createPlan(body) });
  });

  fastify.put('/api/v1/platform/plans/:planId', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const { planId } = request.params as { planId: string };
    const body = planUpsertSchema.parse(request.body);
    reply.send({ success: true, data: await updatePlan(planId, body) });
  });

  fastify.get('/api/v1/platform/tenants/:tenantId/subscription', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    reply.send({ data: await getTenantBillingContext(tenantId) });
  });

  fastify.put('/api/v1/platform/tenants/:tenantId/subscription', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = tenantSubscriptionAssignSchema.parse(request.body);
    reply.send({
      success: true,
      data: await assignTenantSubscription({
        tenantId,
        planId: body.planId,
        status: body.status,
        trialDays: body.trialDays,
        createdBy: request.user!.id,
      }),
    });
  });

  fastify.get('/api/v1/platform/tenants/:tenantId/languages', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const context = await getTenantBillingContext(tenantId);
    reply.send({
      data: {
        allowedLanguages: context.allowedLanguages,
        planLanguagePool: context.subscription.plan.entitlements.planLanguagePool,
        maxSelectableLanguages: context.entitlements.maxSelectableLanguages,
        multilingualAvailable: context.entitlements.multilingualSupport,
      },
    });
  });

  fastify.put('/api/v1/platform/tenants/:tenantId/languages', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = tenantLanguageAccessSchema.parse(request.body);
    reply.send({
      success: true,
      data: await updateTenantLanguageAccess({
        tenantId,
        languages: body.languages,
        createdBy: request.user!.id,
      }),
    });
  });
}
