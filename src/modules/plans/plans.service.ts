import { and, asc, count, eq, inArray, isNull, lt } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { badRequest, conflict, notFound } from '../../shared/errors/errors.js';
import { logger } from '../../shared/logging/logger.js';
import {
  calls,
  phoneNumbers,
  planEntitlements,
  plans,
  tenantInvitations,
  tenantLanguageAccess,
  tenantMembers,
  tenantSubscriptionOverrides,
  tenantSubscriptions,
  tenantUpgradeRequests,
  tenantUsageRollups,
  tenants,
  users,
} from '../../shared/db/schema.js';

type PlanDefinition = {
  name: string;
  slug: string;
  description: string;
  monthlyPriceCents: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  entitlements: {
    maxAdminSeats: number;
    maxTeamMembers: number;
    maxPhoneNumbers: number;
    includedMinutesPerPeriod: number;
    maxConcurrentCalls: number;
    maxSelectableLanguages: number;
    planLanguagePool: string[];
    dataRetentionDays: number;
    apiAccess: boolean;
    advancedAnalytics: boolean;
    auditLogs: boolean;
    outboundEnabled: boolean;
    multilingualSupport: boolean;
  };
};

const SUPPORTED_LANGUAGE_CODES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'nl',
  'ja',
  'ko',
  'zh',
  'ar',
  'hi',
] as const;

const DEFAULT_PLANS: PlanDefinition[] = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Single-location plan for small teams getting started with AI call handling.',
    monthlyPriceCents: 9900,
    currency: 'USD',
    trialDays: 14,
    isActive: true,
    isDefault: true,
    sortOrder: 0,
    entitlements: {
      maxAdminSeats: 1,
      maxTeamMembers: 3,
      maxPhoneNumbers: 1,
      includedMinutesPerPeriod: 250,
      maxConcurrentCalls: 1,
      maxSelectableLanguages: 2,
      planLanguagePool: [...SUPPORTED_LANGUAGE_CODES],
      dataRetentionDays: 30,
      apiAccess: false,
      advancedAnalytics: false,
      auditLogs: false,
      outboundEnabled: false,
      multilingualSupport: false,
    },
  },
  {
    name: 'Growth',
    slug: 'growth',
    description: 'Multi-user plan with richer language coverage and outbound calling.',
    monthlyPriceCents: 29900,
    currency: 'USD',
    trialDays: 14,
    isActive: true,
    isDefault: false,
    sortOrder: 1,
    entitlements: {
      maxAdminSeats: 2,
      maxTeamMembers: 10,
      maxPhoneNumbers: 3,
      includedMinutesPerPeriod: 1200,
      maxConcurrentCalls: 3,
      maxSelectableLanguages: 5,
      planLanguagePool: [...SUPPORTED_LANGUAGE_CODES],
      dataRetentionDays: 90,
      apiAccess: true,
      advancedAnalytics: true,
      auditLogs: false,
      outboundEnabled: true,
      multilingualSupport: true,
    },
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'High-capacity plan with broad language access and enterprise controls.',
    monthlyPriceCents: 99900,
    currency: 'USD',
    trialDays: 30,
    isActive: true,
    isDefault: false,
    sortOrder: 2,
    entitlements: {
      maxAdminSeats: 10,
      maxTeamMembers: 100,
      maxPhoneNumbers: 25,
      includedMinutesPerPeriod: 10000,
      maxConcurrentCalls: 25,
      maxSelectableLanguages: SUPPORTED_LANGUAGE_CODES.length,
      planLanguagePool: [...SUPPORTED_LANGUAGE_CODES],
      dataRetentionDays: 365,
      apiAccess: true,
      advancedAnalytics: true,
      auditLogs: true,
      outboundEnabled: true,
      multilingualSupport: true,
    },
  },
];

const STALE_ACTIVE_CALL_THRESHOLD_MS = 12 * 60 * 60 * 1000;

export interface EffectiveEntitlements {
  maxAdminSeats: number;
  maxTeamMembers: number;
  maxPhoneNumbers: number;
  includedMinutesPerPeriod: number;
  maxConcurrentCalls: number;
  maxSelectableLanguages: number;
  planLanguagePool: string[];
  tenantLanguageSubset: string[];
  dataRetentionDays: number;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  auditLogs: boolean;
  outboundEnabled: boolean;
  multilingualSupport: boolean;
  overageEnabled: boolean;
}

