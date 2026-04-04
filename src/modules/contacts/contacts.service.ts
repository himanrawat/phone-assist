import { and, eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { contacts } from '../../shared/db/schema.js';

export async function listContacts(tenantId: string) {
  return db.select().from(contacts).where(eq(contacts.tenantId, tenantId));
}

export async function getContact(tenantId: string, contactId: string) {
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, contactId)))
    .limit(1);

  return result[0] || null;
}

export async function upsertContact(
  tenantId: string,
  input: {
    id?: string;
    name?: string;
    phone: string;
    email?: string;
    company?: string;
    tags: string[];
    isVip: boolean;
    isBlocked: boolean;
    notes?: string;
  }
) {
  if (input.id) {
    const [contact] = await db
      .update(contacts)
      .set({
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        company: input.company,
        tags: input.tags,
        isVip: input.isVip,
        isBlocked: input.isBlocked,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, input.id)))
      .returning();

    return contact;
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      tenantId,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      company: input.company,
      tags: input.tags,
      isVip: input.isVip,
      isBlocked: input.isBlocked,
      notes: input.notes,
    })
    .returning();

  return contact;
}
