import type {
  ProjectSkill,
  ProjectSkillListItem,
  CreateProjectSkill,
  UpdateProjectSkill,
} from "@paperclipai/shared";
import { api } from "./client";

const base = (companyId: string, projectId: string) =>
  `/companies/${encodeURIComponent(companyId)}/projects/${encodeURIComponent(projectId)}/skills`;

export const projectSkillsApi = {
  list: (companyId: string, projectId: string) =>
    api.get<ProjectSkillListItem[]>(base(companyId, projectId)),

  detail: (companyId: string, projectId: string, skillId: string) =>
    api.get<ProjectSkill>(`${base(companyId, projectId)}/${encodeURIComponent(skillId)}`),

  create: (companyId: string, projectId: string, payload: CreateProjectSkill) =>
    api.post<ProjectSkill>(base(companyId, projectId), payload),

  update: (companyId: string, projectId: string, skillId: string, payload: UpdateProjectSkill) =>
    api.patch<ProjectSkill>(
      `${base(companyId, projectId)}/${encodeURIComponent(skillId)}`,
      payload,
    ),

  remove: (companyId: string, projectId: string, skillId: string) =>
    api.delete(`${base(companyId, projectId)}/${encodeURIComponent(skillId)}`),
};
