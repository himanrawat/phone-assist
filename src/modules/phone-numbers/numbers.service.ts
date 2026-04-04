import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { phoneNumbers } from '../../shared/db/schema.js';

export async function listPhoneNumbers(tenantId: string) {
  return db.select().from(phoneNumbers).where(eq(phoneNumbers.tenantId, tenantId));
}

export async function upsertPhoneNumber(tenantId: string, input: {
  number: string;
  provider: 'twilio';
  providerSid?: string;
  forwardingNumber?: string;
  isActive: boolean;
}) {
  await db
    .insert(phoneNumbers)
    .values({
      tenantId,
      number: input.number,
      provider: input.provider,
      providerSid: input.providerSid,
      forwardingNumber: input.forwardingNumber,
      isActive: input.isActive,
    })
    .onConflictDoUpdate({
      target: phoneNumbers.number,
      set: {
        tenantId,
        provider: input.provider,
        providerSid: input.providerSid,
        forwardingNumber: input.forwardingNumber,
        isActive: input.isActive,
      },
    });

  return listPhoneNumbers(tenantId);
}
