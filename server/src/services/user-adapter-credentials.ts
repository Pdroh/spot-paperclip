import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { userAdapterCredentials } from "@paperclipai/db";
import type { UserAdapterCredential } from "@paperclipai/shared";
import { notFound } from "../errors.js";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY is not set. " +
      "Set it to a 64-character hex string (32 bytes) to enable per-user credential storage.",
    );
  }
  const key = Buffer.from(raw.trim(), "hex");
  if (key.length !== KEY_BYTE_LENGTH) {
    throw new Error(
      `PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY must be exactly ${KEY_BYTE_LENGTH * 2} hex characters (${KEY_BYTE_LENGTH} bytes). Got ${key.length} bytes.`,
    );
  }
  return key;
}

function encrypt(plaintext: string): { encryptedCredential: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as: iv (hex) + encrypted (hex) + authTag (hex) in the `encryptedCredential` field
  const encryptedCredential = Buffer.concat([encrypted, tag]).toString("hex");
  return { encryptedCredential, iv: iv.toString("hex") };
}

function decrypt(encryptedCredential: string, ivHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(encryptedCredential, "hex");
  const tag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const encrypted = data.subarray(0, data.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/** Returns only metadata — never exposes the encrypted credential or IV. */
function rowToCredential(row: typeof userAdapterCredentials.$inferSelect): UserAdapterCredential {
  return {
    id: row.id,
    userId: row.userId,
    adapterType: row.adapterType,
    label: row.label,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function userAdapterCredentialService(db: Db) {
  async function list(userId: string): Promise<UserAdapterCredential[]> {
    const rows = await db
      .select()
      .from(userAdapterCredentials)
      .where(eq(userAdapterCredentials.userId, userId));

    return rows.map(rowToCredential);
  }

  async function upsert(
    userId: string,
    adapterType: string,
    label: string,
    apiKey: string,
  ): Promise<UserAdapterCredential> {
    const { encryptedCredential, iv } = encrypt(apiKey);
    const now = new Date();

    const existing = await db
      .select({ id: userAdapterCredentials.id })
      .from(userAdapterCredentials)
      .where(
        and(
          eq(userAdapterCredentials.userId, userId),
          eq(userAdapterCredentials.adapterType, adapterType),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (existing) {
      const updated = await db
        .update(userAdapterCredentials)
        .set({ label, encryptedCredential, iv, updatedAt: now })
        .where(eq(userAdapterCredentials.id, existing.id))
        .returning()
        .then((rows) => rows[0]!);
      return rowToCredential(updated);
    }

    const created = await db
      .insert(userAdapterCredentials)
      .values({ userId, adapterType, label, encryptedCredential, iv })
      .returning()
      .then((rows) => rows[0]!);
    return rowToCredential(created);
  }

  async function remove(userId: string, adapterType: string): Promise<void> {
    const result = await db
      .delete(userAdapterCredentials)
      .where(
        and(
          eq(userAdapterCredentials.userId, userId),
          eq(userAdapterCredentials.adapterType, adapterType),
        ),
      )
      .returning({ id: userAdapterCredentials.id });

    if (result.length === 0) throw notFound("Credential not found");
  }

  /**
   * Resolves (decrypts) the API key for a user+adapterType.
   * Only called internally when dispatching agent runs — never exposed via API.
   */
  async function resolveApiKey(userId: string, adapterType: string): Promise<string | null> {
    const row = await db
      .select({
        encryptedCredential: userAdapterCredentials.encryptedCredential,
        iv: userAdapterCredentials.iv,
      })
      .from(userAdapterCredentials)
      .where(
        and(
          eq(userAdapterCredentials.userId, userId),
          eq(userAdapterCredentials.adapterType, adapterType),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (!row) return null;

    try {
      return decrypt(row.encryptedCredential, row.iv);
    } catch {
      return null;
    }
  }

  return { list, upsert, remove, resolveApiKey };
}
