"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, Loader2, Plus, Trash2, UsersRound } from "lucide-react";

import {
  addProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberAction,
} from "@/features/projects/actions";
import type { EmployeeListItem } from "@/types/employee";
import type { ProjectListItem } from "@/types/project";
import type {
  ProjectMemberListItem,
  ProjectMemberRole,
  ProjectMemberStatus,
} from "@/types/project-member";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProjectMemberManagementClientProps = {
  members: ProjectMemberListItem[];
  projects: ProjectListItem[];
  employees: EmployeeListItem[];
};

type MemberFormState = {
  id?: string;
  projectId: string;
  employeeId: string;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
};

const memberRoles: ProjectMemberRole[] = [
  "PROJECT_MANAGER",
  "TECH_LEAD",
  "DEVELOPER",
  "DESIGNER",
  "QA",
  "BUSINESS_ANALYST",
  "FINANCE",
  "OBSERVER",
];

const memberStatuses: ProjectMemberStatus[] = ["ACTIVE", "INACTIVE", "REMOVED"];

const initialForm: MemberFormState = {
  projectId: "",
  employeeId: "",
  role: "DEVELOPER",
  status: "ACTIVE",
};

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function getStatusVariant(status: ProjectMemberStatus) {
  if (status === "ACTIVE") {
    return "secondary" as const;
  }

  if (status === "REMOVED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function ProjectMemberManagementClient({
  members,
  projects,
  employees,
}: ProjectMemberManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<MemberFormState>(initialForm);

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => project.status !== "ARCHIVED")
      .sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  }, [projects]);

  const activeEmployees = useMemo(() => {
    return employees
      .filter((employee) => employee.status === "ACTIVE")
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.projectCode === b.projectCode) {
        return a.employeeName.localeCompare(b.employeeName);
      }

      return a.projectCode.localeCompare(b.projectCode);
    });
  }, [members]);

  function resetForm() {
    setForm({
      ...initialForm,
      projectId: activeProjects[0]?.id ?? "",
      employeeId: activeEmployees[0]?.id ?? "",
    });
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(member: ProjectMemberListItem) {
    setMode("edit");
    setMessage(null);
    setForm({
      id: member.id,
      projectId: member.projectId,
      employeeId: member.employeeId,
      role: member.role,
      status: member.status,
    });
    setOpenDialog(true);
  }

  function handleSubmit() {
    setMessage(null);

    startTransition(async () => {
      if (mode === "create") {
        const result = await addProjectMemberAction({
          projectId: form.projectId,
          employeeId: form.employeeId,
          role: form.role,
        });

        setMessage(result.message);

        if (result.success) {
          setOpenDialog(false);
          resetForm();
          router.refresh();
        }

        return;
      }

      if (!form.id) {
        setMessage("Project member ID tidak ditemukan.");
        return;
      }

      const result = await updateProjectMemberAction({
        id: form.id,
        role: form.role,
        status: form.status,
      });

      setMessage(result.message);

      if (result.success) {
        setOpenDialog(false);
        resetForm();
        router.refresh();
      }
    });
  }

  function handleRemove(member: ProjectMemberListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus ${member.employeeName} dari project ${member.projectName}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await removeProjectMemberAction({
        id: member.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  const canAddMember = activeProjects.length > 0 && activeEmployees.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Projects
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Project Members
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola anggota project, role dalam project, dan status membership.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={openCreateDialog}
              disabled={!canAddMember}
            >
              <Plus className="size-4" />
              Add Member
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {mode === "create"
                  ? "Add Project Member"
                  : "Edit Project Member"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Satu employee hanya boleh menjadi active member satu kali dalam
                project yang sama.
              </p>
            </DialogHeader>

            <div className="grid gap-5 py-2">
              {activeProjects.length === 0 ? (
                <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Belum ada project aktif.
                </div>
              ) : null}

              {activeEmployees.length === 0 ? (
                <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Belum ada employee aktif.
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="projectId">Project</Label>
                <select
                  id="projectId"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.projectId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      projectId: event.target.value,
                    }))
                  }
                  disabled={mode === "edit"}
                >
                  <option value="">Pilih project</option>
                  {activeProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectCode} — {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="employeeId">Employee</Label>
                <select
                  id="employeeId"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.employeeId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                  disabled={mode === "edit"}
                >
                  <option value="">Pilih employee</option>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} — {employee.position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="role">Project Role</Label>
                  <select
                    id="role"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value as ProjectMemberRole,
                      }))
                    }
                  >
                    {memberRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {mode === "edit" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as ProjectMemberStatus,
                        }))
                      }
                    >
                      {memberStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={isPending || !canAddMember}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : mode === "create" ? (
                    "Add Member"
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      {!canAddMember ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Untuk menambahkan member, sistem membutuhkan minimal satu project
            aktif dan satu employee aktif.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="size-5" />
            Members
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Left</TableHead>
                  <TableHead className="w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.projectCode}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium">{member.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.employeeId}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">{member.role}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(member.status)}>
                        {member.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatDate(member.joinedAt)}</TableCell>

                    <TableCell>{formatDate(member.leftAt)}</TableCell>

                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(member)}
                          disabled={isPending}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemove(member)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada project member.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
