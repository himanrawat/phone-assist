import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { aiAssistants, tenants } from '../../shared/db/schema.js';
import { normalizeLanguageTag } from '../calls/call-language.js';
import { badRequest } from '../../shared/errors/errors.js';
import { getTenantBillingContext, updateTenantLanguageAccess } from '../plans/plans.service.js';

function buildAssistantSettingsResponse(
  settings: {
    id: string;
    tenantId: string;
    primaryLanguage: string;
    multilingualEnabled: boolean;
    updatedAt: Date;
  } | null,
  billingContext: Awaited<ReturnType<typeof getTenantBillingContext>>
) {
  return {
    settings: settings
      ? {
          ...settings,
          multilingualEnabled:
            settings.multilingualEnabled && billingContext.entitlements.multilingualSupport,
        }
      : null,
    allowedLanguages: billingContext.allowedLanguages,
    planLanguagePool: billingContext.subscription.plan.entitlements.planLanguagePool,
    maxSelectableLanguages: billingContext.entitlements.maxSelectableLanguages,
    multilingualAvailable: billingContext.entitlements.multilingualSupport,
  };
}

export async function getAssistantSettings(tenantId: string) {
  const billingContext = await getTenantBillingContext(tenantId);
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

  return buildAssistantSettingsResponse(result[0] || null, billingContext);
}

export async function updateAssistantSettings(tenantId: string, input: {
  primaryLanguage: string;
  multilingualEnabled: boolean;
  allowedLanguages?: string[];
}) {
  const primaryLanguage = normalizeLanguageTag(input.primaryLanguage);
  const billingContext = input.allowedLanguages
    ? await updateTenantLanguageAccess({
        tenantId,
        languages: input.allowedLanguages,
      })
    : await getTenantBillingContext(tenantId);

  if (!billingContext.allowedLanguages.includes(primaryLanguage)) {
    throw badRequest('The selected primary language is not allowed for this tenant.', {
      allowedLanguages: billingContext.allowedLanguages,
      requestedLanguage: primaryLanguage,
    });
  }

  if (input.multilingualEnabled && !billingContext.entitlements.multilingualSupport) {
    throw badRequest('Multilingual Support is not enabled for this tenant plan.', {
      multilingualAvailable: billingContext.entitlements.multilingualSupport,
    });
  }

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

  return buildAssistantSettingsResponse(result ?? null, billingContext);
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
