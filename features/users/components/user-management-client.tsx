"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FilterX,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  UserX,
} from "lucide-react";

import { ROLES, type RoleSlug } from "@/constants/permissions";
import {
  activateUserAction,
  createUserAction,
  deleteUserAction,
  suspendUserAction,
  updateUserRolesAction,
} from "@/features/users/actions";
import type { UserListItem } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserManagementClientProps = {
  users: UserListItem[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    status: string;
    roleSlug: string;
  };
};

type CreateUserFormState = {
  name: string;
  email: string;
  password: string;
  roleSlugs: RoleSlug[];
  mustChangePassword: boolean;
};

const initialCreateForm: CreateUserFormState = {
  name: "",
  email: "",
  password: "",
  roleSlugs: ["employee"],
  mustChangePassword: true,
};

export function UserManagementClient({
  users,
  pagination,
}: UserManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [form, setForm] = useState<CreateUserFormState>(initialCreateForm);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState(pagination.search);
  const [status, setStatus] = useState(pagination.status);
  const [roleSlug, setRoleSlug] = useState(pagination.roleSlug);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));

  function resetMessage() {
    setMessage(null);
  }

  function updateQuery(next: {
    search?: string;
    status?: string;
    roleSlug?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextStatus = next.status ?? status;
    const nextRoleSlug = next.roleSlug ?? roleSlug;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    }

    if (nextRoleSlug) {
      params.set("roleSlug", nextRoleSlug);
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
    setStatus("");
    setRoleSlug("");
    setPageSize("10");
    router.push(`${pathname}?page=1&pageSize=10`);
  }

  function goToPage(page: number) {
    updateQuery({
      page,
    });
  }

  function toggleRole(roleSlug: RoleSlug) {
    setForm((current) => {
      const exists = current.roleSlugs.includes(roleSlug);

      if (exists) {
        const nextRoles = current.roleSlugs.filter((role) => role !== roleSlug);

        return {
          ...current,
          roleSlugs: nextRoles.length > 0 ? nextRoles : current.roleSlugs,
        };
      }

      return {
        ...current,
        roleSlugs: [...current.roleSlugs, roleSlug],
      };
    });
  }

  function handleCreateUser() {
    resetMessage();

    startTransition(async () => {
      const result = await createUserAction({
        name: form.name,
        email: form.email,
        password: form.password,
        roleSlugs: form.roleSlugs,
        mustChangePassword: form.mustChangePassword,
      });

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      setForm(initialCreateForm);
      setOpenCreateDialog(false);
      router.refresh();
    });
  }

  function handleSuspendUser(uid: string) {
    resetMessage();

    startTransition(async () => {
      const result = await suspendUserAction({ uid });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleActivateUser(uid: string) {
    resetMessage();

    startTransition(async () => {
      const result = await activateUserAction({ uid });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleDeleteUser(uid: string) {
    const confirmed = window.confirm(
      "Yakin ingin menonaktifkan pengguna ini?",
    );

    if (!confirmed) {
      return;
    }

    resetMessage();

    startTransition(async () => {
      const result = await deleteUserAction({ uid });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleQuickRoleUpdate(uid: string, roleSlug: RoleSlug) {
    resetMessage();

    startTransition(async () => {
      const result = await updateUserRolesAction({
        uid,
        roleSlugs: [roleSlug],
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Pengaturan Sistem
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Pengguna dan Akses
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola akun internal, status akses, dan peran setiap pengguna.
          </p>
        </div>

        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>Tambah Pengguna Internal</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Buat akun internal baru dan tentukan peran awal pengguna.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nama pengguna"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="user@company.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password awal</Label>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Minimal 10 karakter, huruf besar, kecil, dan angka"
                  />
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label>Peran</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pilih satu atau beberapa role sesuai kebutuhan akses user.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {ROLES.map((role) => {
                      const selected = form.roleSlugs.includes(role.slug);

                      return (
                        <button
                          key={role.slug}
                          type="button"
                          onClick={() => toggleRole(role.slug)}
                          className={
                            selected
                              ? "rounded-xl border border-primary bg-primary/10 px-4 py-3 text-left text-sm ring-1 ring-primary/20 transition"
                              : "rounded-xl border bg-background px-4 py-3 text-left text-sm transition hover:bg-muted"
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{role.name}</span>

                            {selected ? (
                              <Badge variant="secondary">Dipilih</Badge>
                            ) : null}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            {role.slug}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.mustChangePassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        mustChangePassword: event.target.checked,
                      }))
                    }
                  />

                  <span>
                    <span className="font-medium">
                      Wajib ganti password saat login pertama
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Direkomendasikan aktif untuk semua user baru agar password
                      awal tidak dipakai permanen.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCreateDialog(false)}
                disabled={isPending}
              >
                Batal
              </Button>

              <Button onClick={handleCreateUser} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Tambah Pengguna"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

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
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApplyFilters();
                  }
                }}
                placeholder="Cari nama, email, atau peran"
                className="pl-9"
              />
            </div>

            <select
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Semua status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>

            <select
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
              value={roleSlug}
              onChange={(event) => setRoleSlug(event.target.value)}
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

            <Button type="button" variant="outline" onClick={handleApplyFilters}>
              <Search className="size-4" />
              Terapkan
            </Button>

            <Button type="button" variant="ghost" onClick={handleResetFilters}>
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
                            onClick={() => handleSuspendUser(user.uid)}
                            disabled={isPending}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivateUser(user.uid)}
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
                              handleQuickRoleUpdate(user.uid, role);
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
                          onClick={() => handleDeleteUser(user.uid)}
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

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />
            Semua aksi user lewat server action, Firebase Admin SDK, permission
            guard, dan audit log.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
