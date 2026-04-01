import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Enums ───

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'tenant_admin',
  'tenant_manager',
  'tenant_viewer',
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
export const sttProviderEnum = pgEnum('stt_provider', ['deepgram', 'groq']);

// ─── Users ───

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('tenant_admin'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Tenants ───

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  industry: varchar('industry', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),

  // Provider overrides (null = use global default)
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
    role: userRoleEnum('role').notNull().default('tenant_viewer'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tenant_member_unique').on(table.tenantId, table.userId),
  ]
);

export const tenantWorkingHours = pgTable('tenant_working_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 6=Saturday
  startTime: varchar('start_time', { length: 5 }).notNull(), // "09:00"
  endTime: varchar('end_time', { length: 5 }).notNull(), // "17:00"
  isActive: boolean('is_active').notNull().default(true),
});

// ─── Phone Numbers ───

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
  (table) => [
    index('phone_numbers_tenant_idx').on(table.tenantId),
  ]
);

// ─── AI Assistant Config ───

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
  voiceId: varchar('voice_id', { length: 100 }).notNull().default('tara'),
  maxCallDurationSec: integer('max_call_duration_sec').notNull().default(600),
  primaryLanguage: varchar('primary_language', { length: 10 }).notNull().default('en'),
  multilingualEnabled: boolean('multilingual_enabled').notNull().default(false),
  recordingEnabled: boolean('recording_enabled').notNull().default(true),
  consentAnnouncement: boolean('consent_announcement').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Contacts ───

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

// ─── Calls ───

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

// ─── Call Messages (individual conversation turns) ───

export const callMessages = pgTable(
  'call_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    callId: uuid('call_id')
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // 'caller' | 'assistant'
    content: text('content').notNull(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
  },
  (table) => [
    index('call_messages_call_idx').on(table.callId),
  ]
);

// ─── Provider Config (Super Admin) ───

export const providerConfig = pgTable('provider_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 50 }).notNull().unique(), // 'telephony', 'stt', 'tts', 'llm'
  provider: varchar('provider', { length: 50 }).notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