export interface TenantPlanSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPriceCents: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  entitlements: Omit<EffectiveEntitlements, 'tenantLanguageSubset' | 'overageEnabled'>;
}

export interface TenantSubscriptionSummary {
  id: string;
  tenantId: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  billingProvider: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  startedAt: string;
  trialEndsAt: string | null;
  plan: TenantPlanSummary;
}

export interface TenantUsageSummary {
  periodStart: string;
  periodEnd: string;
  totalCalls: number;
  totalDurationSec: number;
  usedMinutes: number;
  remainingMinutes: number;
}

export interface TenantBillingContext {
  subscription: TenantSubscriptionSummary;
  entitlements: EffectiveEntitlements;
  usage: TenantUsageSummary;
  allowedLanguages: string[];
}

function normalizeLanguageTag(value: string) {
  return value.trim().toLowerCase();
}

function normalizeLanguageList(input: string[]) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const rawValue of input) {
    const value = normalizeLanguageTag(rawValue);
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    values.push(value);
  }

  return values;
}

function defaultLanguageSubset(pool: string[]) {
  const normalizedPool = normalizeLanguageList(pool);
  if (normalizedPool.length === 0) {
    return ['en'];
  }

  if (normalizedPool.includes('en')) {
    return ['en'];
  }

  return normalizedPool.slice(0, 1);
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function toIso(value: Date) {
  return value.toISOString();
}

function computeUsedMinutes(totalDurationSec: number) {
  return Math.ceil(totalDurationSec / 60);
}

function buildPlanSummary(planRow: any, entitlementRow: any): TenantPlanSummary {
  return {
    id: planRow.id,
    name: planRow.name,
    slug: planRow.slug,
    description: planRow.description,
    monthlyPriceCents: planRow.monthlyPriceCents,
    currency: planRow.currency,
    trialDays: planRow.trialDays,
    isActive: planRow.isActive,
    isDefault: planRow.isDefault,
    sortOrder: planRow.sortOrder,
    entitlements: {
      maxAdminSeats: entitlementRow.maxAdminSeats,
      maxTeamMembers: entitlementRow.maxTeamMembers,
      maxPhoneNumbers: entitlementRow.maxPhoneNumbers,
      includedMinutesPerPeriod: entitlementRow.includedMinutesPerPeriod,
      maxConcurrentCalls: entitlementRow.maxConcurrentCalls,
      maxSelectableLanguages: entitlementRow.maxSelectableLanguages,
      planLanguagePool: normalizeLanguageList(entitlementRow.planLanguagePool ?? []),
      dataRetentionDays: entitlementRow.dataRetentionDays,
      apiAccess: entitlementRow.apiAccess,
      advancedAnalytics: entitlementRow.advancedAnalytics,
      auditLogs: entitlementRow.auditLogs,
      outboundEnabled: entitlementRow.outboundEnabled,
      multilingualSupport: entitlementRow.multilingualSupport,
    },
  };
}

function buildEffectiveEntitlements(
  planSummary: TenantPlanSummary,
  overrideRow: any,
  allowedLanguages: string[]
): EffectiveEntitlements {
  return {
    maxAdminSeats: overrideRow?.maxAdminSeats ?? planSummary.entitlements.maxAdminSeats,
    maxTeamMembers: overrideRow?.maxTeamMembers ?? planSummary.entitlements.maxTeamMembers,
    maxPhoneNumbers: overrideRow?.maxPhoneNumbers ?? planSummary.entitlements.maxPhoneNumbers,
    includedMinutesPerPeriod:
      overrideRow?.includedMinutesPerPeriod ?? planSummary.entitlements.includedMinutesPerPeriod,
    maxConcurrentCalls: overrideRow?.maxConcurrentCalls ?? planSummary.entitlements.maxConcurrentCalls,
    maxSelectableLanguages:
      overrideRow?.maxSelectableLanguages ?? planSummary.entitlements.maxSelectableLanguages,
    planLanguagePool: planSummary.entitlements.planLanguagePool,
    tenantLanguageSubset: allowedLanguages,
    dataRetentionDays: overrideRow?.dataRetentionDays ?? planSummary.entitlements.dataRetentionDays,
    apiAccess: overrideRow?.apiAccess ?? planSummary.entitlements.apiAccess,
    advancedAnalytics: overrideRow?.advancedAnalytics ?? planSummary.entitlements.advancedAnalytics,
    auditLogs: overrideRow?.auditLogs ?? planSummary.entitlements.auditLogs,
    outboundEnabled: overrideRow?.outboundEnabled ?? planSummary.entitlements.outboundEnabled,
    multilingualSupport:
      overrideRow?.multilingualSupport ?? planSummary.entitlements.multilingualSupport,
    overageEnabled: overrideRow?.overageEnabled ?? false,
  };
}

async function getPlanWithEntitlementsBySlug(slug: string, tx: any = db) {
  const result = await tx
    .select({
      plan: plans,
      entitlements: planEntitlements,
    })
    .from(plans)
    .innerJoin(planEntitlements, eq(planEntitlements.planId, plans.id))
    .where(eq(plans.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

async function getPlanWithEntitlementsById(planId: string, tx: any = db) {
  const result = await tx
    .select({
      plan: plans,
      entitlements: planEntitlements,
    })
    .from(plans)
    .innerJoin(planEntitlements, eq(planEntitlements.planId, plans.id))
    .where(eq(plans.id, planId))
    .limit(1);

  return result[0] ?? null;
}

export async function getPlanById(planId: string, tx: any = db) {
  const state = await getPlanWithEntitlementsById(planId, tx);
  if (!state) {
    return null;
  }

  return buildPlanSummary(state.plan, state.entitlements);
}

async function selectTenantLanguageRows(tenantId: string, tx: any = db) {
  return tx
    .select({
      language: tenantLanguageAccess.language,
    })
    .from(tenantLanguageAccess)
    .where(eq(tenantLanguageAccess.tenantId, tenantId))
    .orderBy(asc(tenantLanguageAccess.createdAt));
}

async function ensureUsageRollup(subscriptionRow: any, tx: any = db) {
  await tx
    .insert(tenantUsageRollups)
    .values({
      tenantId: subscriptionRow.tenantId,
      tenantSubscriptionId: subscriptionRow.id,
      periodStart: subscriptionRow.currentPeriodStart,
      periodEnd: subscriptionRow.currentPeriodEnd,
    })
    .onConflictDoNothing();

  const result = await tx
    .select()
    .from(tenantUsageRollups)
    .where(
      and(
        eq(tenantUsageRollups.tenantSubscriptionId, subscriptionRow.id),
        eq(tenantUsageRollups.periodStart, subscriptionRow.currentPeriodStart),
        eq(tenantUsageRollups.periodEnd, subscriptionRow.currentPeriodEnd)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

async function refreshSubscriptionPeriodIfNeeded(subscriptionRow: any, tx: any = db) {
  const now = new Date();
  if (subscriptionRow.currentPeriodEnd.getTime() > now.getTime()) {
    return subscriptionRow;
  }

  let currentPeriodStart = new Date(subscriptionRow.currentPeriodStart);
  let currentPeriodEnd = new Date(subscriptionRow.currentPeriodEnd);
  while (currentPeriodEnd.getTime() <= now.getTime()) {
    currentPeriodStart = currentPeriodEnd;
    currentPeriodEnd = addMonths(currentPeriodStart, 1);
  }

  const nextStatus =
    subscriptionRow.status === 'trial'
      && subscriptionRow.trialEndsAt
      && subscriptionRow.trialEndsAt.getTime() <= now.getTime()
      ? 'active'
      : subscriptionRow.status;

  const [updated] = await tx
    .update(tenantSubscriptions)
    .set({
      currentPeriodStart,
      currentPeriodEnd,
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(tenantSubscriptions.id, subscriptionRow.id))
    .returning();

  return updated ?? subscriptionRow;
}

async function loadTenantSubscriptionState(tenantId: string, tx: any = db) {
  const result = await tx
    .select({
      subscription: tenantSubscriptions,
      plan: plans,
      entitlements: planEntitlements,
      overrides: tenantSubscriptionOverrides,
    })
    .from(tenantSubscriptions)
    .innerJoin(plans, eq(plans.id, tenantSubscriptions.planId))
    .innerJoin(planEntitlements, eq(planEntitlements.planId, plans.id))
    .leftJoin(
      tenantSubscriptionOverrides,
      eq(tenantSubscriptionOverrides.tenantSubscriptionId, tenantSubscriptions.id)
    )
    .where(eq(tenantSubscriptions.tenantId, tenantId))
    .limit(1);

  return result[0] ?? null;
}

async function setTenantLanguageAccessInternal(
  tenantId: string,
  planLanguagePool: string[],
  maxSelectableLanguages: number,
  languages: string[],
  createdBy?: string,
  tx: any = db
) {
  const normalizedPool = normalizeLanguageList(planLanguagePool);
  const normalizedLanguages = normalizeLanguageList(languages);

  if (normalizedPool.length === 0) {
    throw badRequest('The selected plan does not include any languages.');
  }

  if (normalizedLanguages.length === 0) {
    throw badRequest('Choose at least one allowed language.');
  }

  if (normalizedLanguages.length > maxSelectableLanguages) {
    throw badRequest(`Choose up to ${maxSelectableLanguages} allowed languages.`, {
      maxSelectableLanguages,
      requestedLanguages: normalizedLanguages,
    });
  }

  const invalidLanguages = normalizedLanguages.filter((language) => !normalizedPool.includes(language));
  if (invalidLanguages.length > 0) {
    throw badRequest('One or more selected languages are not included in the current plan.', {
      invalidLanguages,
      allowedLanguages: normalizedPool,
    });
  }

  await tx.delete(tenantLanguageAccess).where(eq(tenantLanguageAccess.tenantId, tenantId));

  await tx.insert(tenantLanguageAccess).values(
    normalizedLanguages.map((language) => ({
      tenantId,
      language,
      createdBy: createdBy ?? null,
    }))
  );

  return normalizedLanguages;
}

async function assignSubscriptionInternal(
  input: {
    tenantId: string;
    planId: string;
    status?: 'trial' | 'active' | 'suspended' | 'cancelled';
    trialDays?: number;
    createdBy?: string;
  },
  tx: any = db
) {
  const planState = await getPlanWithEntitlementsById(input.planId, tx);
  if (!planState) {
    throw notFound('Plan not found.');
  }

  const now = new Date();
  const currentPeriodStart = now;
  const currentPeriodEnd = addMonths(currentPeriodStart, 1);
  const status =
    input.status
    ?? ((input.trialDays ?? planState.plan.trialDays) > 0 ? 'trial' : 'active');
  const trialDays = input.trialDays ?? planState.plan.trialDays;
  const trialEndsAt = status === 'trial' && trialDays > 0
    ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
    : null;

  const [subscription] = await tx
    .insert(tenantSubscriptions)
    .values({
      tenantId: input.tenantId,
      planId: input.planId,
      status,
      billingProvider: 'manual',
      currentPeriodStart,
      currentPeriodEnd,
      startedAt: now,
      trialEndsAt,
      createdBy: input.createdBy ?? null,
    })
    .onConflictDoUpdate({
      target: tenantSubscriptions.tenantId,
      set: {
        planId: input.planId,
        status,
        billingProvider: 'manual',
        currentPeriodStart,
        currentPeriodEnd,
        startedAt: now,
        trialEndsAt,
        createdBy: input.createdBy ?? null,
        updatedAt: now,
      },
    })
    .returning();

  if (!subscription) {
    throw conflict('Failed to assign subscription.');
  }

  const existingLanguageRows = await selectTenantLanguageRows(input.tenantId, tx);
  const existingLanguages = existingLanguageRows.map((row: { language: string }) => row.language);
  const normalizedPool = normalizeLanguageList(planState.entitlements.planLanguagePool ?? []);
  const nextLanguages = existingLanguages
    .map((language: string) => normalizeLanguageTag(language))
    .filter((language: string) => normalizedPool.includes(language));

  await setTenantLanguageAccessInternal(
    input.tenantId,
    normalizedPool,
    planState.entitlements.maxSelectableLanguages,
    nextLanguages.length > 0 ? nextLanguages : defaultLanguageSubset(normalizedPool),
    input.createdBy,
    tx
  );

  await ensureUsageRollup(subscription, tx);

  return subscription;
}

export async function ensureDefaultPlans() {
  await db.transaction(async (tx) => {
    for (const definition of DEFAULT_PLANS) {
      if (definition.isDefault) {
        await tx.update(plans).set({ isDefault: false }).where(eq(plans.isDefault, true));
      }

      const [planRow] = await tx
        .insert(plans)
        .values({
          name: definition.name,
          slug: definition.slug,
          description: definition.description,
          monthlyPriceCents: definition.monthlyPriceCents,
          currency: definition.currency,
          trialDays: definition.trialDays,
          isActive: definition.isActive,
          isDefault: definition.isDefault,
          sortOrder: definition.sortOrder,
        })
        .onConflictDoUpdate({
          target: plans.slug,
          set: {
            name: definition.name,
            description: definition.description,
            monthlyPriceCents: definition.monthlyPriceCents,
            currency: definition.currency,
            trialDays: definition.trialDays,
            isActive: definition.isActive,
            isDefault: definition.isDefault,
            sortOrder: definition.sortOrder,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!planRow) {
        throw conflict(`Failed to sync the ${definition.name} plan.`);
      }

      await tx
        .insert(planEntitlements)
        .values({
          planId: planRow.id,
          ...definition.entitlements,
        })
        .onConflictDoUpdate({
          target: planEntitlements.planId,
          set: {
            ...definition.entitlements,
            updatedAt: new Date(),
          },
        });
    }
  });
}

export async function listPlans() {
  const rows = await db
    .select({
      plan: plans,
      entitlements: planEntitlements,
    })
    .from(plans)
    .innerJoin(planEntitlements, eq(planEntitlements.planId, plans.id))
    .orderBy(asc(plans.sortOrder), asc(plans.name));

  return rows.map((row) => buildPlanSummary(row.plan, row.entitlements));
}

export async function createPlan(input: {
  name: string;
  slug: string;
  description?: string;
  monthlyPriceCents: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  entitlements: Omit<EffectiveEntitlements, 'tenantLanguageSubset' | 'overageEnabled'>;
}) {
  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx.update(plans).set({ isDefault: false }).where(eq(plans.isDefault, true));
    }

    const [planRow] = await tx
      .insert(plans)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        monthlyPriceCents: input.monthlyPriceCents,
        currency: input.currency,
        trialDays: input.trialDays,
        isActive: input.isActive,
        isDefault: input.isDefault,
        sortOrder: input.sortOrder,
      })
      .returning();

    if (!planRow) {
      throw conflict('Failed to create plan.');
    }

    const normalizedLanguages = normalizeLanguageList(input.entitlements.planLanguagePool);
    await tx.insert(planEntitlements).values({
      planId: planRow.id,
      ...input.entitlements,
      planLanguagePool: normalizedLanguages,
    });

    return buildPlanSummary(
      planRow,
      {
        ...input.entitlements,
        planLanguagePool: normalizedLanguages,
      }
    );
  });
}

export async function updatePlan(
  planId: string,
  input: {
    name: string;
    slug: string;
    description?: string;
    monthlyPriceCents: number;
    currency: string;
    trialDays: number;
    isActive: boolean;
    isDefault: boolean;
    sortOrder: number;
    entitlements: Omit<EffectiveEntitlements, 'tenantLanguageSubset' | 'overageEnabled'>;
  }
) {
  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx.update(plans).set({ isDefault: false }).where(eq(plans.isDefault, true));
    }

    const [planRow] = await tx
      .update(plans)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        monthlyPriceCents: input.monthlyPriceCents,
        currency: input.currency,
        trialDays: input.trialDays,
        isActive: input.isActive,
        isDefault: input.isDefault,
        sortOrder: input.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, planId))
      .returning();

    if (!planRow) {
      throw notFound('Plan not found.');
    }

    const normalizedLanguages = normalizeLanguageList(input.entitlements.planLanguagePool);
    const [entitlementRow] = await tx
      .insert(planEntitlements)
      .values({
        planId,
        ...input.entitlements,
        planLanguagePool: normalizedLanguages,
      })
      .onConflictDoUpdate({
        target: planEntitlements.planId,
        set: {
          ...input.entitlements,
          planLanguagePool: normalizedLanguages,
          updatedAt: new Date(),
        },
      })
      .returning();

    return buildPlanSummary(planRow, entitlementRow);
  });
}

