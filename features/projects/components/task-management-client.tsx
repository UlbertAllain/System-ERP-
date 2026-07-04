"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Edit,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";

import {
  createTaskCommentAction,
  createTaskAction,
  deleteTaskCommentAction,
  listTaskCommentsAction,
  deleteTaskAction,
  updateTaskCommentAction,
  updateTaskAction,
} from "@/features/projects/actions";
import type { MilestoneListItem } from "@/types/milestone";
import type { ProjectListItem } from "@/types/project";
import type { ProjectMemberListItem } from "@/types/project-member";
import type { TaskListItem, TaskPriority, TaskStatus } from "@/types/task";
import type { TaskCommentListItem } from "@/types/task-comment";
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
import { Textarea } from "@/components/ui/textarea";

type TaskManagementClientProps = {
  tasks: TaskListItem[];
  projects: ProjectListItem[];
  milestones: MilestoneListItem[];
  members: ProjectMemberListItem[];
  commentPermissions: {
    canRead: boolean;
    canCreate: boolean;
    canUpdateOwn: boolean;
    canDeleteOwn: boolean;
    canDeleteAny: boolean;
    currentUserId: string;
  };
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

function getStatusVariant(status: TaskStatus) {
  if (status === "DONE") {
    return "secondary" as const;
  }

  if (status === "BLOCKED" || status === "CANCELLED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function getPriorityVariant(priority: TaskPriority) {
  if (priority === "URGENT" || priority === "HIGH") {
    return "destructive" as const;
  }

  if (priority === "MEDIUM") {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function TaskManagementClient({
  tasks,
  projects,
  milestones,
  members,
  commentPermissions,
}: TaskManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [isCommentPending, startCommentTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<TaskFormState>(initialForm);
  const [selectedCommentTask, setSelectedCommentTask] =
    useState<TaskListItem | null>(null);
  const [comments, setComments] = useState<TaskCommentListItem[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

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

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.projectCode === b.projectCode) {
        return a.order - b.order;
      }

      return a.projectCode.localeCompare(b.projectCode);
    });
  }, [tasks]);

  function resetForm() {
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
        setMessage("Task ID tidak ditemukan.");
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
      `Yakin ingin menghapus task ${task.title}?`,
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
    setComments([]);
    setCommentBody("");
    setEditingCommentId(null);
    setEditingCommentBody("");
    setMessage(null);

    startCommentTransition(async () => {
      const result = await listTaskCommentsAction({
        taskId: task.id,
      });

      if (result.success) {
        setComments(result.data);
        return;
      }

      setMessage(result.message);
    });
  }

  function refreshComments(taskId: string) {
    startCommentTransition(async () => {
      const result = await listTaskCommentsAction({
        taskId,
      });

      if (result.success) {
        setComments(result.data);
        return;
      }

      setMessage(result.message);
    });
  }

  function handleCreateComment() {
    if (!selectedCommentTask) {
      return;
    }

    setMessage(null);

    startCommentTransition(async () => {
      const result = await createTaskCommentAction({
        taskId: selectedCommentTask.id,
        body: commentBody,
      });

      setMessage(result.message);

      if (result.success) {
        setCommentBody("");
        refreshComments(selectedCommentTask.id);
        router.refresh();
      }
    });
  }

  function startEditComment(comment: TaskCommentListItem) {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentBody("");
  }

  function handleUpdateComment(commentId: string) {
    if (!selectedCommentTask) {
      return;
    }

    setMessage(null);

    startCommentTransition(async () => {
      const result = await updateTaskCommentAction({
        id: commentId,
        body: editingCommentBody,
      });

      setMessage(result.message);

      if (result.success) {
        cancelEditComment();
        refreshComments(selectedCommentTask.id);
        router.refresh();
      }
    });
  }

  function handleDeleteComment(comment: TaskCommentListItem) {
    if (!selectedCommentTask) {
      return;
    }

    const confirmed = window.confirm("Yakin ingin menghapus komentar ini?");

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startCommentTransition(async () => {
      const result = await deleteTaskCommentAction({
        id: comment.id,
      });

      setMessage(result.message);

      if (result.success) {
        refreshComments(selectedCommentTask.id);
        router.refresh();
      }
    });
  }

  function canEditComment(comment: TaskCommentListItem) {
    return (
      commentPermissions.canUpdateOwn &&
      comment.userId === commentPermissions.currentUserId
    );
  }

  function canDeleteComment(comment: TaskCommentListItem) {
    return (
      commentPermissions.canDeleteAny ||
      (commentPermissions.canDeleteOwn &&
        comment.userId === commentPermissions.currentUserId)
    );
  }

  const canCreateTask = activeProjects.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Projects
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Tasks</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola task per project, milestone, assignee, priority, status, dan
            due date.
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
              New Task
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Create Task" : "Edit Task"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Task wajib terhubung ke project. Milestone dan assignee boleh
                kosong.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {activeProjects.length === 0 ? (
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Belum ada project aktif. Buat project dulu sebelum membuat
                    task.
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="projectId">Project</Label>
                  <select
                    id="projectId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={form.projectId}
                    onChange={(event) =>
                      handleProjectChange(event.target.value)
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="milestoneId">Milestone</Label>
                    <select
                      id="milestoneId"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.milestoneId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          milestoneId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Tanpa milestone</option>
                      {filteredMilestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.order}. {milestone.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="assigneeEmployeeId">Assignee</Label>
                    <select
                      id="assigneeEmployeeId"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.assigneeEmployeeId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assigneeEmployeeId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {filteredMembers.map((member) => (
                        <option key={member.id} value={member.employeeId}>
                          {member.employeeName} — {member.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">Task Title</Label>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Deskripsi task"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
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
                            status: event.target.value as TaskStatus,
                          }))
                        }
                      >
                        {taskStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
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
                          {priority}
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
                    <Label htmlFor="startDate">Start Date</Label>
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
                    <Label htmlFor="dueDate">Due Date</Label>
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

            <div className="flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
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
                disabled={isPending || !canCreateTask}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Create Task"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={openCommentDialog} onOpenChange={setOpenCommentDialog}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Task Comments
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedCommentTask
                ? `${selectedCommentTask.projectCode} - ${selectedCommentTask.title}`
                : "Diskusi task"}
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {isCommentPending && comments.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Memuat komentar...
              </div>
            ) : null}

            {!isCommentPending && comments.length === 0 ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                Belum ada komentar untuk task ini.
              </div>
            ) : null}

            <div className="space-y-3">
              {comments.map((comment) => {
                const isEditing = editingCommentId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{comment.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {comment.userEmail} - {formatDate(comment.createdAt)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {canEditComment(comment) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isCommentPending}
                            onClick={() => startEditComment(comment)}
                          >
                            <Edit className="size-4" />
                          </Button>
                        ) : null}

                        {canDeleteComment(comment) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isCommentPending}
                            onClick={() => handleDeleteComment(comment)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-3">
                        <Textarea
                          value={editingCommentBody}
                          onChange={(event) =>
                            setEditingCommentBody(event.target.value)
                          }
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isCommentPending}
                            onClick={cancelEditComment}
                          >
                            <X className="size-4" />
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isCommentPending}
                            onClick={() => handleUpdateComment(comment.id)}
                          >
                            <Save className="size-4" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                        {comment.body}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {commentPermissions.canCreate && selectedCommentTask ? (
            <div className="border-t bg-background px-6 py-4">
              <div className="grid gap-3">
                <Textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Tulis update, catatan QA, blocker, atau keputusan task..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={isCommentPending || commentBody.trim().length < 2}
                    onClick={handleCreateComment}
                  >
                    {isCommentPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send Comment
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      {!canCreateTask ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Untuk membuat task, sistem membutuhkan minimal satu project aktif.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5" />
            Tasks
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Order: {task.order}
                        </p>
                        {task.description ? (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium">{task.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.projectCode}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>{task.milestoneTitle ?? "-"}</TableCell>

                    <TableCell>{task.assigneeName ?? "Unassigned"}</TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getPriorityVariant(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatDate(task.dueDate)}</TableCell>

                    <TableCell>
                      <div className="flex gap-2">
                        {commentPermissions.canRead ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openComments(task)}
                            disabled={isPending}
                            title="Open comments"
                          >
                            <MessageSquare className="size-4" />
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(task)}
                          disabled={isPending}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(task)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada task.
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
