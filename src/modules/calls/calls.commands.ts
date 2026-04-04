import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { callMessages, calls, contacts } from '../../shared/db/schema.js';

export async function createContact(tenantId: string, phone: string) {
  const [contact] = await db
    .insert(contacts)
    .values({ tenantId, phone })
    .returning();

  return contact;
}

export async function createCallRecord(data: {
  tenantId: string;
  contactId?: string;
  direction: 'inbound' | 'outbound';
  callerNumber: string;
  dialedNumber: string;
  providerCallSid: string;
  provider: 'twilio';
}) {
  const [call] = await db
    .insert(calls)
    .values({
      tenantId: data.tenantId,
      contactId: data.contactId,
      direction: data.direction,
      callerNumber: data.callerNumber,
      dialedNumber: data.dialedNumber,
      providerCallSid: data.providerCallSid,
      provider: data.provider,
      status: 'ringing',
    })
    .returning();

  return call;
}

export async function persistCallMessages(callId: string, callerText: string, assistantText: string) {
  await db.insert(callMessages).values([
    { callId, role: 'caller', content: callerText },
    { callId, role: 'assistant', content: assistantText },
  ]);
}

export async function completeCallRecord(callId: string, data: {
  durationSec: number;
  transcript: string;
}) {
  await db
    .update(calls)
    .set({
      status: 'completed',
      durationSec: data.durationSec,
      transcript: data.transcript,
      endedAt: new Date(),
    })
    .where(eq(calls.id, callId));
}
