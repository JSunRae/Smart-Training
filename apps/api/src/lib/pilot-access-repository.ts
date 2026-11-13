import type { SessionUser } from "./auth";
import { createLookupHash, decryptString, encryptString } from "./data-protection";
import { getStorageBackend } from "./database-config";
import { withPostgresTransaction } from "./postgres";
import { toSessionUser } from "./repository";
import { slugify } from "./slug";
import {
  createId,
  nowIso,
  updateDatabase,
  type AccountAccessState,
  type OrganizationRecord,
  type UserRecord
} from "./store";

type InvitationInput = {
  tokenHash: string;
  email: string;
  organizationId: string;
  role: "ADMIN" | "SELLER";
  expiresAt: Date;
};

type ResetInput = { tokenHash: string; email: string; organizationId: string; expiresAt: Date };

export async function createPilotOrganization(name: string): Promise<OrganizationRecord | null> {
  const normalizedName = name.trim();
  const slug = slugify(normalizedName);
  if (!normalizedName || !slug) return null;
  const timestamp = nowIso();

  if (getStorageBackend() === "postgres") {
    try {
      return await withPostgresTransaction(async (client) => {
        const organization: OrganizationRecord = {
          id: createId(),
          name: normalizedName,
          slug,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await client.query(
          `INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
          [organization.id, encryptString(organization.name), slug, timestamp, timestamp]
        );
        return organization;
      });
    } catch (error) {
      if (isUniqueConflict(error)) return null;
      throw error;
    }
  }

  return updateDatabase((database) => {
    if (database.organizations.some((organization) => organization.slug === slug)) return null;
    const organization = {
      id: createId(),
      name: normalizedName,
      slug,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    database.organizations.push(organization);
    return organization;
  });
}

export async function issuePilotInvitation(input: InvitationInput): Promise<boolean> {
  const emailLookupHash = createLookupHash("user-email", normalizeEmail(input.email));
  if (getStorageBackend() === "postgres") {
    return withPostgresTransaction(async (client) => {
      const organization = await client.query("SELECT id FROM organizations WHERE id = $1", [
        input.organizationId
      ]);
      if (!organization.rows[0]) return false;
      const existingAccount = await client.query("SELECT id FROM users WHERE email_lookup_hash = $1", [
        emailLookupHash
      ]);
      if (existingAccount.rows[0]) return false;
      await client.query(
        `INSERT INTO pilot_invitations (token_hash, email_lookup_hash, organization_id, role, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email_lookup_hash) DO UPDATE
         SET token_hash = EXCLUDED.token_hash, organization_id = EXCLUDED.organization_id,
             role = EXCLUDED.role, expires_at = EXCLUDED.expires_at`,
        [input.tokenHash, emailLookupHash, input.organizationId, input.role, input.expiresAt]
      );
      return true;
    });
  }
  return updateDatabase((database) => {
    if (!database.organizations.some((organization) => organization.id === input.organizationId))
      return false;
    if (database.users.some((user) => normalizeEmail(user.email) === normalizeEmail(input.email))) return false;
    database.pilotInvitations ??= [];
    database.pilotInvitations = database.pilotInvitations.filter(
      (invite) => invite.emailLookupHash !== emailLookupHash
    );
    database.pilotInvitations.push({
      tokenHash: input.tokenHash,
      emailLookupHash,
      organizationId: input.organizationId,
      role: input.role,
      expiresAt: input.expiresAt.toISOString()
    });
    return true;
  });
}

export async function revokePilotInvitation(
  email: string,
  organizationId: string
): Promise<boolean> {
  const emailLookupHash = createLookupHash("user-email", normalizeEmail(email));
  if (getStorageBackend() === "postgres") {
    return withPostgresTransaction(async (client) => {
      const result = await client.query(
        "DELETE FROM pilot_invitations WHERE email_lookup_hash = $1 AND organization_id = $2 RETURNING token_hash",
        [emailLookupHash, organizationId]
      );
      return result.rowCount === 1;
    });
  }
  return updateDatabase((database) => {
    const before = database.pilotInvitations?.length ?? 0;
    database.pilotInvitations = (database.pilotInvitations ?? []).filter(
      (invite) =>
        invite.emailLookupHash !== emailLookupHash || invite.organizationId !== organizationId
    );
    return (database.pilotInvitations?.length ?? 0) < before;
  });
}

export async function redeemPilotInvitation(input: {
  tokenHash: string;
  email: string;
  name: string;
  createPasswordHash: () => string;
}): Promise<SessionUser | null> {
  const email = normalizeEmail(input.email);
  const emailLookupHash = createLookupHash("user-email", email);
  if (getStorageBackend() === "postgres") {
    try {
      return await withPostgresTransaction(async (client) => {
        const grant = await client.query(
          `SELECT organization_id, role FROM pilot_invitations WHERE token_hash = $1 AND email_lookup_hash = $2 AND expires_at > NOW()`,
          [input.tokenHash, emailLookupHash]
        );
        const row = grant.rows[0];
        if (!row) return null;
        const existing = await client.query("SELECT id FROM users WHERE email_lookup_hash = $1", [
          emailLookupHash
        ]);
        if (existing.rows[0]) return null;
        const consumed = await client.query(
          `DELETE FROM pilot_invitations WHERE token_hash = $1 AND email_lookup_hash = $2 AND expires_at > NOW() RETURNING token_hash`,
          [input.tokenHash, emailLookupHash]
        );
        if (consumed.rowCount !== 1) return null;
        const passwordHash = input.createPasswordHash();
        const timestamp = nowIso();
        const user: UserRecord = {
          id: createId(),
          email,
          name: input.name.trim(),
          passwordHash,
          role: row.role as UserRecord["role"],
          transcriptConsentAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          organizationId: String(row.organization_id),
          accessState: "active",
          sessionVersion: 0
        };
        await client.query(
          `INSERT INTO users (id, email, email_lookup_hash, name, password_hash, role, transcript_consent_at, access_state, session_version, created_at, updated_at, organization_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            user.id,
            encryptString(user.email),
            emailLookupHash,
            encryptString(user.name),
            encryptString(user.passwordHash),
            user.role,
            timestamp,
            "active",
            0,
            timestamp,
            timestamp,
            user.organizationId
          ]
        );
        const organizationResult = await client.query(
          "SELECT id, name, slug FROM organizations WHERE id = $1",
          [user.organizationId]
        );
        if (!organizationResult.rows[0]) return null;
        return toSessionUser(user, {
          id: String(organizationResult.rows[0].id),
          name: decryptString(String(organizationResult.rows[0].name)),
          slug: String(organizationResult.rows[0].slug)
        });
      });
    } catch (error) {
      if (isUniqueConflict(error)) return null;
      throw error;
    }
  }

  return updateDatabase((database) => {
    database.pilotInvitations ??= [];
    const now = Date.now();
    const invite = database.pilotInvitations.find(
      (entry) =>
        entry.tokenHash === input.tokenHash &&
        entry.emailLookupHash === emailLookupHash &&
        Date.parse(entry.expiresAt) > now
    );
    if (!invite || database.users.some((user) => normalizeEmail(user.email) === email)) return null;
    const organization = database.organizations.find((entry) => entry.id === invite.organizationId);
    if (!organization) return null;
    const passwordHash = input.createPasswordHash();
    const timestamp = nowIso();
    database.pilotInvitations = database.pilotInvitations.filter(
      (entry) => entry.tokenHash !== invite.tokenHash
    );
    const user: UserRecord = {
      id: createId(),
      email,
      name: input.name.trim(),
      passwordHash,
      role: invite.role,
      transcriptConsentAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId: organization.id,
      accessState: "active",
      sessionVersion: 0
    };
    database.users.push(user);
    return toSessionUser(user, organization);
  });
}

export async function issuePilotPasswordReset(input: ResetInput): Promise<boolean> {
  const emailLookupHash = createLookupHash("user-email", normalizeEmail(input.email));
  if (getStorageBackend() === "postgres") {
    return withPostgresTransaction(async (client) => {
      const result = await client.query(
        "SELECT id, organization_id FROM users WHERE email_lookup_hash = $1 AND organization_id = $2 AND access_state = 'active' FOR UPDATE",
        [emailLookupHash, input.organizationId]
      );
      const user = result.rows[0];
      if (!user) return false;
      await client.query("DELETE FROM pilot_password_resets WHERE user_id = $1", [user.id]);
      await client.query(
        "INSERT INTO pilot_password_resets (token_hash, user_id, organization_id, expires_at) VALUES ($1,$2,$3,$4)",
        [input.tokenHash, user.id, user.organization_id, input.expiresAt]
      );
      return true;
    });
  }
  return updateDatabase((database) => {
    const user = database.users.find(
      (entry) =>
        normalizeEmail(entry.email) === normalizeEmail(input.email) &&
        entry.organizationId === input.organizationId &&
        normalizedAccessState(entry) === "active"
    );
    if (!user) return false;
    database.pilotPasswordResets ??= [];
    database.pilotPasswordResets = database.pilotPasswordResets.filter(
      (entry) => entry.userId !== user.id
    );
    database.pilotPasswordResets.push({
      tokenHash: input.tokenHash,
      userId: user.id,
      organizationId: user.organizationId,
      expiresAt: input.expiresAt.toISOString()
    });
    return true;
  });
}

export async function redeemPilotPasswordReset(input: {
  tokenHash: string;
  createPasswordHash: () => string;
}): Promise<boolean> {
  if (getStorageBackend() === "postgres") {
    return withPostgresTransaction(async (client) => {
      const grantResult = await client.query(
        "SELECT user_id, organization_id FROM pilot_password_resets WHERE token_hash = $1 AND expires_at > NOW()",
        [input.tokenHash]
      );
      const grant = grantResult.rows[0];
      if (!grant) return false;
      const userResult = await client.query(
        "SELECT id FROM users WHERE id = $1 AND organization_id = $2 AND access_state = 'active' FOR UPDATE",
        [grant.user_id, grant.organization_id]
      );
      if (!userResult.rows[0]) return false;
      const consumed = await client.query(
        "DELETE FROM pilot_password_resets WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW() RETURNING token_hash",
        [input.tokenHash, grant.user_id]
      );
      if (consumed.rowCount !== 1) return false;
      const passwordHash = input.createPasswordHash();
      await client.query(
        "UPDATE users SET password_hash = $3, session_version = session_version + 1, updated_at = $4 WHERE id = $1 AND organization_id = $2 AND access_state = 'active'",
        [grant.user_id, grant.organization_id, encryptString(passwordHash), nowIso()]
      );
      await client.query("DELETE FROM pilot_password_resets WHERE user_id = $1", [grant.user_id]);
      return true;
    });
  }
  return updateDatabase((database) => {
    database.pilotPasswordResets ??= [];
    const grant = database.pilotPasswordResets.find(
      (entry) => entry.tokenHash === input.tokenHash && Date.parse(entry.expiresAt) > Date.now()
    );
    if (!grant) return false;
    const user = database.users.find(
      (entry) =>
        entry.id === grant.userId &&
        entry.organizationId === grant.organizationId &&
        normalizedAccessState(entry) === "active"
    );
    if (!user) return false;
    const passwordHash = input.createPasswordHash();
    user.passwordHash = passwordHash;
    user.sessionVersion = normalizedSessionVersion(user) + 1;
    user.updatedAt = nowIso();
    database.pilotPasswordResets = database.pilotPasswordResets.filter(
      (entry) => entry.userId !== user.id
    );
    return true;
  });
}

export async function setPilotAccountAccess(input: {
  email: string;
  organizationId: string;
  accessState: "active" | "suspended";
}): Promise<boolean> {
  const emailLookupHash = createLookupHash("user-email", normalizeEmail(input.email));
  if (getStorageBackend() === "postgres") {
    return withPostgresTransaction(async (client) => {
      const result = await client.query(
        "SELECT id, access_state FROM users WHERE email_lookup_hash = $1 AND organization_id = $2 FOR UPDATE",
        [emailLookupHash, input.organizationId]
      );
      const user = result.rows[0];
      if (!user) return false;
      if (user.access_state === input.accessState) return true;
      await client.query(
        "UPDATE users SET access_state = $3, session_version = session_version + 1, updated_at = $4 WHERE id = $1 AND organization_id = $2",
        [user.id, input.organizationId, input.accessState, nowIso()]
      );
      await client.query("DELETE FROM pilot_password_resets WHERE user_id = $1", [user.id]);
      return true;
    });
  }
  return updateDatabase((database) => {
    const user = database.users.find(
      (entry) =>
        normalizeEmail(entry.email) === normalizeEmail(input.email) &&
        entry.organizationId === input.organizationId
    );
    if (!user) return false;
    if (normalizedAccessState(user) === input.accessState) return true;
    user.accessState = input.accessState;
    user.sessionVersion = normalizedSessionVersion(user) + 1;
    user.updatedAt = nowIso();
    database.pilotPasswordResets = (database.pilotPasswordResets ?? []).filter(
      (entry) => entry.userId !== user.id
    );
    return true;
  });
}

export async function revokeSessionVersion(
  userId: string,
  organizationId: string,
  expectedVersion: number
): Promise<void> {
  if (getStorageBackend() === "postgres") {
    await withPostgresTransaction(async (client) => {
      await client.query(
        "UPDATE users SET session_version = session_version + 1, updated_at = $4 WHERE id = $1 AND organization_id = $2 AND session_version = $3",
        [userId, organizationId, expectedVersion, nowIso()]
      );
    });
    return;
  }
  await updateDatabase((database) => {
    const user = database.users.find(
      (entry) =>
        entry.id === userId &&
        entry.organizationId === organizationId &&
        normalizedSessionVersion(entry) === expectedVersion
    );
    if (!user) return;
    user.sessionVersion = expectedVersion + 1;
    user.updatedAt = nowIso();
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
function normalizedAccessState(user: UserRecord): AccountAccessState {
  return user.accessState ?? "unapproved";
}
function normalizedSessionVersion(user: UserRecord): number {
  return user.sessionVersion ?? 0;
}
function isUniqueConflict(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
