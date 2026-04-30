import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { authUsers, projectMemberships } from "@paperclipai/db";
import type { ProjectMembership, ProjectMembershipRole, ProjectMembershipWithUser } from "@paperclipai/shared";
import { notFound } from "../errors.js";

export function projectMembershipService(db: Db) {
  async function list(projectId: string): Promise<ProjectMembershipWithUser[]> {
    const rows = await db
      .select({
        id: projectMemberships.id,
        projectId: projectMemberships.projectId,
        companyId: projectMemberships.companyId,
        userId: projectMemberships.userId,
        role: projectMemberships.role,
        status: projectMemberships.status,
        createdAt: projectMemberships.createdAt,
        updatedAt: projectMemberships.updatedAt,
        userName: authUsers.name,
        userEmail: authUsers.email,
        userImage: authUsers.image,
      })
      .from(projectMemberships)
      .leftJoin(authUsers, eq(projectMemberships.userId, authUsers.id))
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.status, "active"),
        ),
      );

    return rows.map((row) => ({
      ...row,
      role: row.role as ProjectMembershipRole,
      status: row.status as "active" | "inactive",
      userName: row.userName ?? null,
      userEmail: row.userEmail ?? null,
      userImage: row.userImage ?? null,
    }));
  }

  async function findByUser(projectId: string, userId: string): Promise<ProjectMembership | null> {
    const row = await db
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId),
          eq(projectMemberships.status, "active"),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (!row) return null;
    return {
      ...row,
      role: row.role as ProjectMembershipRole,
      status: row.status as "active" | "inactive",
    };
  }

  async function add(projectId: string, companyId: string, userId: string, role: ProjectMembershipRole): Promise<ProjectMembership> {
    const existing = await db
      .select({ id: projectMemberships.id, status: projectMemberships.status })
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (existing) {
      const updated = await db
        .update(projectMemberships)
        .set({ role, status: "active", updatedAt: new Date() })
        .where(eq(projectMemberships.id, existing.id))
        .returning()
        .then((rows) => rows[0]!);
      return { ...updated, role: updated.role as ProjectMembershipRole, status: "active" };
    }

    const created = await db
      .insert(projectMemberships)
      .values({ projectId, companyId, userId, role, status: "active" })
      .returning()
      .then((rows) => rows[0]!);
    return { ...created, role: created.role as ProjectMembershipRole, status: "active" };
  }

  async function update(projectId: string, userId: string, role: ProjectMembershipRole): Promise<ProjectMembership> {
    const updated = await db
      .update(projectMemberships)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId),
          eq(projectMemberships.status, "active"),
        ),
      )
      .returning()
      .then((rows) => rows[0] ?? null);

    if (!updated) {
      throw notFound("Project membership not found");
    }
    return { ...updated, role: updated.role as ProjectMembershipRole, status: "active" };
  }

  async function remove(projectId: string, userId: string): Promise<void> {
    const result = await db
      .update(projectMemberships)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId),
          eq(projectMemberships.status, "active"),
        ),
      )
      .returning({ id: projectMemberships.id });

    if (result.length === 0) {
      throw notFound("Project membership not found");
    }
  }

  /** Returns all project IDs the user has active membership in. */
  async function getUserProjectIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ projectId: projectMemberships.projectId })
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.userId, userId),
          eq(projectMemberships.status, "active"),
        ),
      );
    return rows.map((r) => r.projectId);
  }

  return { list, findByUser, add, update, remove, getUserProjectIds };
}
