import { db } from '../config/database.js';
import { users, tenants, tenantMembers, phoneNumbers, aiAssistants, tenantWorkingHours, providerConfig } from './schema.js';

/**
 * Seed script — creates a demo tenant for local development.
 * Run: bun run db:seed
 */
async function seed() {
  console.log('Seeding database...');

  // Create super admin user
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@phone-assistant.dev',
      passwordHash: '$2b$10$placeholder', // TODO: replace with real hash in Phase 2 auth
      name: 'Super Admin',
      role: 'super_admin',
    })
    .onConflictDoNothing()
    .returning();

  console.log('Created admin user:', admin?.email || 'already exists');

  // Create demo tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: 'Demo Clinic',
      slug: 'demo-clinic',
      industry: 'healthcare',
      timezone: 'Asia/Kolkata',
    })
    .onConflictDoNothing()
    .returning();

  if (tenant) {
    console.log('Created tenant:', tenant.name);

    // Create tenant admin user
    const [tenantAdmin] = await db
      .insert(users)
      .values({
        email: 'doctor@demo-clinic.com',
        passwordHash: '$2b$10$placeholder',
        name: 'Dr. Demo',
        role: 'tenant_admin',
      })
      .onConflictDoNothing()
      .returning();

    if (tenantAdmin) {
      await db
        .insert(tenantMembers)
        .values({
          tenantId: tenant.id,
          userId: tenantAdmin.id,
          role: 'tenant_admin',
        })
        .onConflictDoNothing();
    }

    // Set working hours (Mon-Sat, 9am-6pm)
    for (let day = 1; day <= 6; day++) {
      await db
        .insert(tenantWorkingHours)
        .values({
          tenantId: tenant.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
        });
    }

    // Create AI assistant config
    await db
      .insert(aiAssistants)
      .values({
        tenantId: tenant.id,
        personaName: 'Dr. AI',
        personaTone: 'professional and empathetic',
        greetingMessage:
          'Hello! Thank you for calling Demo Clinic. I am Dr. AI, your virtual assistant. How can I help you today?',
        afterHoursMessage:
          'Thank you for calling Demo Clinic. We are currently closed. Our hours are Monday to Saturday, 9 AM to 6 PM. Please call back during business hours or leave a message.',
        systemPrompt:
          'You are the AI receptionist for Demo Clinic, a general healthcare clinic. You help patients with appointment booking, general queries about services, and route urgent medical concerns to the doctor. Never provide medical diagnoses. If a patient describes an emergency, tell them to call emergency services immediately.',
        voiceId: 'Arista-PlayAI',
        primaryLanguage: 'en',
        recordingEnabled: true,
        consentAnnouncement: true,
      })
      .onConflictDoNothing();

    // Add a demo phone number (replace with your Twilio number)
    await db
      .insert(phoneNumbers)
      .values({
        tenantId: tenant.id,
        number: '+1234567890', // Replace with your actual Twilio number
        provider: 'twilio',
        isActive: true,
      })
      .onConflictDoNothing();

    console.log('Created AI assistant config, working hours, and phone number');
  }

  // Set global provider defaults
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
