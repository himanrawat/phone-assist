import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from '../config/database.js';
import { logger } from '../logging/logger.js';

type SchemaState = {
  usersTableExists: boolean;
  sessionsTableExists: boolean;
  tenantInvitationsTableExists: boolean;
  legacyRoleColumnExists: boolean;
  platformRoleColumnExists: boolean;
  platformRoleBackfillNeeded: boolean;
  tenantMembersRoleNeedsUpgrade: boolean;
  migrationCount: number;
};

export async function ensureDatabaseSchema() {
  await ensureMigrationMetadataTable();

  let state = await getSchemaState();
  if (!state.usersTableExists) {
    logger.info('No application tables found, applying migrations');
    await migrate(db, { migrationsFolder: 'drizzle' });
    return;
  }

  const needsLegacyRepair = !state.platformRoleColumnExists
    || !state.sessionsTableExists
    || !state.tenantInvitationsTableExists
    || state.platformRoleBackfillNeeded
    || state.tenantMembersRoleNeedsUpgrade;

  if (needsLegacyRepair) {
    logger.warn(
      {
        legacyRoleColumnExists: state.legacyRoleColumnExists,
        platformRoleColumnExists: state.platformRoleColumnExists,
        platformRoleBackfillNeeded: state.platformRoleBackfillNeeded,
        tenantMembersRoleNeedsUpgrade: state.tenantMembersRoleNeedsUpgrade,
        sessionsTableExists: state.sessionsTableExists,
        tenantInvitationsTableExists: state.tenantInvitationsTableExists,
      },
      'Detected legacy database schema, applying compatibility repair'
    );

    await repairLegacySchema(state);
    state = await getSchemaState();

    if (!state.platformRoleColumnExists || !state.sessionsTableExists || !state.tenantInvitationsTableExists) {
      throw new Error('Legacy schema repair did not restore the required auth tables/columns.');
    }
  }

  if (state.migrationCount === 0) {
    await baselineInitialMigration();
  }

  await migrate(db, { migrationsFolder: 'drizzle' });
}

