"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  History,
  Search,
} from "lucide-react";

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
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    module: string;
    action: string;
    userId: string;
  };
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
  pagination,
}: AuditLogManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(pagination.search);
  const [moduleFilter, setModuleFilter] = useState(pagination.module);
  const [actionFilter, setActionFilter] = useState(pagination.action);
  const [userIdFilter, setUserIdFilter] = useState(pagination.userId);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));
  const [selectedLog, setSelectedLog] = useState<AuditLogListItem | null>(null);

  function updateQuery(next: {
    search?: string;
    module?: string;
    action?: string;
    userId?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextModule = next.module ?? moduleFilter;
    const nextAction = next.action ?? actionFilter;
    const nextUserId = next.userId ?? userIdFilter;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextModule.trim()) {
      params.set("module", nextModule.trim());
    }

    if (nextAction.trim()) {
      params.set("action", nextAction.trim());
    }

    if (nextUserId.trim()) {
      params.set("userId", nextUserId.trim());
    }

    params.set("page", String(nextPage));
    params.set("pageSize", nextPageSize);

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleApplyFilters() {
    updateQuery({
      page: 1,
    });
  }

  function handleResetFilters() {
    setSearch("");
    setModuleFilter("");
    setActionFilter("");
    setUserIdFilter("");
    setPageSize("10");
    router.push(`${pathname}?page=1&pageSize=10`);
  }

  function goToPage(page: number) {
    updateQuery({
      page,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Pengaturan Sistem
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
          <CardTitle>Filter Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_160px_180px_180px_120px_auto_auto]">
          <div className="grid gap-2">
            <Label htmlFor="search">Cari</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApplyFilters();
                  }
                }}
                placeholder="Pengguna, aksi, modul, atau entitas"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="moduleFilter">Modul</Label>
            <Input
              id="moduleFilter"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              placeholder="invoice"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="actionFilter">Aktivitas</Label>
            <Input
              id="actionFilter"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              placeholder="INVOICE_CREATED"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="userIdFilter">ID Pengguna</Label>
            <Input
              id="userIdFilter"
              value={userIdFilter}
              onChange={(event) => setUserIdFilter(event.target.value)}
              placeholder="uid"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pageSize">Rows</Label>
            <select
              id="pageSize"
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
              value={pageSize}
              onChange={(event) => {
                setPageSize(event.target.value);
                updateQuery({
                  page: 1,
                  pageSize: event.target.value,
                });
              }}
            >
              <option value="10">10 rows</option>
              <option value="20">20 rows</option>
              <option value="50">50 rows</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={handleApplyFilters}>
              <Search className="size-4" />
              Terapkan
            </Button>
          </div>

          <div className="flex items-end">
            <Button type="button" variant="ghost" onClick={handleResetFilters}>
              <FilterX className="size-4" />
              Atur Ulang
            </Button>
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
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="w-[120px]">Detail</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {auditLogs.map((log) => (
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

                {auditLogs.length === 0 ? (
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

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              Menampilkan {auditLogs.length} dari {pagination.totalItems} catatan
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>

              <span>
                Halaman {pagination.page} / {pagination.totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Berikutnya
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={() => setSelectedLog(null)}
      >
        <DialogContent className="flex max-h-[90dvh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Detail Audit Aktivitas</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedLog?.action} — {selectedLog?.module}
            </p>
          </DialogHeader>

          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Sebelumnya</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-4 text-xs">
                  {formatJson(selectedLog?.oldValue ?? null)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Sesudahnya</CardTitle>
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
