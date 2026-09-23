"use client";

import {
  ChevronLeft,
  ChevronRight,
  FilterX,
  Search,
  ShieldCheck,
  UserX,
} from "lucide-react";

import { ROLES, type RoleSlug } from "@/constants/permissions";
import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { UserListItem } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserManagementListProps = {
  users: UserListItem[];
  pagination: {
    totalItems: number;
    page: number;
    totalPages: number;
  };
  search: string;
  status: string;
  roleSlug: string;
  pageSize: string;
  isPending: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRoleSlugChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onSuspend: (uid: string) => void;
  onActivate: (uid: string) => void;
  onQuickRoleUpdate: (uid: string, roleSlug: RoleSlug) => void;
  onDelete: (uid: string) => void;
  onPageChange: (page: number) => void;
};

export function UserManagementList({
  users,
  pagination,
  search,
  status,
  roleSlug,
  pageSize,
  isPending,
  onSearchChange,
  onStatusChange,
  onRoleSlugChange,
  onPageSizeChange,
  onApply,
  onReset,
  onSuspend,
  onActivate,
  onQuickRoleUpdate,
  onDelete,
  onPageChange,
}: UserManagementListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengguna</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_220px_120px_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onApply();
                }
              }}
              placeholder="Cari nama, email, atau peran"
              className="pl-9"
            />
          </div>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="">Semua status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={roleSlug}
            onChange={(event) => onRoleSlugChange(event.target.value)}
          >
            <option value="">Semua peran</option>
            {ROLES.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
          >
            <option value="10">10 rows</option>
            <option value="20">20 rows</option>
            <option value="50">50 rows</option>
          </select>

          <Button type="button" variant="outline" onClick={onApply}>
            <Search className="size-4" />
            Terapkan
          </Button>

          <Button type="button" variant="ghost" onClick={onReset}>
            <FilterX className="size-4" />
            Atur Ulang
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Hak Akses</TableHead>
                <TableHead className="w-[260px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                      {user.mustChangePassword ? (
                        <p className="mt-1 text-xs text-amber-600">
                          Must change password
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        user.status === "ACTIVE" ? "secondary" : "destructive"
                      }
                    >
                      {getBusinessLabel(user.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roleSlugs.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>{user.permissionsCache.length}</TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {user.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSuspend(user.uid)}
                          disabled={isPending}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onActivate(user.uid)}
                          disabled={isPending}
                        >
                          Activate
                        </Button>
                      )}

                      <select
                        className="h-9 rounded-md border bg-background px-2 text-xs"
                        defaultValue=""
                        onChange={(event) => {
                          const role = event.target.value as RoleSlug;

                          if (role) {
                            onQuickRoleUpdate(user.uid, role);
                            event.target.value = "";
                          }
                        }}
                        disabled={isPending}
                      >
                        <option value="">Pilih peran</option>
                        {ROLES.map((role) => (
                          <option key={role.slug} value={role.slug}>
                            {role.name}
                          </option>
                        ))}
                      </select>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(user.uid)}
                        disabled={isPending}
                      >
                        <UserX className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Belum ada user.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Menampilkan {users.length} dari {pagination.totalItems} pengguna
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
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
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Berikutnya
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          Semua aksi user lewat server action, Firebase Admin SDK, permission
          guard, dan audit log.
        </div>
      </CardContent>
    </Card>
  );
}