export async function getDefaultPlan() {
  const result = await db
    .select({
      plan: plans,
      entitlements: planEntitlements,
    })
    .from(plans)
    .innerJoin(planEntitlements, eq(planEntitlements.planId, plans.id))
    .where(eq(plans.isDefault, true))
    .limit(1);

  if (result[0]) {
    return buildPlanSummary(result[0].plan, result[0].entitlements);
  }

  await ensureDefaultPlans();
  const fallback = await getPlanWithEntitlementsBySlug('starter');
  if (!fallback) {
    throw notFound('Default plan not found.');
  }

  return buildPlanSummary(fallback.plan, fallback.entitlements);
}

export async function ensureTenantSubscription(tenantId: string, createdBy?: string) {
  const existing = await loadTenantSubscriptionState(tenantId);
  if (existing) {
    return existing.subscription;
  }

  const defaultPlan = await getDefaultPlan();
  return assignSubscriptionInternal(
    {
      tenantId,
      planId: defaultPlan.id,
      createdBy,
    }
  );
}

export async function assignTenantSubscriptionInTx(
  input: {
    tenantId: string;
    planId: string;
    status?: 'trial' | 'active' | 'suspended' | 'cancelled';
    trialDays?: number;
    createdBy?: string;
  },
  tx: any
) {
  return assignSubscriptionInternal(input, tx);
}

