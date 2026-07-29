export type AuditLogListItem = {
  id: string;

  userId: string;
  userName: string;
  userEmail: string | null;

  action: string;
  module: string;

  entityId: string | null;
  entityType: string | null;

  oldValue: unknown;
  newValue: unknown;

  createdAt: Date | null;
};

export type AuditLogDetail = AuditLogListItem;
