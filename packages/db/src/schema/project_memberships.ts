import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";

export const projectMemberships = pgTable(
  "project_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectUserUniqueIdx: uniqueIndex("project_memberships_project_user_unique_idx").on(
      table.projectId,
      table.userId,
    ),
    userStatusIdx: index("project_memberships_user_status_idx").on(table.userId, table.status),
    projectStatusIdx: index("project_memberships_project_status_idx").on(table.projectId, table.status),
    companyIdx: index("project_memberships_company_idx").on(table.companyId),
  }),
);
