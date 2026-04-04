import type { FastifyInstance } from 'fastify';
import { requireAuth, requireTenantRole } from '../../shared/auth/guards.js';
import { notFound } from '../../shared/errors/errors.js';
import { contactUpsertSchema } from './contacts.schemas.js';
import { getContact, listContacts, upsertContact } from './contacts.service.js';

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/contacts', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, async (request, reply) => {
    reply.send({ data: await listContacts(request.tenant!.id) });
  });

  fastify.get('/api/v1/admin/contacts/:id', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const contact = await getContact(request.tenant!.id, id);
    if (!contact) {
      throw notFound('Contact not found.');
    }
    reply.send({ data: contact });
  });

  fastify.post('/api/v1/admin/contacts', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager')],
  }, async (request, reply) => {
    const body = contactUpsertSchema.parse(request.body);
    reply.send({ success: true, data: await upsertContact(request.tenant!.id, body) });
  });

  fastify.put('/api/v1/admin/contacts/:id', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = contactUpsertSchema.parse(request.body);
    const contact = await upsertContact(request.tenant!.id, { ...body, id });
    if (!contact) {
      throw notFound('Contact not found.');
    }
    reply.send({ success: true, data: contact });
  });
}
