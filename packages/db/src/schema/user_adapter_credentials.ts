import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

/**
 * Stores encrypted per-user API credentials for agent adapters (e.g. Claude Code).
 *
 * Security requirements:
 * - `encryptedCredential` is AES-256-GCM encrypted at rest.
 * - `iv` is the unique initialization vector for each record (hex-encoded).
 * - `encryptedCredential` MUST NEVER be returned in API responses.
 * - The encryption key is read from the PAPERCLIP_CREDENTIAL_ENCRYPTION_KEY env var.
 */
export const userAdapterCredentials = pgTable(
  "user_adapter_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    adapterType: text("adapter_type").notNull(),
    label: text("label").notNull().default(""),
    encryptedCredential: text("encrypted_credential").notNull(),
    iv: text("iv").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userAdapterUniqueIdx: uniqueIndex("user_adapter_credentials_user_adapter_unique_idx").on(
      table.userId,
      table.adapterType,
    ),
    userIdx: index("user_adapter_credentials_user_idx").on(table.userId),
  }),
);
