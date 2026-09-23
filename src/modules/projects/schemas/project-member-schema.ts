import { z } from "zod";

export const projectMemberRoleSchema = z.enum([
  "PROJECT_MANAGER",
  "TECH_LEAD",
  "DEVELOPER",
  "DESIGNER",
  "QA",
  "BUSINESS_ANALYST",
  "FINANCE",
  "OBSERVER",
]);

export const projectMemberStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "REMOVED",
]);

export const addProjectMemberSchema = z.object({
  projectId: z.string().min(1, "Project ID wajib diisi."),
  employeeId: z.string().min(1, "Employee wajib dipilih."),
  role: projectMemberRoleSchema,
});

export const updateProjectMemberSchema = z.object({
  id: z.string().min(1, "Project member ID wajib diisi."),
  role: projectMemberRoleSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const removeProjectMemberSchema = z.object({
  id: z.string().min(1, "Project member ID wajib diisi."),
});

export const projectMemberIdSchema = z.object({
  id: z.string().min(1, "Project member ID wajib diisi."),
});

export const listProjectMembersSchema = z.object({
  projectId: z.string().min(1, "Project ID wajib diisi.").optional(),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberInput = z.infer<
  typeof updateProjectMemberSchema
>;
export type RemoveProjectMemberInput = z.infer<
  typeof removeProjectMemberSchema
>;
export type ProjectMemberIdInput = z.infer<typeof projectMemberIdSchema>;
export type ListProjectMembersInput = z.infer<typeof listProjectMembersSchema>;