export async function assignTenantSubscription(input: {
  tenantId: string;
  planId: string;
  status?: 'trial' | 'active' | 'suspended' | 'cancelled';
  trialDays?: number;
  createdBy?: string;
}) {
  await assignSubscriptionInternal(input);
  return getTenantBillingContext(input.tenantId);
}

export async function updateTenantLanguageAccess(input: {
  tenantId: string;
  languages: string[];
  createdBy?: string;
}) {
  await db.transaction(async (tx) => {
    let state = await loadTenantSubscriptionState(input.tenantId, tx);
    if (!state) {
      const defaultPlan = await getDefaultPlan();
      await assignSubscriptionInternal(
        {
          tenantId: input.tenantId,
          planId: defaultPlan.id,
          createdBy: input.createdBy,
        },
        tx
      );
      state = await loadTenantSubscriptionState(input.tenantId, tx);
    }

    if (!state) {
      throw notFound('Tenant subscription not found.');
    }

    await setTenantLanguageAccessInternal(
      input.tenantId,
      state.entitlements.planLanguagePool ?? [],
      state.entitlements.maxSelectableLanguages ?? 1,
      input.languages,
      input.createdBy,
      tx
    );
  });

  return getTenantBillingContext(input.tenantId);
}

export async function getTenantBillingContext(tenantId: string): Promise<TenantBillingContext> {
  await ensureTenantSubscription(tenantId);

  return db.transaction(async (tx) => {
    const loaded = await loadTenantSubscriptionState(tenantId, tx);
    if (!loaded) {
      throw notFound('Tenant subscription not found.');
    }

    const subscriptionRow = await refreshSubscriptionPeriodIfNeeded(loaded.subscription, tx);
    const rollup = await ensureUsageRollup(subscriptionRow, tx);
    const languageRows = await selectTenantLanguageRows(tenantId, tx);

    const planSummary = buildPlanSummary(loaded.plan, loaded.entitlements);
    const allowedLanguages = normalizeLanguageList(
      languageRows.length > 0
        ? languageRows.map((row: { language: string }) => row.language)
        : defaultLanguageSubset(planSummary.entitlements.planLanguagePool)
    );

    if (languageRows.length === 0) {
      await setTenantLanguageAccessInternal(
        tenantId,
        planSummary.entitlements.planLanguagePool,
        planSummary.entitlements.maxSelectableLanguages,
        allowedLanguages,
        undefined,
        tx
      );
    }

    const entitlements = buildEffectiveEntitlements(planSummary, loaded.overrides, allowedLanguages);
    const totalDurationSec = rollup?.totalDurationSec ?? 0;
    const usedMinutes = computeUsedMinutes(totalDurationSec);

    return {
      subscription: {
        id: subscriptionRow.id,
        tenantId: subscriptionRow.tenantId,
        status: subscriptionRow.status,
        billingProvider: subscriptionRow.billingProvider,
        currentPeriodStart: toIso(subscriptionRow.currentPeriodStart),
        currentPeriodEnd: toIso(subscriptionRow.currentPeriodEnd),
        startedAt: toIso(subscriptionRow.startedAt),
        trialEndsAt: subscriptionRow.trialEndsAt ? toIso(subscriptionRow.trialEndsAt) : null,
        plan: planSummary,
      },
      entitlements,
      usage: {
        periodStart: toIso(subscriptionRow.currentPeriodStart),
        periodEnd: toIso(subscriptionRow.currentPeriodEnd),
        totalCalls: rollup?.totalCalls ?? 0,
        totalDurationSec,
        usedMinutes,
        remainingMinutes: Math.max(entitlements.includedMinutesPerPeriod - usedMinutes, 0),
      },
      allowedLanguages,
    };
  });
}

