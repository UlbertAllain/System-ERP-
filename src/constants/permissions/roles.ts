import { ALL_PERMISSION_SLUGS, type PermissionSlug } from "./permissions";

export type RoleSlug =
  | "super_admin"
  | "admin"
  | "project_manager"
  | "developer"
  | "designer"
  | "qa"
  | "finance_manager"
  | "finance"
  | "hr"
  | "employee";

export type RoleDefinition = {
  name: string;
  slug: RoleSlug;
  description: string;
  isSystem: boolean;
  permissionSlugs: PermissionSlug[];
};

const adminPermissions = [
  "user.read",

  "employee.read",
  "employee.read_all",

  "client.create",
  "client.read",
  "client.read_all",
  "client.update",
  "client.delete",
  "client.restore",
  "client.logo.update",

  "project.create",
  "project.read",
  "project.read_all",
  "project.update",
  "project.delete",
  "project.restore",

  "project_member.create",
  "project_member.read",
  "project_member.update",
  "project_member.delete",
  "project_member.assign",
  "project_member.remove",

  "milestone.create",
  "milestone.read",
  "milestone.update",
  "milestone.delete",

  "task.create",
  "task.read",
  "task.read_all",
  "task.update",
  "task.delete",
  "task.assign",

  "task_comment.create",
  "task_comment.read",
  "task_comment.delete_any",

  "invoice.create",
  "invoice.read",
  "invoice.read_all",
  "invoice.update",
  "invoice.delete",
  "invoice.change_status",

  "payment.read",

  "expense.create",
  "expense.read",
  "expense.read_all",
  "expense.update",
  "expense.submit",

  "report.dashboard.read",

  "audit_log.read",

  "setting.company.read",
  "setting.system.read",
] satisfies PermissionSlug[];

const hrPermissions = [
  "employee.create",
  "employee.read",
  "employee.read_all",
  "employee.update",
  "employee.delete",
  "employee.restore",
  "employee.photo.update",

  "leave.read",
  "leave.read_all",
  "leave.approve",
  "leave.reject",

  "attendance.read",
  "attendance.read_all",
  "attendance.update",

  "hr.dashboard.read",

] satisfies PermissionSlug[];

const employeePermissions = [
  "employee.read_own",
  "employee.update_own",
  "employee.photo.update",

  "leave.create",
  "leave.read_own",
  "leave.update_own",
  "leave.submit",
  "leave.cancel",

  "attendance.read_own",
  "attendance.clock_in",
  "attendance.clock_out",

  "task.read_assigned",

  "task_comment.create",
  "task_comment.read",
  "task_comment.update_own",
  "task_comment.delete_own",
] satisfies PermissionSlug[];

const projectManagerPermissions = [
  "project.read_assigned",
  "project.update_assigned",

  "project_member.read",
  "project_member.assign",
  "project_member.remove",

  "milestone.create",
  "milestone.read_assigned",
  "milestone.update_assigned",

  "task.create",
  "task.read_assigned",
  "task.update_assigned",
  "task.assign",

  "task_comment.create",
  "task_comment.read",
  "task_comment.update_own",
  "task_comment.delete_own",

  "invoice.read_project",

] satisfies PermissionSlug[];

const developerBasePermissions = [
  "employee.read_own",
  "employee.update_own",

  "project.read_assigned",

  "milestone.read_assigned",

  "task.read_assigned",

  "task_comment.create",
  "task_comment.read",
  "task_comment.update_own",
  "task_comment.delete_own",

  "leave.create",
  "leave.read_own",
  "leave.update_own",
  "leave.submit",
  "leave.cancel",

  "attendance.read_own",
  "attendance.clock_in",
  "attendance.clock_out",
] satisfies PermissionSlug[];

const qaPermissions = [
  ...developerBasePermissions,
  "task.create",
] satisfies PermissionSlug[];

const financePermissions = [
  "client.read_all",

  "project.read_all",

  "invoice.create",
  "invoice.read",
  "invoice.read_all",
  "invoice.update",
  "invoice.delete",
  "invoice.change_status",

  "payment.create",
  "payment.read",
  "payment.read_all",
  "payment.cancel",

  "expense.create",
  "expense.read",
  "expense.read_all",
  "expense.update",
  "expense.submit",
  "expense.mark_as_paid",

  "finance.dashboard.read",
  "report.dashboard.read",

] satisfies PermissionSlug[];

const financeManagerPermissions = [
  ...financePermissions,
  "expense.approve",
  "expense.reject",
  "expense.delete",
] satisfies PermissionSlug[];

export const ROLES = [
  {
    name: "Super Admin",
    slug: "super_admin",
    description: "Full access to all ERP modules and system settings.",
    isSystem: true,
    permissionSlugs: ALL_PERMISSION_SLUGS,
  },
  {
    name: "Admin",
    slug: "admin",
    description:
      "Operational admin with broad access except sensitive role and finance approval permissions.",
    isSystem: true,
    permissionSlugs: adminPermissions,
  },
  {
    name: "Project Manager",
    slug: "project_manager",
    description: "Manage assigned projects, members, milestones, and tasks.",
    isSystem: true,
    permissionSlugs: projectManagerPermissions,
  },
  {
    name: "Developer",
    slug: "developer",
    description: "Work on assigned projects and assigned tasks.",
    isSystem: true,
    permissionSlugs: developerBasePermissions,
  },
  {
    name: "Designer",
    slug: "designer",
    description: "Work on assigned design projects and assigned tasks.",
    isSystem: true,
    permissionSlugs: developerBasePermissions,
  },
  {
    name: "QA",
    slug: "qa",
    description:
      "Work on assigned QA tasks and create bug/task records for assigned projects.",
    isSystem: true,
    permissionSlugs: qaPermissions,
  },
  {
    name: "Finance Manager",
    slug: "finance_manager",
    description:
      "Approve or reject expenses and supervise finance operations.",
    isSystem: true,
    permissionSlugs: financeManagerPermissions,
  },
  {
    name: "Finance",
    slug: "finance",
    description: "Manage invoices, payments, expenses, and financial reports.",
    isSystem: true,
    permissionSlugs: financePermissions,
  },
  {
    name: "HR",
    slug: "hr",
    description:
      "Manage employees, leave requests, attendance, and HR reports.",
    isSystem: true,
    permissionSlugs: hrPermissions,
  },
  {
    name: "Employee",
    slug: "employee",
    description:
      "Basic employee access for own profile, attendance, leave, and assigned tasks.",
    isSystem: true,
    permissionSlugs: employeePermissions,
  },
] as const satisfies readonly RoleDefinition[];
