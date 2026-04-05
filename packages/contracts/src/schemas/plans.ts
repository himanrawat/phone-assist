import { z } from "zod/v4";

const languageCodeSchema = z.string().trim().min(2).max(16);

export const planEntitlementsSchema = z.object({
  maxAdminSeats: z.number().int().positive(),
  maxTeamMembers: z.number().int().positive(),
  maxPhoneNumbers: z.number().int().positive(),
  includedMinutesPerPeriod: z.number().int().min(0),
  maxConcurrentCalls: z.number().int().positive(),
  maxSelectableLanguages: z.number().int().positive(),
  planLanguagePool: z.array(languageCodeSchema).min(1),
  dataRetentionDays: z.number().int().positive(),
  apiAccess: z.boolean(),
  advancedAnalytics: z.boolean(),
  auditLogs: z.boolean(),
  outboundEnabled: z.boolean(),
  multilingualSupport: z.boolean(),
});

export const planUpsertSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  monthlyPriceCents: z.number().int().min(0),
  currency: z.string().min(1).max(8).default("USD"),
  trialDays: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  entitlements: planEntitlementsSchema,
});

export const tenantSubscriptionAssignSchema = z.object({
  planId: z.uuid(),
  status: z.enum(["trial", "active", "suspended", "cancelled"]).optional(),
  trialDays: z.number().int().min(0).optional(),
});

export const tenantLanguageAccessSchema = z.object({
  languages: z.array(languageCodeSchema).min(1),
});

export const upgradeRequestSchema = z.object({
  requestedPlanId: z.uuid().optional(),
  message: z.string().max(2000).optional(),
});
