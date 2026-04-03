import { db } from '../config/database.js';
import { users, tenants, tenantMembers, phoneNumbers, aiAssistants, tenantWorkingHours, providerConfig, brandProfiles } from './schema.js';

/**
 * Seed script — creates a default tenant for local development.
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

  // Create default tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: 'MelpApp',
      slug: 'melp-app',
      industry: 'Enterprise SaaS / Collaboration Software / AI Workspace',
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
        email: 'support@melp.us',
        passwordHash: '$2b$10$placeholder',
        name: 'Venk Gorty',
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
        personaName: 'Melp Assistant',
        personaTone: 'professional, clear, confident, practical',
        greetingMessage:
          'Hello! Thank you for calling MelpApp. This is the Melp assistant. How can I help you today?',
        afterHoursMessage:
          'Thank you for calling MelpApp. Our team is currently unavailable. Please leave a message or email support@melp.us and we will follow up with you shortly.',
        systemPrompt:
          'You are the AI assistant for MelpApp, a cross-organization intelligent workspace. Help users understand messaging, meetings, Melp Drive, and AI-powered workflows. Be clear, confident, and practical. Highlight that Melp is built for collaboration across organizations without vendor lock-in. If users ask for pricing not publicly listed, enterprise onboarding, or sensitive account-specific data, escalate appropriately.',
        voiceId: 'hannah',
        primaryLanguage: 'en',
        recordingEnabled: true,
        consentAnnouncement: true,
      })
      .onConflictDoNothing();

    // Add a placeholder phone number (replace with your Twilio number)
    await db
      .insert(phoneNumbers)
      .values({
        tenantId: tenant.id,
        number: '+1234567890', // Replace with your actual Twilio number
        provider: 'twilio',
        isActive: true,
      })
      .onConflictDoNothing();

    // Create brand profile
    await db
      .insert(brandProfiles)
      .values({
        tenantId: tenant.id,
        businessName: 'MelpApp',
        tagline: 'Work across organizations, without boundaries.',
        industry: 'Enterprise SaaS / Collaboration Software / AI Workspace',
        description:
          'MelpApp is a cross-organization collaboration platform that combines messaging, meetings, file management, and AI-powered workflows into a single intelligent workspace. It is designed for teams, enterprises, and organizations that need to collaborate beyond internal boundaries without relying on vendor-locked ecosystems like Microsoft or Google. Melp embeds AI directly into communication, helping users summarize meetings, translate files, generate content, and extract decisions in real time.',
        website: 'https://melp.us',
        email: 'support@melp.us',
        phone: 'N/A',
        addresses: [],
        services: [
          { name: 'Messaging', description: 'Real-time chat for individuals, teams, and cross-organization collaboration with topic-based conversations', price: 'Included in plan', duration: 'N/A' },
          { name: 'Meetings', description: 'Audio and video conferencing with integrated AI features like transcription and summaries', price: 'Included in plan', duration: 'N/A' },
          { name: 'Melp Drive', description: 'Unified file management system that integrates Google Drive and OneDrive into a single interface', price: 'Included in plan', duration: 'N/A' },
          { name: 'AI File Summary & Q&A', description: 'Automatically summarizes documents and allows users to ask questions based on file content', price: 'Plan-based', duration: 'N/A' },
          { name: 'AI File Translation', description: 'Translates documents into multiple languages and generates a new translated file', price: 'Plan-based', duration: 'N/A' },
          { name: 'Live Transcription', description: 'Converts speech into text in real time during meetings', price: 'Plan-based', duration: 'Real-time' },
          { name: 'Meeting Summary', description: 'Extracts key points, decisions, and action items from meetings', price: 'Plan-based', duration: 'Post-meeting' },
          { name: 'Draft for Me', description: 'AI-generated message drafting and rewriting based on tone and context', price: 'Plan-based', duration: 'Instant' },
          { name: 'Evaluation Mode', description: 'Monitors interview sessions with behavioral signals and generates interview questions from resumes and job descriptions', price: 'Enterprise', duration: 'Session-based' },
          { name: 'Speech-to-Speech Translation', description: 'Enables real-time multilingual voice communication', price: 'Plan-based', duration: 'Real-time' },
        ],
        policies: [
          { title: 'Data Privacy', content: 'Melp does not use customer data for training external models. All data remains private to the organization.' },
          { title: 'AI Output Accuracy', content: 'AI-generated outputs are assistive and should be reviewed before making critical decisions.' },
          { title: 'Third-Party Integrations', content: 'Users can connect Google Drive and Microsoft OneDrive, but these integrations are optional and not required to use Melp.' },
          { title: 'Account Usage', content: 'Each user account is tied to a valid identity. Organizations can manage access and permissions internally.' },
        ],
        faqs: [
          { question: 'What is Melp?', answer: 'Melp is an intelligent workspace that combines messaging, meetings, file management, and AI into a single platform designed for cross-organization collaboration.' },
          { question: 'How is Melp different from Microsoft Teams or Slack?', answer: 'Melp is built for collaboration across organizations and does not require Microsoft or Google identity. It also embeds AI directly into workflows instead of separating it into standalone tools.' },
          { question: 'Does Melp support file sharing?', answer: 'Yes, Melp Drive allows you to store, share, and access files in one place, including integrations with Google Drive and OneDrive.' },
          { question: 'Can Melp translate documents?', answer: 'Yes, Melp can translate documents into multiple languages and create a new translated version of the file.' },
          { question: 'Does Melp record or summarize meetings?', answer: 'Yes, Melp can transcribe meetings in real time and generate summaries including key points, decisions, and action items.' },
          { question: 'Is Melp suitable for enterprise use?', answer: 'Yes, Melp is designed for teams, enterprises, and organizations that need secure and scalable collaboration across boundaries.' },
        ],
        staff: [
          { name: 'Venk Gorty', role: 'Founder', department: 'Product', specialty: 'Product strategy, frontend architecture' },
          { name: 'Support Team', role: 'Customer Support', department: 'Support', specialty: 'Customer queries, onboarding' },
          { name: 'Engineering Team', role: 'Software Engineers', department: 'Engineering', specialty: 'Platform development, AI integration' },
        ],
        brandVoice: {
          toneKeywords: ['professional', 'clear', 'confident', 'practical', 'intelligent'],
          wordsToUse: ['happy to help', 'let me check that for you', 'here’s how that works', 'you can do this directly in Melp', 'this is handled within the platform'],
          wordsToAvoid: ['unfortunately', 'I can\'t', 'not possible', 'best AI ever', 'revolutionary'],
          samplePhrases: [
            'Here’s how that works inside Melp.',
            'You can handle this directly within the platform without switching tools.',
            'Melp is designed to make this process faster and more structured.',
            'Let me walk you through the steps.',
            'This is automatically handled using Melp’s AI features.',
          ],
        },
        escalationRules: [
          { trigger: 'User asks for pricing details not publicly listed', action: 'Provide available information and offer to connect with sales' },
          { trigger: 'User reports technical issue or bug', action: 'Escalate to support team' },
          { trigger: 'User requests enterprise onboarding or custom setup', action: 'Transfer to sales or enterprise team' },
          { trigger: 'User asks for account-specific or sensitive data', action: 'Do not answer and escalate securely' },
          { trigger: 'AI is unsure or lacks sufficient context', action: 'Ask clarifying question or escalate' },
        ],
      })
      .onConflictDoNothing();

    console.log('Created AI assistant config, working hours, phone number, and brand profile');
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
