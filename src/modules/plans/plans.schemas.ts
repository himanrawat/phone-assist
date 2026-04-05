import { z } from 'zod';

const languageCodeSchema = z.string().trim().min(2).max(16);

export const planEntitlementsSchema = z.object({
  maxAdminSeats: z.coerce.number().int().positive(),
  maxTeamMembers: z.coerce.number().int().positive(),
  maxPhoneNumbers: z.coerce.number().int().positive(),
  includedMinutesPerPeriod: z.coerce.number().int().min(0),
  maxConcurrentCalls: z.coerce.number().int().positive(),
  maxSelectableLanguages: z.coerce.number().int().positive(),
  planLanguagePool: z.array(languageCodeSchema).min(1),
  dataRetentionDays: z.coerce.number().int().positive(),
  apiAccess: z.boolean(),
  advancedAnalytics: z.boolean(),
  auditLogs: z.boolean(),
  outboundEnabled: z.boolean(),
  multilingualSupport: z.boolean(),
});

export const planUpsertSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().optional(),
  monthlyPriceCents: z.coerce.number().int().min(0),
  currency: z.string().trim().min(1).max(8).default('USD'),
  trialDays: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  entitlements: planEntitlementsSchema,
});

export const tenantSubscriptionAssignSchema = z.object({
  planId: z.string().trim().pipe(z.uuid()),
  status: z.enum(['trial', 'active', 'suspended', 'cancelled']).optional(),
  trialDays: z.coerce.number().int().min(0).optional(),
});

export const tenantLanguageAccessSchema = z.object({
  languages: z.array(languageCodeSchema).min(1),
});

export const upgradeRequestSchema = z.object({
  requestedPlanId: z.string().trim().pipe(z.uuid()).optional(),
  message: z.string().trim().max(2000).optional(),
});