export async function requestUpgrade(input: {
  tenantId: string;
  requestedBy: string;
  requestedPlanId?: string;
  message?: string;
}) {
  const billingContext = await getTenantBillingContext(input.tenantId);

  const [request] = await db
    .insert(tenantUpgradeRequests)
    .values({
      tenantId: input.tenantId,
      tenantSubscriptionId: billingContext.subscription.id,
      requestedPlanId: input.requestedPlanId ?? null,
      requestedBy: input.requestedBy,
      message: input.message?.trim() || null,
      status: 'open',
    })
    .returning();

  return request;
}

export async function assertTenantCanInviteRole(tenantId: string, role: 'tenant_admin' | 'tenant_manager' | 'tenant_viewer') {
  const billingContext = await getTenantBillingContext(tenantId);

  const [memberCountRow] = await db
    .select({ count: count() })
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId));
  const [pendingInviteCountRow] = await db
    .select({ count: count() })
    .from(tenantInvitations)
    .where(and(eq(tenantInvitations.tenantId, tenantId), eq(tenantInvitations.status, 'pending')));

  const totalSeatsAfterInvite =
    Number(memberCountRow?.count ?? 0) + Number(pendingInviteCountRow?.count ?? 0) + 1;
  if (totalSeatsAfterInvite > billingContext.entitlements.maxTeamMembers) {
    throw conflict('This tenant has reached its purchased team-member limit.', {
      code: 'team_member_limit_exceeded',
      limit: billingContext.entitlements.maxTeamMembers,
      attemptedRole: role,
    });
  }

  if (role !== 'tenant_admin') {
    return billingContext;
  }

  const [adminCountRow] = await db
    .select({ count: count() })
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, 'tenant_admin')));
  const [pendingAdminInviteCountRow] = await db
    .select({ count: count() })
    .from(tenantInvitations)
    .where(
      and(
        eq(tenantInvitations.tenantId, tenantId),
        eq(tenantInvitations.status, 'pending'),
        eq(tenantInvitations.role, 'tenant_admin')
      )
    );

  const totalAdminsAfterInvite =
    Number(adminCountRow?.count ?? 0) + Number(pendingAdminInviteCountRow?.count ?? 0) + 1;
  if (totalAdminsAfterInvite > billingContext.entitlements.maxAdminSeats) {
    throw conflict('This tenant has reached its purchased admin-seat limit.', {
      code: 'admin_seat_limit_exceeded',
      limit: billingContext.entitlements.maxAdminSeats,
    });
  }

  return billingContext;
}

