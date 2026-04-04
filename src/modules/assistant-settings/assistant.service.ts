import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { aiAssistants, tenants } from '../../shared/db/schema.js';
import { normalizeLanguageTag } from '../calls/call-language.js';

export async function getAssistantSettings(tenantId: string) {
  const result = await db
    .select({
      id: aiAssistants.id,
      tenantId: aiAssistants.tenantId,
      primaryLanguage: aiAssistants.primaryLanguage,
      multilingualEnabled: aiAssistants.multilingualEnabled,
      updatedAt: aiAssistants.updatedAt,
    })
    .from(aiAssistants)
    .where(eq(aiAssistants.tenantId, tenantId))
    .limit(1);

  return result[0] || null;
}

export async function updateAssistantSettings(tenantId: string, input: {
  primaryLanguage: string;
  multilingualEnabled: boolean;
}) {
  const primaryLanguage = normalizeLanguageTag(input.primaryLanguage);

  const [result] = await db
    .insert(aiAssistants)
    .values({
      tenantId,
      primaryLanguage,
      multilingualEnabled: input.multilingualEnabled,
    })
    .onConflictDoUpdate({
      target: aiAssistants.tenantId,
      set: {
        primaryLanguage,
        multilingualEnabled: input.multilingualEnabled,
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

  return result;
}

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
