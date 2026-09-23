"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
} from "lucide-react";

import { ROLES, type RoleSlug } from "@/constants/permissions";
import {
  activateUserAction,
  createUserAction,
  deleteUserAction,
  suspendUserAction,
  updateUserRolesAction,
} from "@/modules/users/actions";
import type { UserListItem } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { UserManagementList } from "@/modules/users/components/user-management-list";

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

      <UserManagementList
        users={users}
        pagination={pagination}
        search={search}
        status={status}
        roleSlug={roleSlug}
        pageSize={pageSize}
        isPending={isPending}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onRoleSlugChange={setRoleSlug}
        onPageSizeChange={(value) => {
          setPageSize(value);
          updateQuery({
            page: 1,
            pageSize: value,
          });
        }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onSuspend={handleSuspendUser}
        onActivate={handleActivateUser}
        onQuickRoleUpdate={handleQuickRoleUpdate}
        onDelete={handleDeleteUser}
        onPageChange={goToPage}
      />
    </div>
  );
}
