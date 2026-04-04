import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { logger } from '../shared/logging/logger.js';
import { hashPassword, isPasswordHash } from '../shared/auth/password.js';
import { ensureDatabaseSchema } from '../shared/db/ensure-schema.js';
import {
  users,
  tenants,
  tenantMembers,
  phoneNumbers,
  aiAssistants,
  tenantWorkingHours,
  providerConfig,
  brandProfiles,
} from './schema.js';
import {
  DEFAULT_DEVELOPMENT_SEED_SECRET,
  loadTenantSeedConfig,
  resolveAssistantSeedConfig,
} from '../shared/db/seed-config.js';

const DEFAULT_SEED_PASSWORD = DEFAULT_DEVELOPMENT_SEED_SECRET;

function requireRecord<T>(value: T | undefined, label: string): T {
  if (!value) {
    throw new Error(`Failed to upsert ${label}`);
  }

  return value;
}

/**
 * Seed script.
 *
 * Default behavior keeps the current Melp demo tenant for local development.
 * To seed a different tenant, provide a JSON file with the same shape as
 * templates/tenant-seed.template.json:
 *
 *   SEED_CONFIG_PATH=templates/tenant-seed.template.json bun run db:seed
 */
async function seed() {
  logger.info('Seeding database...');
  await ensureDatabaseSchema();

  const seedConfig = await loadTenantSeedConfig();
  const assistantConfig = resolveAssistantSeedConfig(
    seedConfig.brandProfile,
    seedConfig.aiAssistant
  );
  const platformAdminPasswordHash = await resolveSeedPasswordHash(
    { passwordHash: undefined, password: DEFAULT_SEED_PASSWORD },
    'platform admin'
  );
  const tenantAdminPasswordHash = await resolveSeedPasswordHash(seedConfig.tenantAdmin, 'tenant admin');

  // Create or update the global super admin used for local development.
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@himanshurawat.in',
      passwordHash: platformAdminPasswordHash,
      name: 'Super Admin',
      platformRole: 'platform_super_admin',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: platformAdminPasswordHash,
        name: 'Super Admin',
        platformRole: 'platform_super_admin',
        updatedAt: new Date(),
      },
    })
    .returning();
  const seededAdmin = requireRecord(admin, 'admin user');

  logger.info({ email: seededAdmin.email }, 'Upserted admin user');

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: seedConfig.tenant.name,
      slug: seedConfig.tenant.slug,
      industry: seedConfig.tenant.industry,
      timezone: seedConfig.tenant.timezone,
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: {
        name: seedConfig.tenant.name,
        industry: seedConfig.tenant.industry,
        timezone: seedConfig.tenant.timezone,
        updatedAt: new Date(),
      },
    })
    .returning();
  const seededTenant = requireRecord(tenant, 'tenant');

  logger.info({ tenant: seededTenant.name }, 'Upserted tenant');

  const [tenantAdmin] = await db
    .insert(users)
    .values({
      email: seedConfig.tenantAdmin.email,
      passwordHash: tenantAdminPasswordHash,
      name: seedConfig.tenantAdmin.name,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: tenantAdminPasswordHash,
        name: seedConfig.tenantAdmin.name,
        platformRole: null,
        updatedAt: new Date(),
      },
    })
    .returning();
  const seededTenantAdmin = requireRecord(tenantAdmin, 'tenant admin');

  await db
    .insert(tenantMembers)
    .values({
      tenantId: seededTenant.id,
      userId: seededTenantAdmin.id,
      role: 'tenant_admin',
    })
    .onConflictDoNothing();

  logger.info({ email: seededTenantAdmin.email }, 'Upserted tenant admin');

  await db
    .delete(tenantWorkingHours)
    .where(eq(tenantWorkingHours.tenantId, seededTenant.id));

  if (seedConfig.workingHours.length > 0) {
    await db.insert(tenantWorkingHours).values(
      seedConfig.workingHours.map((workingHour) => ({
        tenantId: seededTenant.id,
        dayOfWeek: workingHour.dayOfWeek,
        startTime: workingHour.startTime,
        endTime: workingHour.endTime,
        isActive: workingHour.isActive,
      }))
    );
  }

  logger.info('Synced working hours');

  await db
    .insert(aiAssistants)
    .values({
      tenantId: seededTenant.id,
      ...assistantConfig,
    })
    .onConflictDoUpdate({
      target: aiAssistants.tenantId,
      set: {
        ...assistantConfig,
        updatedAt: new Date(),
      },
    });

  logger.info('Synced assistant config');

  for (const phoneNumber of seedConfig.phoneNumbers) {
    await db
      .insert(phoneNumbers)
      .values({
        tenantId: seededTenant.id,
        number: phoneNumber.number,
        provider: phoneNumber.provider,
        providerSid: phoneNumber.providerSid,
        forwardingNumber: phoneNumber.forwardingNumber,
        isActive: phoneNumber.isActive,
      })
      .onConflictDoUpdate({
        target: phoneNumbers.number,
        set: {
          tenantId: seededTenant.id,
          provider: phoneNumber.provider,
          providerSid: phoneNumber.providerSid,
          forwardingNumber: phoneNumber.forwardingNumber,
          isActive: phoneNumber.isActive,
        },
      });
  }

  logger.info('Synced phone numbers');

  await db
    .insert(brandProfiles)
    .values({
      tenantId: seededTenant.id,
      ...seedConfig.brandProfile,
    })
    .onConflictDoUpdate({
      target: brandProfiles.tenantId,
      set: {
        ...seedConfig.brandProfile,
        updatedAt: new Date(),
      },
    });

  logger.info('Synced brand profile');

  await db
    .insert(providerConfig)
    .values([
      { key: 'telephony', provider: 'twilio' },
      { key: 'stt', provider: 'deepgram' },
      { key: 'tts', provider: 'groq' },
      { key: 'llm', provider: 'groq' },
    ])
    .onConflictDoNothing();

  logger.info('Set global provider defaults');
  logger.info({ defaultPassword: DEFAULT_SEED_PASSWORD }, 'Seed complete');
}

try {
  await seed();
  process.exit(0);
} catch (err) {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
}

async function resolveSeedPasswordHash(
  input: { password?: string; passwordHash?: string },
  label: string
) {
  if (input.password) {
    return hashPassword(input.password);
  }

  if (input.passwordHash && isPasswordHash(input.passwordHash) && !input.passwordHash.includes('placeholder')) {
    return input.passwordHash;
  }

  logger.warn({ label, defaultPassword: DEFAULT_SEED_PASSWORD }, 'Using default development seed password');
  return hashPassword(DEFAULT_SEED_PASSWORD);
}
