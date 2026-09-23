"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import { TASK_STATUS_TRANSITIONS } from "@/modules/projects/tasks/task-domain";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
} from "lucide-react";

import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/modules/projects/actions";
import type { MilestoneListItem } from "@/types/milestone";
import type { ProjectListItem } from "@/types/project";
import type { ProjectMemberListItem } from "@/types/project-member";
import type { TaskListItem, TaskPriority, TaskStatus } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ProjectWorkspaceNav,
  type ProjectWorkspaceAccess,
} from "@/modules/projects/components/project-workspace-nav";
import {
  TaskCommentsDialog,
  type TaskCommentPermissions,
} from "@/modules/projects/components/task-comments-dialog";
import { TaskManagementTable } from "@/modules/projects/components/task-management-table";
import { TaskManagementFilters } from "@/modules/projects/components/task-management-filters";

type TaskManagementClientProps = {
  tasks: TaskListItem[];
  workspaceAccess: ProjectWorkspaceAccess;
  projects: ProjectListItem[];
  milestones: MilestoneListItem[];
  members: ProjectMemberListItem[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    projectId: string;
    status: string;
    priority: string;
  };
  commentPermissions: TaskCommentPermissions;
};

type TaskFormState = {
  id?: string;
  projectId: string;
  milestoneId: string;
  assigneeEmployeeId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: string;
  startDate: string;
  dueDate: string;
};

const taskStatuses: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
  "CANCELLED",
];

const taskPriorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const initialForm: TaskFormState = {
  projectId: "",
  milestoneId: "",
  assigneeEmployeeId: "",
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  order: "0",
  startDate: "",
  dueDate: "",
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function formatDateInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

export function TaskManagementClient({
  tasks,
  workspaceAccess,
  projects,
  milestones,
  members,
  pagination,
  commentPermissions,
}: TaskManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<TaskFormState>(initialForm);
  const [originalTaskStatus, setOriginalTaskStatus] =
    useState<TaskStatus>("TODO");
  const [selectedCommentTask, setSelectedCommentTask] =
    useState<TaskListItem | null>(null);
  const [search, setSearch] = useState(pagination.search);
  const [filterProjectId, setFilterProjectId] = useState(pagination.projectId);
  const [filterStatus, setFilterStatus] = useState(pagination.status);
  const [filterPriority, setFilterPriority] = useState(pagination.priority);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => project.status !== "ARCHIVED")
      .sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  }, [projects]);

  const activeMilestones = useMemo(() => {
    return milestones
      .filter((milestone) => milestone.status !== "CANCELLED")
      .sort((a, b) => {
        if (a.projectCode === b.projectCode) {
          return a.order - b.order;
        }

        return a.projectCode.localeCompare(b.projectCode);
      });
  }, [milestones]);

  const activeMembers = useMemo(() => {
    return members
      .filter((member) => member.status === "ACTIVE")
      .sort((a, b) => {
        if (a.projectCode === b.projectCode) {
          return a.employeeName.localeCompare(b.employeeName);
        }

        return a.projectCode.localeCompare(b.projectCode);
      });
  }, [members]);

  const filteredMilestones = useMemo(() => {
    if (!form.projectId) {
      return [];
    }

    return activeMilestones.filter(
      (milestone) => milestone.projectId === form.projectId,
    );
  }, [activeMilestones, form.projectId]);

  const filteredMembers = useMemo(() => {
    if (!form.projectId) {
      return [];
    }

    return activeMembers.filter(
      (member) => member.projectId === form.projectId,
    );
  }, [activeMembers, form.projectId]);

  function updateQuery(next: {
    search?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextProjectId = next.projectId ?? filterProjectId;
    const nextStatus = next.status ?? filterStatus;
    const nextPriority = next.priority ?? filterPriority;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextProjectId) {
      params.set("projectId", nextProjectId);
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    }

    if (nextPriority) {
      params.set("priority", nextPriority);
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
    setFilterProjectId("");
    setFilterStatus("");
    setFilterPriority("");
    setPageSize("10");
    router.push(`${pathname}?page=1&pageSize=10`);
  }

  function goToPage(page: number) {
    updateQuery({
      page,
    });
  }

  function resetForm() {
    setOriginalTaskStatus("TODO");
    const defaultProjectId = activeProjects[0]?.id ?? "";

    setForm({
      ...initialForm,
      projectId: defaultProjectId,
    });
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(task: TaskListItem) {
    setMode("edit");
    setOriginalTaskStatus(task.status);
    setMessage(null);
    setForm({
      id: task.id,
      projectId: task.projectId,
      milestoneId: task.milestoneId ?? "",
      assigneeEmployeeId: task.assigneeEmployeeId ?? "",
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      order: String(task.order),
      startDate: formatDateInput(task.startDate),
      dueDate: formatDateInput(task.dueDate),
    });
    setOpenDialog(true);
  }

  function handleProjectChange(projectId: string) {
    setForm((current) => ({
      ...current,
      projectId,
      milestoneId: "",
      assigneeEmployeeId: "",
    }));
  }

  function handleSubmit() {
    setMessage(null);

    startTransition(async () => {
      const parsedOrder = Number(form.order);

      if (!Number.isInteger(parsedOrder)) {
        setMessage("Order harus berupa angka bulat.");
        return;
      }

      if (mode === "create") {
        const result = await createTaskAction({
          projectId: form.projectId,
          milestoneId: emptyToNull(form.milestoneId),
          assigneeEmployeeId: emptyToNull(form.assigneeEmployeeId),
          title: form.title,
          description: emptyToNull(form.description),
          priority: form.priority,
          order: parsedOrder,
          startDate: emptyToNull(form.startDate),
          dueDate: emptyToNull(form.dueDate),
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
        setMessage("ID tugas tidak ditemukan.");
        return;
      }

      const result = await updateTaskAction({
        id: form.id,
        milestoneId: emptyToNull(form.milestoneId),
        assigneeEmployeeId: emptyToNull(form.assigneeEmployeeId),
        title: form.title,
        description: emptyToNull(form.description),
        status: form.status,
        priority: form.priority,
        order: parsedOrder,
        startDate: emptyToNull(form.startDate),
        dueDate: emptyToNull(form.dueDate),
      });

      setMessage(result.message);

      if (result.success) {
        setOpenDialog(false);
        resetForm();
        router.refresh();
      }
    });
  }

  function handleDelete(task: TaskListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus tugas ${task.title}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteTaskAction({
        id: task.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function openComments(task: TaskListItem) {
    setSelectedCommentTask(task);
    setOpenCommentDialog(true);
    setMessage(null);
  }

  const canCreateTask = activeProjects.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Operasional Proyek
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Tugas</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola pekerjaan harian berdasarkan proyek, tahapan, penanggung jawab, prioritas, status, dan tenggat.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={openCreateDialog}
              disabled={!canCreateTask}
            >
              <Plus className="size-4" />
              Buat Tugas
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Tambah Tugas" : "Ubah Tugas"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Tugas wajib terhubung ke proyek. Tahapan dan penanggung jawab boleh dikosongkan.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {activeProjects.length === 0 ? (
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Belum ada proyek aktif. Buat proyek terlebih dahulu sebelum menambahkan tugas.
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="projectId">Proyek</Label>
                  <select
                    id="projectId"
                    className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                    value={form.projectId}
                    onChange={(event) =>
                      handleProjectChange(event.target.value)
                    }
                    disabled={mode === "edit"}
                  >
                    <option value="">Pilih proyek</option>
                    {activeProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectCode} — {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="milestoneId">Tahapan</Label>
                    <select
                      id="milestoneId"
                      className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                      value={form.milestoneId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          milestoneId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Tanpa tahapan</option>
                      {filteredMilestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.order}. {milestone.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="assigneeEmployeeId">Penanggung Jawab</Label>
                    <select
                      id="assigneeEmployeeId"
                      className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                      value={form.assigneeEmployeeId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assigneeEmployeeId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Belum ditugaskan</option>
                      {filteredMembers.map((member) => (
                        <option key={member.id} value={member.employeeId}>
                          {member.employeeName} — {getBusinessLabel(member.role)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">Judul Tugas</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Setup authentication flow"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Deskripsi tugas"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  {mode === "edit" ? (
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status: event.target.value as TaskStatus,
                          }))
                        }
                      >
                        {TASK_STATUS_TRANSITIONS[originalTaskStatus].map(
                          (status) => (
                            <option key={status} value={status}>
                              {getBusinessLabel(status)}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label htmlFor="priority">Prioritas</Label>
                    <select
                      id="priority"
                      className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priority: event.target.value as TaskPriority,
                        }))
                      }
                    >
                      {taskPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {getBusinessLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      min={0}
                      value={form.order}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          order: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Tanggal Mulai</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">Target Selesai</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          dueDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={isPending}
              >
                Batal
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isPending || !canCreateTask}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Tambah Tugas"
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ProjectWorkspaceNav active="tasks" access={workspaceAccess} />

      <TaskCommentsDialog
        open={openCommentDialog}
        onOpenChange={setOpenCommentDialog}
        task={selectedCommentTask}
        permissions={commentPermissions}
        onMessage={setMessage}
      />

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <TaskManagementFilters
        projects={activeProjects}
        statuses={taskStatuses}
        priorities={taskPriorities}
        search={search}
        projectId={filterProjectId}
        status={filterStatus}
        priority={filterPriority}
        pageSize={pageSize}
        onSearchChange={setSearch}
        onProjectIdChange={setFilterProjectId}
        onStatusChange={setFilterStatus}
        onPriorityChange={setFilterPriority}
        onPageSizeChange={setPageSize}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {!canCreateTask ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Untuk membuat tugas, sistem membutuhkan minimal satu proyek aktif.
          </CardContent>
        </Card>
      ) : null}

      <TaskManagementTable
        tasks={tasks}
        pagination={pagination}
        canReadComments={commentPermissions.canRead}
        isPending={isPending}
        onOpenComments={openComments}
        onEdit={openEditDialog}
        onDelete={handleDelete}
        onPageChange={goToPage}
      />
    </div>
  );
}
