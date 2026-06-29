"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldCheck, UserX } from "lucide-react";

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

export function UserManagementClient({ users }: UserManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [form, setForm] = useState<CreateUserFormState>(initialCreateForm);
  const [message, setMessage] = useState<string | null>(null);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  function resetMessage() {
    setMessage(null);
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
      "Yakin ingin menghapus user ini? User akan dinonaktifkan dan soft delete.",
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
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Settings
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            User Management
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola akun internal, status akses, dan role dasar user.
          </p>
        </div>

        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              New User
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>Create Internal User</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Buat akun internal baru dan tentukan role awal user.
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
                    placeholder="Nama user"
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
                    placeholder="user@nextylabs.id"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password awal</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label>Role</Label>
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
                              <Badge variant="secondary">Selected</Badge>
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

            <div className="flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCreateDialog(false)}
                disabled={isPending}
              >
                Cancel
              </Button>

              <Button onClick={handleCreateUser} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Create User"
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
          <CardTitle>Users</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-[260px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedUsers.map((user) => (
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
                        {user.status}
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
                          <option value="">Set role</option>
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

                {sortedUsers.length === 0 ? (
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
