"use client";

import { useMemo, useState } from "react";
import { Eye, History } from "lucide-react";

import type { AuditLogListItem } from "@/types/audit-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditLogManagementClientProps = {
  auditLogs: AuditLogListItem[];
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditLogManagementClient({
  auditLogs,
}: AuditLogManagementClientProps) {
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogListItem | null>(null);

  const modules = useMemo(() => {
    return Array.from(new Set(auditLogs.map((log) => log.module)))
      .filter(Boolean)
      .sort();
  }, [auditLogs]);

  const actions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((log) => log.action)))
      .filter(Boolean)
      .sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (moduleFilter && log.module !== moduleFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;

      if (userFilter) {
        const keyword = userFilter.toLowerCase();

        const matchName = log.userName.toLowerCase().includes(keyword);
        const matchEmail = log.userEmail?.toLowerCase().includes(keyword);
        const matchUserId = log.userId.toLowerCase().includes(keyword);

        if (!matchName && !matchEmail && !matchUserId) return false;
      }

      return true;
    });
  }, [actionFilter, auditLogs, moduleFilter, userFilter]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          System
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Audit Logs
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pantau aktivitas penting di sistem, termasuk create, update, delete,
          approval, payment, dan perubahan status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="moduleFilter">Module</Label>
            <select
              id="moduleFilter"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
            >
              <option value="">All modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="actionFilter">Action</Label>
            <select
              id="actionFilter"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              <option value="">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="userFilter">User</Label>
            <Input
              id="userFilter"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              placeholder="Search user name/email/id"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Logs
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="w-[120px]">Detail</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium">{log.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.userEmail ?? log.userId}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">{log.module}</Badge>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium">{log.action}</span>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium">{log.entityType ?? "-"}</p>
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {log.entityId ?? "-"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="size-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada audit log.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={() => setSelectedLog(null)}
      >
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Audit Log Detail</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedLog?.action} — {selectedLog?.module}
            </p>
          </DialogHeader>

          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Old Value</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-4 text-xs">
                  {formatJson(selectedLog?.oldValue ?? null)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Value</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-4 text-xs">
                  {formatJson(selectedLog?.newValue ?? null)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
