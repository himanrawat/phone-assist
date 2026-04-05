import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const platformRoleEnum = pgEnum('platform_role', [
  'platform_super_admin',
  'platform_support',
]);

export const tenantRoleEnum = pgEnum('tenant_role', [
  'tenant_admin',
  'tenant_manager',
  'tenant_viewer',
]);

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const tenantSubscriptionStatusEnum = pgEnum('tenant_subscription_status', [
  'trial',
  'active',
  'suspended',
  'cancelled',
]);

export const tenantUpgradeRequestStatusEnum = pgEnum('tenant_upgrade_request_status', [
  'open',
  'resolved',
  'dismissed',
]);

export const callDirectionEnum = pgEnum('call_direction', ['inbound', 'outbound']);

export const callStatusEnum = pgEnum('call_status', [
  'ringing',
  'in_progress',
  'completed',
  'failed',
  'no_answer',
  'busy',
  'voicemail',
]);

export const sentimentEnum = pgEnum('sentiment', ['positive', 'neutral', 'negative']);

export const telephonyProviderEnum = pgEnum('telephony_provider', ['twilio']);
export const sttProviderEnum = pgEnum('stt_provider', ['deepgram', 'groq', 'openai']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  platformRole: platformRoleEnum('platform_role'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  industry: varchar('industry', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  telephonyProvider: telephonyProviderEnum('telephony_provider'),
  sttProvider: sttProviderEnum('stt_provider'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: tenantRoleEnum('role').notNull().default('tenant_viewer'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('tenant_member_unique').on(table.tenantId, table.userId)]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    activeTenantId: uuid('active_tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ]
);

export const tenantInvitations = pgTable(
  'tenant_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: tenantRoleEnum('role').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull(),
    status: invitationStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tenant_invitations_token_unique').on(table.token),
    uniqueIndex('tenant_invitations_tenant_email_unique').on(table.tenantId, table.email),
  ]
);

export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    monthlyPriceCents: integer('monthly_price_cents').notNull().default(0),
    currency: varchar('currency', { length: 8 }).notNull().default('USD'),
    trialDays: integer('trial_days').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('plans_sort_order_idx').on(table.sortOrder)]
);

export const planEntitlements = pgTable('plan_entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' })
    .unique(),
  maxAdminSeats: integer('max_admin_seats').notNull().default(1),
  maxTeamMembers: integer('max_team_members').notNull().default(1),
  maxPhoneNumbers: integer('max_phone_numbers').notNull().default(1),
  includedMinutesPerPeriod: integer('included_minutes_per_period').notNull().default(0),
  maxConcurrentCalls: integer('max_concurrent_calls').notNull().default(1),
  maxSelectableLanguages: integer('max_selectable_languages').notNull().default(1),
  planLanguagePool: jsonb('plan_language_pool').$type<string[]>().notNull().default([]),
  dataRetentionDays: integer('data_retention_days').notNull().default(30),
  apiAccess: boolean('api_access').notNull().default(false),
  advancedAnalytics: boolean('advanced_analytics').notNull().default(false),
  auditLogs: boolean('audit_logs').notNull().default(false),
  outboundEnabled: boolean('outbound_enabled').notNull().default(true),
  multilingualSupport: boolean('multilingual_support').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenantSubscriptions = pgTable(
  'tenant_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' })
      .unique(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    status: tenantSubscriptionStatusEnum('status').notNull().default('active'),
    billingProvider: varchar('billing_provider', { length: 20 }).notNull().default('manual'),
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    trialEndsAt: timestamp('trial_ends_at'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('tenant_subscriptions_plan_idx').on(table.planId),
    index('tenant_subscriptions_period_idx').on(table.currentPeriodStart, table.currentPeriodEnd),
  ]
);

export const tenantSubscriptionOverrides = pgTable('tenant_subscription_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantSubscriptionId: uuid('tenant_subscription_id')
    .notNull()
    .references(() => tenantSubscriptions.id, { onDelete: 'cascade' })
    .unique(),
  maxAdminSeats: integer('max_admin_seats'),
  maxTeamMembers: integer('max_team_members'),
  maxPhoneNumbers: integer('max_phone_numbers'),
  includedMinutesPerPeriod: integer('included_minutes_per_period'),
  maxConcurrentCalls: integer('max_concurrent_calls'),
  maxSelectableLanguages: integer('max_selectable_languages'),
  dataRetentionDays: integer('data_retention_days'),
  apiAccess: boolean('api_access'),
  advancedAnalytics: boolean('advanced_analytics'),
  auditLogs: boolean('audit_logs'),
  outboundEnabled: boolean('outbound_enabled'),
  multilingualSupport: boolean('multilingual_support'),
  overageEnabled: boolean('overage_enabled'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenantLanguageAccess = pgTable(
  'tenant_language_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    language: varchar('language', { length: 16 }).notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tenant_language_access_unique').on(table.tenantId, table.language),
    index('tenant_language_access_tenant_idx').on(table.tenantId),
  ]
);

