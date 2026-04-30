export type ProjectMembershipRole = "owner" | "member" | "viewer";

export type ProjectMembershipStatus = "active" | "inactive";

export interface ProjectMembership {
  id: string;
  projectId: string;
  companyId: string;
  userId: string;
  role: ProjectMembershipRole;
  status: ProjectMembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMembershipWithUser extends ProjectMembership {
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

export interface ProjectAgentAssignment {
  id: string;
  projectId: string;
  companyId: string;
  agentId: string;
  createdAt: Date;
}

export interface ProjectAgentAssignmentWithAgent extends ProjectAgentAssignment {
  agentName: string;
  agentRole: string;
  agentAdapterType: string;
}