async function getSchemaState(): Promise<SchemaState> {
  const tables = await queryClient<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('users', 'sessions', 'tenant_invitations')
  `;

  const userColumns = await queryClient<{ column_name: string }[]>`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name in ('role', 'platform_role')
  `;

  const [migrationRow] = await queryClient<{ count: string }[]>`
    select count(*)::text as count
    from "drizzle"."__drizzle_migrations"
  `;

  const [tenantMembersRoleRow] = await queryClient<{ needs_upgrade: boolean }[]>`
    select exists(
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'tenant_members'
        and column_name = 'role'
        and udt_name <> 'tenant_role'
    ) as needs_upgrade
  `;

  const tableNames = new Set(tables.map((row) => row.table_name));
  const columnNames = new Set(userColumns.map((row) => row.column_name));
  const usersTableExists = tableNames.has('users');
  const legacyRoleColumnExists = columnNames.has('role');
  const platformRoleColumnExists = columnNames.has('platform_role');

  let platformRoleBackfillNeeded = false;
  if (usersTableExists && legacyRoleColumnExists && platformRoleColumnExists) {
    const [platformRoleBackfillRow] = await queryClient<{ needs_backfill: boolean }[]>`
      select exists(
        select 1
        from "users"
        where "role"::text = 'super_admin'
          and "platform_role" is null
      ) as needs_backfill
    `;
    platformRoleBackfillNeeded = platformRoleBackfillRow?.needs_backfill ?? false;
  }

  return {
    usersTableExists,
    sessionsTableExists: tableNames.has('sessions'),
    tenantInvitationsTableExists: tableNames.has('tenant_invitations'),
    legacyRoleColumnExists,
    platformRoleColumnExists,
    platformRoleBackfillNeeded,
    tenantMembersRoleNeedsUpgrade: tenantMembersRoleRow?.needs_upgrade ?? false,
    migrationCount: Number(migrationRow?.count ?? '0'),
  };
}

async function ensureMigrationMetadataTable() {
  const [schemaRow] = await queryClient<{ exists: boolean }[]>`
    select exists(
      select 1
      from information_schema.schemata
      where schema_name = 'drizzle'
    ) as exists
  `;

  if (!schemaRow?.exists) {
    await queryClient.unsafe('create schema "drizzle"');
  }

  const [tableRow] = await queryClient<{ exists: boolean }[]>`
    select exists(
      select 1
      from information_schema.tables
      where table_schema = 'drizzle'
        and table_name = '__drizzle_migrations'
    ) as exists
  `;

  if (!tableRow?.exists) {
    await queryClient.unsafe(`
      create table "drizzle"."__drizzle_migrations" (
        "id" serial primary key,
        "hash" text not null,
        "created_at" bigint
      )
    `);
  }
}

async function repairLegacySchema(state: SchemaState) {
  await queryClient.begin(async (tx) => {
    await tx.unsafe(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'tenant_role') then
          create type "tenant_role" as enum ('tenant_admin', 'tenant_manager', 'tenant_viewer');
        end if;
      end
      $$;
    `);

    if (!state.platformRoleColumnExists) {
      await tx.unsafe(`
        do $$
        begin
          if not exists (select 1 from pg_type where typname = 'platform_role') then
            create type "platform_role" as enum ('platform_super_admin', 'platform_support');
          end if;
        end
        $$;
      `);
      await tx.unsafe(`
        alter table "users"
        add column if not exists "platform_role" "platform_role"
      `);
    }

    if (state.legacyRoleColumnExists) {
      await tx.unsafe(`
        update "users"
        set "platform_role" = 'platform_super_admin'::"platform_role"
        where "role"::text = 'super_admin'
          and "platform_role" is null
      `);
    }

    await tx.unsafe(`
      do $$
      begin
        if exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'tenant_members'
            and column_name = 'role'
            and udt_name <> 'tenant_role'
        ) then
          alter table "tenant_members" alter column "role" drop default;
          alter table "tenant_members"
            alter column "role" type "tenant_role"
            using "role"::text::"tenant_role";
          alter table "tenant_members"
            alter column "role" set default 'tenant_viewer';
        end if;
      end
      $$;
    `);

    if (!state.sessionsTableExists) {
      await tx.unsafe(`
        create table if not exists "sessions" (
          "id" uuid primary key default gen_random_uuid() not null,
          "user_id" uuid not null references "users"("id") on delete cascade,
          "token_hash" varchar(64) not null,
          "active_tenant_id" uuid references "tenants"("id") on delete set null,
          "ip_address" varchar(45),
          "user_agent" text,
          "last_active_at" timestamp default now() not null,
          "expires_at" timestamp not null,
          "created_at" timestamp default now() not null
        )
      `);
      await tx.unsafe(`
        create unique index if not exists "sessions_token_hash_unique"
        on "sessions" using btree ("token_hash")
      `);
      await tx.unsafe(`
        create index if not exists "sessions_user_idx"
        on "sessions" using btree ("user_id")
      `);
      await tx.unsafe(`
        create index if not exists "sessions_expires_at_idx"
        on "sessions" using btree ("expires_at")
      `);
    }

    if (!state.tenantInvitationsTableExists) {
      await tx.unsafe(`
        do $$
        begin
          if not exists (select 1 from pg_type where typname = 'invitation_status') then
            create type "invitation_status" as enum ('pending', 'accepted', 'expired', 'revoked');
          end if;
        end
        $$;
      `);
      await tx.unsafe(`
        create table if not exists "tenant_invitations" (
          "id" uuid primary key default gen_random_uuid() not null,
          "tenant_id" uuid not null references "tenants"("id") on delete cascade,
          "email" varchar(255) not null,
          "role" "tenant_role" not null,
          "invited_by" uuid not null references "users"("id") on delete cascade,
          "token" varchar(255) not null,
          "status" "invitation_status" default 'pending' not null,
          "expires_at" timestamp not null,
          "created_at" timestamp default now() not null
        )
      `);
      await tx.unsafe(`
        create unique index if not exists "tenant_invitations_token_unique"
        on "tenant_invitations" using btree ("token")
      `);
      await tx.unsafe(`
        create unique index if not exists "tenant_invitations_tenant_email_unique"
        on "tenant_invitations" using btree ("tenant_id", "email")
      `);
    }
  });

  logger.info('Legacy schema compatibility repair completed');
}

async function baselineInitialMigration() {
  const journalPath = path.resolve(process.cwd(), 'drizzle/meta/_journal.json');
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
    entries?: Array<{ idx: number; tag: string; when: number }>;
  };
  const initialEntry = [...(journal.entries ?? [])].sort((left, right) => left.idx - right.idx)[0];

  if (!initialEntry) {
    logger.warn('Skipping migration baseline because no Drizzle journal entries were found');
    return;
  }

  const migrationPath = path.resolve(process.cwd(), 'drizzle', `${initialEntry.tag}.sql`);
  const migrationSql = await readFile(migrationPath, 'utf8');
  const migrationHash = createHash('sha256').update(migrationSql).digest('hex');

  await queryClient`
    insert into "drizzle"."__drizzle_migrations" ("hash", "created_at")
    values (${migrationHash}, ${initialEntry.when})
  `;

  logger.info({ tag: initialEntry.tag }, 'Baselined initial Drizzle migration for an existing database');
}
