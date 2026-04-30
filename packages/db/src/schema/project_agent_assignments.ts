import { pgTable, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

export const projectAgentAssignments = pgTable(
  "project_agent_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectAgentUniqueIdx: uniqueIndex("project_agent_assignments_project_agent_unique_idx").on(
      table.projectId,
      table.agentId,
    ),
    agentIdx: index("project_agent_assignments_agent_idx").on(table.agentId),
    projectIdx: index("project_agent_assignments_project_idx").on(table.projectId),
    companyIdx: index("project_agent_assignments_company_idx").on(table.companyId),
  }),
);
