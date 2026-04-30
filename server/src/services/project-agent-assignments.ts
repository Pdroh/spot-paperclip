import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, projectAgentAssignments } from "@paperclipai/db";
import type { ProjectAgentAssignment, ProjectAgentAssignmentWithAgent } from "@paperclipai/shared";
import { conflict, notFound } from "../errors.js";

export function projectAgentAssignmentService(db: Db) {
  async function listByProject(projectId: string): Promise<ProjectAgentAssignmentWithAgent[]> {
    const rows = await db
      .select({
        id: projectAgentAssignments.id,
        projectId: projectAgentAssignments.projectId,
        companyId: projectAgentAssignments.companyId,
        agentId: projectAgentAssignments.agentId,
        createdAt: projectAgentAssignments.createdAt,
        agentName: agents.name,
        agentRole: agents.role,
        agentAdapterType: agents.adapterType,
      })
      .from(projectAgentAssignments)
      .innerJoin(agents, eq(projectAgentAssignments.agentId, agents.id))
      .where(eq(projectAgentAssignments.projectId, projectId));

    return rows;
  }

  async function getAgentAssignment(agentId: string): Promise<ProjectAgentAssignment | null> {
    const row = await db
      .select()
      .from(projectAgentAssignments)
      .where(eq(projectAgentAssignments.agentId, agentId))
      .then((rows) => rows[0] ?? null);
    return row ?? null;
  }

  async function assign(projectId: string, companyId: string, agentId: string): Promise<ProjectAgentAssignment> {
    const existing = await db
      .select({ id: projectAgentAssignments.id })
      .from(projectAgentAssignments)
      .where(
        and(
          eq(projectAgentAssignments.projectId, projectId),
          eq(projectAgentAssignments.agentId, agentId),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (existing) {
      throw conflict("Agent is already assigned to this project");
    }

    const created = await db
      .insert(projectAgentAssignments)
      .values({ projectId, companyId, agentId })
      .returning()
      .then((rows) => rows[0]!);

    return created;
  }

  async function unassign(projectId: string, agentId: string): Promise<void> {
    const result = await db
      .delete(projectAgentAssignments)
      .where(
        and(
          eq(projectAgentAssignments.projectId, projectId),
          eq(projectAgentAssignments.agentId, agentId),
        ),
      )
      .returning({ id: projectAgentAssignments.id });

    if (result.length === 0) {
      throw notFound("Agent assignment not found");
    }
  }

  /** Returns project IDs the agent is restricted to (empty = no restriction). */
  async function getAgentProjectIds(agentId: string): Promise<string[]> {
    const rows = await db
      .select({ projectId: projectAgentAssignments.projectId })
      .from(projectAgentAssignments)
      .where(eq(projectAgentAssignments.agentId, agentId));
    return rows.map((r) => r.projectId);
  }

  return { listByProject, getAgentAssignment, assign, unassign, getAgentProjectIds };
}