export async function assertTenantCanManagePhoneNumber(tenantId: string, number: string) {
  const billingContext = await getTenantBillingContext(tenantId);
  const [tenantRow] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenantRow) {
    throw notFound('Tenant not found.');
  }

  const [existingNumberRow] = await db
    .select({ tenantId: phoneNumbers.tenantId })
    .from(phoneNumbers)
    .where(eq(phoneNumbers.number, number))
    .limit(1);

  const [countRow] = await db
    .select({ count: count() })
    .from(phoneNumbers)
    .where(eq(phoneNumbers.tenantId, tenantId));

  const currentCount = Number(countRow?.count ?? 0);
  const existingTenantId = existingNumberRow?.tenantId ?? null;

  if (existingTenantId === tenantId) {
    return billingContext;
  }

  if (currentCount + 1 > billingContext.entitlements.maxPhoneNumbers) {
    throw conflict('This tenant has reached its purchased phone-number limit.', {
      code: 'phone_number_limit_exceeded',
      limit: billingContext.entitlements.maxPhoneNumbers,
    });
  }

  return billingContext;
}

async function closeStaleActiveCalls(tenantId: string) {
  const staleBefore = new Date(Date.now() - STALE_ACTIVE_CALL_THRESHOLD_MS);

  const staleCalls = await db
    .select({
      id: calls.id,
      providerCallSid: calls.providerCallSid,
    })
    .from(calls)
    .where(
      and(
        eq(calls.tenantId, tenantId),
        inArray(calls.status, ['ringing', 'in_progress']),
        isNull(calls.endedAt),
        lt(calls.startedAt, staleBefore),
      )
    );

  if (staleCalls.length === 0) {
    return;
  }

  await db
    .update(calls)
    .set({
      status: 'failed',
      endedAt: new Date(),
    })
    .where(
      and(
        eq(calls.tenantId, tenantId),
        inArray(calls.status, ['ringing', 'in_progress']),
        isNull(calls.endedAt),
        lt(calls.startedAt, staleBefore),
      )
    );

  logger.warn({
    tenantId,
    staleCallIds: staleCalls.map((call) => call.id),
    staleProviderCallSids: staleCalls.map((call) => call.providerCallSid).filter(Boolean),
  }, 'Closed stale active calls before enforcing concurrency limits');
}

