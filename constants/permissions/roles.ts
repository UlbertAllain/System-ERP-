import { ALL_PERMISSION_SLUGS, type PermissionSlug } from "./permissions";

export type RoleSlug =
  | "super_admin"
  | "admin"
  | "project_manager"
  | "developer"
  | "designer"
  | "qa"
  | "finance"
  | "hr"
  | "employee"
  | "client";

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
  "client.convert_from_lead",
  "client.blacklist",
  "client.logo.update",

  "project.create",
  "project.read",
  "project.read_all",
  "project.update",
  "project.delete",
  "project.restore",
  "project.change_status",
  "project.thumbnail.update",

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
  "milestone.change_status",

  "task.create",
  "task.read",
  "task.read_all",
  "task.update",
  "task.delete",
  "task.restore",
  "task.assign",
  "task.change_status",
  "task.update_hours",

  "task_comment.create",
  "task_comment.read",
  "task_comment.delete_any",

  "invoice.create",
  "invoice.read",
  "invoice.read_all",
  "invoice.update",
  "invoice.delete",
  "invoice.restore",
  "invoice.change_status",
  "invoice.send",

  "payment.read",

  "expense.create",
  "expense.read",
  "expense.read_all",
  "expense.update",
  "expense.submit",

  "report.dashboard.read",
  "report.project.read",
  "report.task.read",
  "report.employee.read",
  "report.client.read",

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

  "report.hr.read",
  "report.employee.read",
] satisfies PermissionSlug[];

const employeePermissions = [
  "employee.read_own",
  "employee.update_own",
  "employee.photo.update",

  "user.avatar.update",

  "leave.create",
  "leave.read_own",
  "leave.update_own",
  "leave.submit",
  "leave.cancel",

  "attendance.read_own",
  "attendance.clock_in",
  "attendance.clock_out",

  "task.read_assigned",
  "task.change_own_status",
  "task.update_own_hours",

  "task_comment.create",
  "task_comment.read",
  "task_comment.update_own",
  "task_comment.delete_own",
] satisfies PermissionSlug[];

const projectManagerPermissions = [
  "project.read_assigned",
  "project.update_assigned",
  "project.change_status",
  "project.view_financial",

  "project_member.read",
  "project_member.assign",
  "project_member.remove",

  "milestone.create",
  "milestone.read_assigned",
  "milestone.update_assigned",
  "milestone.change_status",

  "task.create",
  "task.read_assigned",
  "task.update_assigned",
  "task.assign",
  "task.change_status",
  "task.update_hours",

  "task_comment.create",
  "task_comment.read",
  "task_comment.update_own",
  "task_comment.delete_own",

  "invoice.read_project",

  "report.project.read",
  "report.task.read",
] satisfies PermissionSlug[];

const developerBasePermissions = [
  "employee.read_own",
  "employee.update_own",

  "project.read_assigned",

  "milestone.read_assigned",

  "task.read_assigned",
  "task.change_own_status",
  "task.update_own_hours",

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
  "project.view_financial",
  "project.view_profitability",

  "invoice.create",
  "invoice.read",
  "invoice.read_all",
  "invoice.update",
  "invoice.delete",
  "invoice.restore",
  "invoice.change_status",
  "invoice.send",
  "invoice.view_financial_summary",

  "payment.create",
  "payment.read",
  "payment.read_all",
  "payment.update",
  "payment.confirm",
  "payment.cancel",
  "payment.refund",

  "expense.create",
  "expense.read",
  "expense.read_all",
  "expense.update",
  "expense.submit",
  "expense.mark_as_paid",
  "expense.receipt.update",

  "finance.dashboard.read",
  "finance.cashflow.read",
  "finance.income.read",
  "finance.expense.read",
  "finance.profit_loss.read",
  "finance.project_profitability.read",
  "finance.export",
  "report.dashboard.read",

  "report.finance.read",
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
  {
    name: "Client",
    slug: "client",
    description: "Reserved role for future client portal. Inactive for MVP v1.",
    isSystem: true,
    permissionSlugs: [],
  },
] as const satisfies readonly RoleDefinition[];