export const tenantUsageRollups = pgTable(
  'tenant_usage_rollups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    tenantSubscriptionId: uuid('tenant_subscription_id')
      .notNull()
      .references(() => tenantSubscriptions.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    totalCalls: integer('total_calls').notNull().default(0),
    totalDurationSec: integer('total_duration_sec').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tenant_usage_rollups_period_unique').on(
      table.tenantSubscriptionId,
      table.periodStart,
      table.periodEnd
    ),
    index('tenant_usage_rollups_tenant_idx').on(table.tenantId),
  ]
);

export const tenantUpgradeRequests = pgTable(
  'tenant_upgrade_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    tenantSubscriptionId: uuid('tenant_subscription_id').references(() => tenantSubscriptions.id, {
      onDelete: 'set null',
    }),
    requestedPlanId: uuid('requested_plan_id').references(() => plans.id, { onDelete: 'set null' }),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message'),
    status: tenantUpgradeRequestStatusEnum('status').notNull().default('open'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('tenant_upgrade_requests_tenant_idx').on(table.tenantId)]
);

export const tenantWorkingHours = pgTable('tenant_working_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(),
  endTime: varchar('end_time', { length: 5 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const phoneNumbers = pgTable(
  'phone_numbers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    number: varchar('number', { length: 20 }).notNull().unique(),
    provider: telephonyProviderEnum('provider').notNull(),
    providerSid: varchar('provider_sid', { length: 100 }),
    forwardingNumber: varchar('forwarding_number', { length: 20 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('phone_numbers_tenant_idx').on(table.tenantId)]
);

export const aiAssistants = pgTable('ai_assistants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' })
    .unique(),
  personaName: varchar('persona_name', { length: 100 }).notNull().default('Assistant'),
  personaTone: varchar('persona_tone', { length: 50 }).notNull().default('professional'),
  greetingMessage: text('greeting_message').notNull().default('Hello! How can I help you today?'),
  afterHoursMessage: text('after_hours_message').notNull().default(
    'Thank you for calling. We are currently closed. Please call back during business hours.'
  ),
  systemPrompt: text('system_prompt'),
  voiceId: varchar('voice_id', { length: 100 }).notNull().default('hannah'),
  maxCallDurationSec: integer('max_call_duration_sec').notNull().default(600),
  primaryLanguage: varchar('primary_language', { length: 10 }).notNull().default('en'),
  multilingualEnabled: boolean('multilingual_enabled').notNull().default(false),
  recordingEnabled: boolean('recording_enabled').notNull().default(true),
  consentAnnouncement: boolean('consent_announcement').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }),
    company: varchar('company', { length: 255 }),
    tags: jsonb('tags').$type<string[]>().default([]),
    isVip: boolean('is_vip').notNull().default(false),
    isBlocked: boolean('is_blocked').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('contacts_tenant_idx').on(table.tenantId),
    index('contacts_phone_idx').on(table.tenantId, table.phone),
  ]
);

export const calls = pgTable(
  'calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    direction: callDirectionEnum('direction').notNull(),
    status: callStatusEnum('status').notNull().default('ringing'),
    callerNumber: varchar('caller_number', { length: 20 }).notNull(),
    dialedNumber: varchar('dialed_number', { length: 20 }).notNull(),
    providerCallSid: varchar('provider_call_sid', { length: 100 }),
    provider: telephonyProviderEnum('provider').notNull(),
    durationSec: integer('duration_sec'),
    recordingUrl: varchar('recording_url', { length: 500 }),
    recordingKey: varchar('recording_key', { length: 500 }),
    transcript: text('transcript'),
    summary: text('summary'),
    sentiment: sentimentEnum('sentiment'),
    aiResolved: boolean('ai_resolved'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('calls_tenant_idx').on(table.tenantId),
    index('calls_started_at_idx').on(table.startedAt),
    index('calls_provider_sid_idx').on(table.providerCallSid),
  ]
);

export const callMessages = pgTable(
  'call_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    callId: uuid('call_id')
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
  },
  (table) => [index('call_messages_call_idx').on(table.callId)]
);

export const brandProfiles = pgTable('brand_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' })
    .unique(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  tagline: varchar('tagline', { length: 500 }),
  industry: varchar('industry', { length: 100 }),
  description: text('description'),
  website: varchar('website', { length: 500 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  addresses: jsonb('addresses').$type<Array<{ label: string; address: string; phone?: string }>>().default([]),
  services: jsonb('services').$type<Array<{ name: string; description: string; price?: string; duration?: string }>>().default([]),
  policies: jsonb('policies').$type<Array<{ title: string; content: string }>>().default([]),
  faqs: jsonb('faqs').$type<Array<{ question: string; answer: string }>>().default([]),
  staff: jsonb('staff').$type<Array<{ name: string; role: string; department?: string; specialty?: string }>>().default([]),
  brandVoice: jsonb('brand_voice').$type<{
    toneKeywords: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
    samplePhrases: string[];
  }>().default({ toneKeywords: [], wordsToUse: [], wordsToAvoid: [], samplePhrases: [] }),
  escalationRules: jsonb('escalation_rules').$type<Array<{ trigger: string; action: string }>>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const providerConfig = pgTable('provider_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  provider: varchar('provider', { length: 50 }).notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
