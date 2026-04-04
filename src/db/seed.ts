import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
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
  loadTenantSeedConfig,
  resolveAssistantSeedConfig,
} from '../lib/seed-config.js';

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
  console.log('Seeding database...');

  const seedConfig = await loadTenantSeedConfig();
  const assistantConfig = resolveAssistantSeedConfig(
    seedConfig.brandProfile,
    seedConfig.aiAssistant
  );

  // Create or update the global super admin used for local development.
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@phone-assistant.dev',
      passwordHash: '$2b$10$placeholder',
      name: 'Super Admin',
      role: 'super_admin',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: '$2b$10$placeholder',
        name: 'Super Admin',
        role: 'super_admin',
        updatedAt: new Date(),
      },
    })
    .returning();
  const seededAdmin = requireRecord(admin, 'admin user');

  console.log('Upserted admin user:', seededAdmin.email);

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

  console.log('Upserted tenant:', seededTenant.name);

  const [tenantAdmin] = await db
    .insert(users)
    .values({
      email: seedConfig.tenantAdmin.email,
      passwordHash: seedConfig.tenantAdmin.passwordHash,
      name: seedConfig.tenantAdmin.name,
      role: 'tenant_admin',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: seedConfig.tenantAdmin.passwordHash,
        name: seedConfig.tenantAdmin.name,
        role: 'tenant_admin',
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

  console.log('Upserted tenant admin:', seededTenantAdmin.email);

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

  console.log('Synced working hours');

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

  console.log('Synced assistant config');

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

  console.log('Synced phone numbers');

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

  console.log('Synced brand profile');

  await db
    .insert(providerConfig)
    .values([
      { key: 'telephony', provider: 'twilio' },
      { key: 'stt', provider: 'deepgram' },
      { key: 'tts', provider: 'groq' },
      { key: 'llm', provider: 'groq' },
    ])
    .onConflictDoNothing();

  console.log('Set global provider defaults');
  console.log('\nSeed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
