import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import {
  aiAssistants,
  brandProfiles,
  callMessages,
  calls,
  contacts,
  phoneNumbers,
  tenants,
} from '../../shared/db/schema.js';

export async function listCallsByTenant(tenantId: string, limit: number, offset: number) {
  return db
    .select()
    .from(calls)
    .where(eq(calls.tenantId, tenantId))
    .orderBy(desc(calls.startedAt))
    .limit(limit)
    .offset(offset);
}

export async function getCallByIdForTenant(callId: string, tenantId: string) {
  const result = await db
    .select()
    .from(calls)
    .where(and(eq(calls.id, callId), eq(calls.tenantId, tenantId)))
    .limit(1);

  return result[0] || null;
}

export async function getCallMessages(callId: string) {
  return db
    .select()
    .from(callMessages)
    .where(eq(callMessages.callId, callId))
    .orderBy(callMessages.timestamp);
}

export async function getRecordingKeyForTenantCall(callId: string, tenantId: string) {
  const result = await db
    .select({ recordingKey: calls.recordingKey })
    .from(calls)
    .where(and(eq(calls.id, callId), eq(calls.tenantId, tenantId)))
    .limit(1);

  return result[0]?.recordingKey || null;
}

export async function findTenantByNumber(dialedNumber: string) {
  const result = await db
    .select({
      phoneNumber: phoneNumbers,
      tenant: tenants,
    })
    .from(phoneNumbers)
    .innerJoin(tenants, eq(phoneNumbers.tenantId, tenants.id))
    .where(
      and(
        eq(phoneNumbers.number, dialedNumber),
        eq(phoneNumbers.isActive, true),
        eq(tenants.isActive, true)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getAssistantConfig(tenantId: string) {
  const result = await db
    .select()
    .from(aiAssistants)
    .where(eq(aiAssistants.tenantId, tenantId))
    .limit(1);

  return result[0] || null;
}

export async function getBrandProfile(tenantId: string) {
  const result = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.tenantId, tenantId))
    .limit(1);

  return result[0] || null;
}

export async function findContactByPhone(tenantId: string, phone: string) {
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.phone, phone)))
    .limit(1);

  return result[0] || null;
}
