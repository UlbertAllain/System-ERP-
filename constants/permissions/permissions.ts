export type PermissionModule =
  | "user"
  | "role"
  | "permission"
  | "employee"
  | "hr"
  | "leave"
  | "attendance"
  | "client"
  | "project"
  | "project_member"
  | "milestone"
  | "task"
  | "task_comment"
  | "invoice"
  | "payment"
  | "expense"
  | "finance"
  | "report"
  | "audit_log"
  | "setting";

export type PermissionDefinition = {
  name: string;
  slug: string;
  module: PermissionModule;
  description: string;
};

export const PERMISSIONS = [
  // User
  {
    name: "Create User",
    slug: "user.create",
    module: "user",
    description: "Create internal ERP user.",
  },
  {
    name: "Read User",
    slug: "user.read",
    module: "user",
    description: "Read user data.",
  },
  {
    name: "Update User",
    slug: "user.update",
    module: "user",
    description: "Update user data.",
  },
  {
    name: "Delete User",
    slug: "user.delete",
    module: "user",
    description: "Soft delete user.",
  },
  {
    name: "Suspend User",
    slug: "user.suspend",
    module: "user",
    description: "Suspend user access.",
  },
  {
    name: "Activate User",
    slug: "user.activate",
    module: "user",
    description: "Activate suspended or inactive user.",
  },
  {
    name: "Assign Role",
    slug: "user.assign_role",
    module: "user",
    description: "Assign role to user.",
  },
  {
    name: "Remove Role",
    slug: "user.remove_role",
    module: "user",
    description: "Remove role from user.",
  },
  {
    name: "Reset User Password",
    slug: "user.reset_password",
    module: "user",
    description: "Reset user password.",
  },
  {
    name: "Update User Avatar",
    slug: "user.avatar.update",
    module: "user",
    description: "Update user avatar image.",
  },

  // Role
  {
    name: "Create Role",
    slug: "role.create",
    module: "role",
    description: "Create role.",
  },
  {
    name: "Read Role",
    slug: "role.read",
    module: "role",
    description: "Read role data.",
  },
  {
    name: "Update Role",
    slug: "role.update",
    module: "role",
    description: "Update role.",
  },
  {
    name: "Delete Role",
    slug: "role.delete",
    module: "role",
    description: "Delete non-system role.",
  },
  {
    name: "Manage Role Permission",
    slug: "role.manage_permission",
    module: "role",
    description: "Manage permissions attached to role.",
  },

  // Permission
  {
    name: "Read Permission",
    slug: "permission.read",
    module: "permission",
    description: "Read permission list.",
  },
  {
    name: "Create Permission",
    slug: "permission.create",
    module: "permission",
    description: "Create permission.",
  },
  {
    name: "Update Permission",
    slug: "permission.update",
    module: "permission",
    description: "Update permission.",
  },
  {
    name: "Delete Permission",
    slug: "permission.delete",
    module: "permission",
    description: "Delete permission.",
  },

  // Employee
  {
    name: "Create Employee",
    slug: "employee.create",
    module: "employee",
    description: "Create employee profile.",
  },
  {
    name: "Read Employee",
    slug: "employee.read",
    module: "employee",
    description: "Read employee data.",
  },
  {
    name: "Read All Employees",
    slug: "employee.read_all",
    module: "employee",
    description: "Read all employee data.",
  },
  {
    name: "Read Own Employee Profile",
    slug: "employee.read_own",
    module: "employee",
    description: "Read own employee profile.",
  },
  {
    name: "Update Employee",
    slug: "employee.update",
    module: "employee",
    description: "Update employee profile.",
  },
  {
    name: "Update Own Employee Profile",
    slug: "employee.update_own",
    module: "employee",
    description: "Update own employee profile.",
  },
  {
    name: "Delete Employee",
    slug: "employee.delete",
    module: "employee",
    description: "Soft delete employee.",
  },
  {
    name: "Restore Employee",
    slug: "employee.restore",
    module: "employee",
    description: "Restore deleted employee.",
  },
  {
    name: "Update Employee Photo",
    slug: "employee.photo.update",
    module: "employee",
    description: "Update employee photo.",
  },

  // HR
  {
    name: "Read HR Dashboard",
    slug: "hr.dashboard.read",
    module: "hr",
    description: "Read HR dashboard summary.",
  },

  // Leave
  {
    name: "Create Leave Request",
    slug: "leave.create",
    module: "leave",
    description: "Create leave request.",
  },
  {
    name: "Read Leave Request",
    slug: "leave.read",
    module: "leave",
    description: "Read leave request.",
  },
  {
    name: "Read All Leave Requests",
    slug: "leave.read_all",
    module: "leave",
    description: "Read all leave requests.",
  },
  {
    name: "Read Own Leave Requests",
    slug: "leave.read_own",
    module: "leave",
    description: "Read own leave requests.",
  },
  {
    name: "Update Leave Request",
    slug: "leave.update",
    module: "leave",
    description: "Update leave request.",
  },
  {
    name: "Update Own Leave Request",
    slug: "leave.update_own",
    module: "leave",
    description: "Update own leave request.",
  },
  {
    name: "Submit Leave Request",
    slug: "leave.submit",
    module: "leave",
    description: "Submit leave request.",
  },
  {
    name: "Approve Leave Request",
    slug: "leave.approve",
    module: "leave",
    description: "Approve leave request.",
  },
  {
    name: "Reject Leave Request",
    slug: "leave.reject",
    module: "leave",
    description: "Reject leave request.",
  },
  {
    name: "Cancel Leave Request",
    slug: "leave.cancel",
    module: "leave",
    description: "Cancel leave request.",
  },
  {
    name: "Delete Leave Request",
    slug: "leave.delete",
    module: "leave",
    description: "Delete leave request.",
  },

  // Attendance
  {
    name: "Create Attendance",
    slug: "attendance.create",
    module: "attendance",
    description: "Create attendance record.",
  },
  {
    name: "Read Attendance",
    slug: "attendance.read",
    module: "attendance",
    description: "Read attendance record.",
  },
  {
    name: "Read All Attendance",
    slug: "attendance.read_all",
    module: "attendance",
    description: "Read all attendance records.",
  },
  {
    name: "Read Own Attendance",
    slug: "attendance.read_own",
    module: "attendance",
    description: "Read own attendance records.",
  },
  {
    name: "Update Attendance",
    slug: "attendance.update",
    module: "attendance",
    description: "Update attendance record.",
  },
  {
    name: "Update Own Attendance",
    slug: "attendance.update_own",
    module: "attendance",
    description: "Update own attendance record.",
  },
  {
    name: "Clock In",
    slug: "attendance.clock_in",
    module: "attendance",
    description: "Clock in attendance.",
  },
  {
    name: "Clock Out",
    slug: "attendance.clock_out",
    module: "attendance",
    description: "Clock out attendance.",
  },
  {
    name: "Delete Attendance",
    slug: "attendance.delete",
    module: "attendance",
    description: "Delete attendance record.",
  },

  // Client
  {
    name: "Create Client",
    slug: "client.create",
    module: "client",
    description: "Create client.",
  },
  {
    name: "Read Client",
    slug: "client.read",
    module: "client",
    description: "Read client.",
  },
  {
    name: "Read All Clients",
    slug: "client.read_all",
    module: "client",
    description: "Read all clients.",
  },
  {
    name: "Update Client",
    slug: "client.update",
    module: "client",
    description: "Update client.",
  },
  {
    name: "Delete Client",
    slug: "client.delete",
    module: "client",
    description: "Soft delete client.",
  },
  {
    name: "Restore Client",
    slug: "client.restore",
    module: "client",
    description: "Restore deleted client.",
  },
  {
    name: "Convert Client From Lead",
    slug: "client.convert_from_lead",
    module: "client",
    description: "Convert lead to active client.",
  },
  {
    name: "Blacklist Client",
    slug: "client.blacklist",
    module: "client",
    description: "Blacklist client.",
  },
  {
    name: "Update Client Logo",
    slug: "client.logo.update",
    module: "client",
    description: "Update client logo.",
  },

  // Project
  {
    name: "Create Project",
    slug: "project.create",
    module: "project",
    description: "Create project.",
  },
  {
    name: "Read Project",
    slug: "project.read",
    module: "project",
    description: "Read project.",
  },
  {
    name: "Read All Projects",
    slug: "project.read_all",
    module: "project",
    description: "Read all projects.",
  },
  {
    name: "Read Assigned Project",
    slug: "project.read_assigned",
    module: "project",
    description: "Read assigned projects.",
  },
  {
    name: "Update Project",
    slug: "project.update",
    module: "project",
    description: "Update project.",
  },
  {
    name: "Update Assigned Project",
    slug: "project.update_assigned",
    module: "project",
    description: "Update assigned project.",
  },
  {
    name: "Delete Project",
    slug: "project.delete",
    module: "project",
    description: "Soft delete project.",
  },
  {
    name: "Restore Project",
    slug: "project.restore",
    module: "project",
    description: "Restore deleted project.",
  },
  {
    name: "Change Project Status",
    slug: "project.change_status",
    module: "project",
    description: "Change project status.",
  },
  {
    name: "View Project Financial",
    slug: "project.view_financial",
    module: "project",
    description: "View project financial data.",
  },
  {
    name: "View Project Profitability",
    slug: "project.view_profitability",
    module: "project",
    description: "View project profitability.",
  },
  {
    name: "Update Project Thumbnail",
    slug: "project.thumbnail.update",
    module: "project",
    description: "Update project thumbnail.",
  },

  // Project Member
  {
    name: "Create Project Member",
    slug: "project_member.create",
    module: "project_member",
    description: "Create project member.",
  },
  {
    name: "Read Project Member",
    slug: "project_member.read",
    module: "project_member",
    description: "Read project member.",
  },
  {
    name: "Update Project Member",
    slug: "project_member.update",
    module: "project_member",
    description: "Update project member.",
  },
  {
    name: "Delete Project Member",
    slug: "project_member.delete",
    module: "project_member",
    description: "Delete project member.",
  },
  {
    name: "Assign Project Member",
    slug: "project_member.assign",
    module: "project_member",
    description: "Assign project member.",
  },
  {
    name: "Remove Project Member",
    slug: "project_member.remove",
    module: "project_member",
    description: "Remove project member.",
  },

  // Milestone
  {
    name: "Create Milestone",
    slug: "milestone.create",
    module: "milestone",
    description: "Create milestone.",
  },
  {
    name: "Read Milestone",
    slug: "milestone.read",
    module: "milestone",
    description: "Read milestone.",
  },
  {
    name: "Read Assigned Milestone",
    slug: "milestone.read_assigned",
    module: "milestone",
    description: "Read assigned milestone.",
  },
  {
    name: "Update Milestone",
    slug: "milestone.update",
    module: "milestone",
    description: "Update milestone.",
  },
  {
    name: "Update Assigned Milestone",
    slug: "milestone.update_assigned",
    module: "milestone",
    description: "Update assigned milestone.",
  },
  {
    name: "Delete Milestone",
    slug: "milestone.delete",
    module: "milestone",
    description: "Delete milestone.",
  },
  {
    name: "Change Milestone Status",
    slug: "milestone.change_status",
    module: "milestone",
    description: "Change milestone status.",
  },
  {
    name: "Approve Milestone",
    slug: "milestone.approve",
    module: "milestone",
    description: "Approve milestone.",
  },

  // Task
  {
    name: "Create Task",
    slug: "task.create",
    module: "task",
    description: "Create task.",
  },
  {
    name: "Read Task",
    slug: "task.read",
    module: "task",
    description: "Read task.",
  },
  {
    name: "Read All Tasks",
    slug: "task.read_all",
    module: "task",
    description: "Read all tasks.",
  },
  {
    name: "Read Assigned Task",
    slug: "task.read_assigned",
    module: "task",
    description: "Read assigned tasks.",
  },
  {
    name: "Update Task",
    slug: "task.update",
    module: "task",
    description: "Update task.",
  },
  {
    name: "Update Assigned Task",
    slug: "task.update_assigned",
    module: "task",
    description: "Update assigned task.",
  },
  {
    name: "Delete Task",
    slug: "task.delete",
    module: "task",
    description: "Soft delete task.",
  },
  {
    name: "Restore Task",
    slug: "task.restore",
    module: "task",
    description: "Restore deleted task.",
  },
  {
    name: "Assign Task",
    slug: "task.assign",
    module: "task",
    description: "Assign task.",
  },
  {
    name: "Change Task Status",
    slug: "task.change_status",
    module: "task",
    description: "Change task status.",
  },
  {
    name: "Change Own Task Status",
    slug: "task.change_own_status",
    module: "task",
    description: "Change own task status.",
  },
  {
    name: "Update Task Hours",
    slug: "task.update_hours",
    module: "task",
    description: "Update task working hours.",
  },
  {
    name: "Update Own Task Hours",
    slug: "task.update_own_hours",
    module: "task",
    description: "Update own task working hours.",
  },

  // Task Comment
  {
    name: "Create Task Comment",
    slug: "task_comment.create",
    module: "task_comment",
    description: "Create task comment.",
  },
  {
    name: "Read Task Comment",
    slug: "task_comment.read",
    module: "task_comment",
    description: "Read task comment.",
  },
  {
    name: "Update Own Task Comment",
    slug: "task_comment.update_own",
    module: "task_comment",
    description: "Update own task comment.",
  },
  {
    name: "Delete Own Task Comment",
    slug: "task_comment.delete_own",
    module: "task_comment",
    description: "Delete own task comment.",
  },
  {
    name: "Delete Any Task Comment",
    slug: "task_comment.delete_any",
    module: "task_comment",
    description: "Delete any task comment.",
  },

  // Invoice
  {
    name: "Create Invoice",
    slug: "invoice.create",
    module: "invoice",
    description: "Create invoice.",
  },
  {
    name: "Read Invoice",
    slug: "invoice.read",
    module: "invoice",
    description: "Read invoice.",
  },
  {
    name: "Read All Invoices",
    slug: "invoice.read_all",
    module: "invoice",
    description: "Read all invoices.",
  },
  {
    name: "Read Project Invoice",
    slug: "invoice.read_project",
    module: "invoice",
    description: "Read invoice for assigned project.",
  },
  {
    name: "Update Invoice",
    slug: "invoice.update",
    module: "invoice",
    description: "Update invoice.",
  },
  {
    name: "Delete Invoice",
    slug: "invoice.delete",
    module: "invoice",
    description: "Soft delete invoice.",
  },
  {
    name: "Restore Invoice",
    slug: "invoice.restore",
    module: "invoice",
    description: "Restore deleted invoice.",
  },
  {
    name: "Change Invoice Status",
    slug: "invoice.change_status",
    module: "invoice",
    description: "Change invoice status.",
  },
  {
    name: "Send Invoice",
    slug: "invoice.send",
    module: "invoice",
    description: "Mark invoice as sent.",
  },
  {
    name: "View Invoice Financial Summary",
    slug: "invoice.view_financial_summary",
    module: "invoice",
    description: "View invoice financial summary.",
  },

  // Payment
  {
    name: "Create Payment",
    slug: "payment.create",
    module: "payment",
    description: "Create payment.",
  },
  {
    name: "Read Payment",
    slug: "payment.read",
    module: "payment",
    description: "Read payment.",
  },
  {
    name: "Read All Payments",
    slug: "payment.read_all",
    module: "payment",
    description: "Read all payments.",
  },
  {
    name: "Update Payment",
    slug: "payment.update",
    module: "payment",
    description: "Update payment.",
  },
  {
    name: "Confirm Payment",
    slug: "payment.confirm",
    module: "payment",
    description: "Confirm payment.",
  },
  {
    name: "Cancel Payment",
    slug: "payment.cancel",
    module: "payment",
    description: "Cancel payment.",
  },
  {
    name: "Refund Payment",
    slug: "payment.refund",
    module: "payment",
    description: "Refund payment.",
  },
  {
    name: "Delete Payment",
    slug: "payment.delete",
    module: "payment",
    description: "Delete payment.",
  },

  // Expense
  {
    name: "Create Expense",
    slug: "expense.create",
    module: "expense",
    description: "Create expense.",
  },
  {
    name: "Read Expense",
    slug: "expense.read",
    module: "expense",
    description: "Read expense.",
  },
  {
    name: "Read All Expenses",
    slug: "expense.read_all",
    module: "expense",
    description: "Read all expenses.",
  },
  {
    name: "Read Own Expense",
    slug: "expense.read_own",
    module: "expense",
    description: "Read own expense.",
  },
  {
    name: "Update Expense",
    slug: "expense.update",
    module: "expense",
    description: "Update expense.",
  },
  {
    name: "Update Own Expense",
    slug: "expense.update_own",
    module: "expense",
    description: "Update own expense.",
  },
  {
    name: "Submit Expense",
    slug: "expense.submit",
    module: "expense",
    description: "Submit expense.",
  },
  {
    name: "Approve Expense",
    slug: "expense.approve",
    module: "expense",
    description: "Approve expense.",
  },
  {
    name: "Reject Expense",
    slug: "expense.reject",
    module: "expense",
    description: "Reject expense.",
  },
  {
    name: "Mark Expense As Paid",
    slug: "expense.mark_as_paid",
    module: "expense",
    description: "Mark expense as paid.",
  },
  {
    name: "Delete Expense",
    slug: "expense.delete",
    module: "expense",
    description: "Soft delete expense.",
  },
  {
    name: "Restore Expense",
    slug: "expense.restore",
    module: "expense",
    description: "Restore deleted expense.",
  },
  {
    name: "Update Expense Receipt",
    slug: "expense.receipt.update",
    module: "expense",
    description: "Update expense receipt image.",
  },

  // Finance
  {
    name: "Read Finance Dashboard",
    slug: "finance.dashboard.read",
    module: "finance",
    description: "Read finance dashboard.",
  },
  {
    name: "Read Cashflow",
    slug: "finance.cashflow.read",
    module: "finance",
    description: "Read cashflow.",
  },
  {
    name: "Read Income",
    slug: "finance.income.read",
    module: "finance",
    description: "Read income.",
  },
  {
    name: "Read Expense Summary",
    slug: "finance.expense.read",
    module: "finance",
    description: "Read expense summary.",
  },
  {
    name: "Read Profit Loss",
    slug: "finance.profit_loss.read",
    module: "finance",
    description: "Read profit loss.",
  },
  {
    name: "Read Project Profitability",
    slug: "finance.project_profitability.read",
    module: "finance",
    description: "Read project profitability.",
  },
  {
    name: "Export Finance",
    slug: "finance.export",
    module: "finance",
    description: "Export finance data.",
  },

  // Report
  {
    name: "Read Report Dashboard",
    slug: "report.dashboard.read",
    module: "report",
    description: "Read report dashboard.",
  },
  {
    name: "Read Project Report",
    slug: "report.project.read",
    module: "report",
    description: "Read project report.",
  },
  {
    name: "Read Task Report",
    slug: "report.task.read",
    module: "report",
    description: "Read task report.",
  },
  {
    name: "Read Employee Report",
    slug: "report.employee.read",
    module: "report",
    description: "Read employee report.",
  },
  {
    name: "Read Client Report",
    slug: "report.client.read",
    module: "report",
    description: "Read client report.",
  },
  {
    name: "Read Finance Report",
    slug: "report.finance.read",
    module: "report",
    description: "Read finance report.",
  },
  {
    name: "Read HR Report",
    slug: "report.hr.read",
    module: "report",
    description: "Read HR report.",
  },
  {
    name: "Export Report",
    slug: "report.export",
    module: "report",
    description: "Export report data.",
  },

  // Audit Log
  {
    name: "Read Audit Log",
    slug: "audit_log.read",
    module: "audit_log",
    description: "Read audit log.",
  },
  {
    name: "Read All Audit Logs",
    slug: "audit_log.read_all",
    module: "audit_log",
    description: "Read all audit logs.",
  },
  {
    name: "Export Audit Log",
    slug: "audit_log.export",
    module: "audit_log",
    description: "Export audit logs.",
  },

  // Setting
  {
    name: "Read Company Setting",
    slug: "setting.company.read",
    module: "setting",
    description: "Read company setting.",
  },
  {
    name: "Update Company Setting",
    slug: "setting.company.update",
    module: "setting",
    description: "Update company setting.",
  },
  {
    name: "Read System Setting",
    slug: "setting.system.read",
    module: "setting",
    description: "Read system setting.",
  },
  {
    name: "Update System Setting",
    slug: "setting.system.update",
    module: "setting",
    description: "Update system setting.",
  },
] as const satisfies readonly PermissionDefinition[];

export type PermissionSlug = (typeof PERMISSIONS)[number]["slug"];

export const ALL_PERMISSION_SLUGS = PERMISSIONS.map(
  (permission) => permission.slug,
);
