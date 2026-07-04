"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldCheck } from "lucide-react";

import type { PermissionSlug, RoleSlug } from "@/constants/permissions";
import { updateRolePermissionsAction } from "@/features/roles/actions";
import type {
  PermissionListItem,
  RoleListItem,
  RolePermissionEditorData,
} from "@/types/role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RolePermissionEditorClientProps = {
  data: RolePermissionEditorData;
};

type PermissionGroup = {
  module: string;
  permissions: PermissionListItem[];
};

export function RolePermissionEditorClient({
  data,
}: RolePermissionEditorClientProps) {
  const router = useRouter();

  const [selectedRoleSlug, setSelectedRoleSlug] = useState<RoleSlug>(
    data.roles[0]?.slug ?? "admin",
  );
  const [selectedPermissions, setSelectedPermissions] = useState<
    PermissionSlug[]
  >(data.roles[0]?.permissionSlugs ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRole = useMemo(() => {
    return data.roles.find((role) => role.slug === selectedRoleSlug) ?? null;
  }, [data.roles, selectedRoleSlug]);

  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    const groups = new Map<string, PermissionListItem[]>();

    data.permissions.forEach((permission) => {
      const current = groups.get(permission.module) ?? [];

      current.push(permission);
      groups.set(permission.module, current);
    });

    return Array.from(groups.entries())
      .map(([module, permissions]) => ({
        module,
        permissions: permissions.sort((a, b) => a.slug.localeCompare(b.slug)),
      }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [data.permissions]);

  function handleSelectRole(role: RoleListItem) {
    setSelectedRoleSlug(role.slug);
    setSelectedPermissions(role.permissionSlugs);
    setMessage(null);
  }

  function togglePermission(permissionSlug: PermissionSlug) {
    if (selectedRoleSlug === "super_admin") {
      return;
    }

    setSelectedPermissions((current) => {
      const exists = current.includes(permissionSlug);

      if (exists) {
        return current.filter((permission) => permission !== permissionSlug);
      }

      return [...current, permissionSlug].sort();
    });
  }

  function selectAllModulePermissions(permissions: PermissionListItem[]) {
    if (selectedRoleSlug === "super_admin") {
      return;
    }

    setSelectedPermissions((current) => {
      const permissionSet = new Set(current);

      permissions.forEach((permission) => {
        permissionSet.add(permission.slug);
      });

      return Array.from(permissionSet).sort();
    });
  }

  function clearModulePermissions(permissions: PermissionListItem[]) {
    if (selectedRoleSlug === "super_admin") {
      return;
    }

    const removableSlugs = new Set(
      permissions.map((permission) => permission.slug),
    );

    setSelectedPermissions((current) =>
      current.filter((permission) => !removableSlugs.has(permission)),
    );
  }

  function handleSave() {
    setMessage(null);

    startTransition(async () => {
      const result = await updateRolePermissionsAction({
        roleSlug: selectedRoleSlug,
        permissionSlugs: selectedPermissions,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  const isSuperAdminLocked = selectedRoleSlug === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Settings
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Role Permissions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kelola permission setiap role dan rebuild permission cache user
          terkait.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {data.roles.map((role) => {
              const selected = role.slug === selectedRoleSlug;

              return (
                <button
                  key={role.slug}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={
                    selected
                      ? "w-full rounded-xl border border-primary bg-primary/10 px-4 py-3 text-left ring-1 ring-primary/20"
                      : "w-full rounded-xl border bg-background px-4 py-3 text-left hover:bg-muted"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{role.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {role.slug}
                      </p>
                    </div>

                    <Badge variant="secondary">
                      {role.permissionSlugs.length}
                    </Badge>
                  </div>

                  {role.slug === "super_admin" ? (
                    <p className="mt-2 text-xs text-amber-600">
                      Locked full access
                    </p>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>
                {selectedRole?.name ?? "Role"} Permission Matrix
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Selected {selectedPermissions.length} dari{" "}
                {data.permissions.length} permissions.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isPending || isSuperAdminLocked}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {isSuperAdminLocked ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Role super_admin dikunci dan selalu memiliki semua permission.
              </div>
            ) : null}

            {permissionGroups.map((group) => {
              const selectedCount = group.permissions.filter((permission) =>
                selectedPermissions.includes(permission.slug),
              ).length;

              return (
                <section
                  key={group.module}
                  className="rounded-lg border bg-background"
                >
                  <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">
                        {group.module.replaceAll("_", " ")}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedCount} / {group.permissions.length} selected
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          selectAllModulePermissions(group.permissions)
                        }
                        disabled={isSuperAdminLocked}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          clearModulePermissions(group.permissions)
                        }
                        disabled={isSuperAdminLocked}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 p-4 md:grid-cols-2">
                    {group.permissions.map((permission) => {
                      const checked = selectedPermissions.includes(
                        permission.slug,
                      );

                      return (
                        <label
                          key={permission.slug}
                          className={
                            checked
                              ? "flex cursor-pointer items-start gap-3 rounded-xl border border-primary bg-primary/10 px-4 py-3 text-sm"
                              : "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm hover:bg-muted"
                          }
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            disabled={isSuperAdminLocked}
                            onChange={() => togglePermission(permission.slug)}
                          />

                          <span>
                            <span className="font-medium">
                              {permission.slug}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {permission.name}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" />
              Save akan update role, rebuild users.permissionsCache, dan menulis
              audit log.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