export async function assertTenantCanStartCall(
  tenantId: string,
  options: { direction: 'inbound' | 'outbound' }
) {
  await closeStaleActiveCalls(tenantId);

  const billingContext = await getTenantBillingContext(tenantId);

  if (!['trial', 'active'].includes(billingContext.subscription.status)) {
    throw conflict('This tenant subscription is not active for calling.', {
      code: 'subscription_inactive',
      status: billingContext.subscription.status,
    });
  }

  if (options.direction === 'outbound' && !billingContext.entitlements.outboundEnabled) {
    throw conflict('Outbound calling is not included in this tenant plan.', {
      code: 'outbound_not_enabled',
    });
  }

  if (
    !billingContext.entitlements.overageEnabled
    && billingContext.usage.usedMinutes >= billingContext.entitlements.includedMinutesPerPeriod
  ) {
    throw conflict('This tenant has reached its purchased minute limit for the current period.', {
      code: 'minute_limit_exceeded',
      limit: billingContext.entitlements.includedMinutesPerPeriod,
      usedMinutes: billingContext.usage.usedMinutes,
    });
  }

  const [activeCallCountRow] = await db
    .select({ count: count() })
    .from(calls)
    .where(
      and(
        eq(calls.tenantId, tenantId),
        inArray(calls.status, ['ringing', 'in_progress']),
        isNull(calls.endedAt),
      )
    );

  if (Number(activeCallCountRow?.count ?? 0) >= billingContext.entitlements.maxConcurrentCalls) {
    throw conflict('This tenant has reached its purchased concurrent-call limit.', {
      code: 'concurrency_limit_exceeded',
      limit: billingContext.entitlements.maxConcurrentCalls,
    });
  }

  return billingContext;
}

export async function recordCompletedCallUsage(tenantId: string, durationSec: number) {
  const billingContext = await getTenantBillingContext(tenantId);

  await db
    .update(tenantUsageRollups)
    .set({
      totalCalls: billingContext.usage.totalCalls + 1,
      totalDurationSec: billingContext.usage.totalDurationSec + Math.max(durationSec, 0),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantUsageRollups.tenantSubscriptionId, billingContext.subscription.id),
        eq(tenantUsageRollups.periodStart, new Date(billingContext.usage.periodStart)),
        eq(tenantUsageRollups.periodEnd, new Date(billingContext.usage.periodEnd))
      )
    );

  return getTenantBillingContext(tenantId);
}

export async function listTenantAdminUsers(tenantId: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: tenantMembers.role,
      createdAt: tenantMembers.createdAt,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(users.id, tenantMembers.userId))
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, 'tenant_admin')));
}
