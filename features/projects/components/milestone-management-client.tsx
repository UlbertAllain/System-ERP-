"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, Flag, Loader2, Plus, Trash2 } from "lucide-react";

import {
  createMilestoneAction,
  deleteMilestoneAction,
  updateMilestoneAction,
} from "@/features/projects/actions";
import type { MilestoneListItem, MilestoneStatus } from "@/types/milestone";
import type { ProjectListItem } from "@/types/project";
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

type MilestoneManagementClientProps = {
  milestones: MilestoneListItem[];
  projects: ProjectListItem[];
};

type MilestoneFormState = {
  id?: string;
  projectId: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  order: string;
  startDate: string;
  dueDate: string;
};

const milestoneStatuses: MilestoneStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
];

const initialForm: MilestoneFormState = {
  projectId: "",
  title: "",
  description: "",
  status: "PLANNED",
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

function getStatusVariant(status: MilestoneStatus) {
  if (status === "COMPLETED") {
    return "secondary" as const;
  }

  if (status === "CANCELLED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function MilestoneManagementClient({
  milestones,
  projects,
}: MilestoneManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<MilestoneFormState>(initialForm);

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => project.status !== "ARCHIVED")
      .sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  }, [projects]);

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      if (a.projectCode === b.projectCode) {
        return a.order - b.order;
      }

      return a.projectCode.localeCompare(b.projectCode);
    });
  }, [milestones]);

  function resetForm() {
    setForm({
      ...initialForm,
      projectId: activeProjects[0]?.id ?? "",
    });
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(milestone: MilestoneListItem) {
    setMode("edit");
    setMessage(null);
    setForm({
      id: milestone.id,
      projectId: milestone.projectId,
      title: milestone.title,
      description: milestone.description ?? "",
      status: milestone.status,
      order: String(milestone.order),
      startDate: formatDateInput(milestone.startDate),
      dueDate: formatDateInput(milestone.dueDate),
    });
    setOpenDialog(true);
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
        const result = await createMilestoneAction({
          projectId: form.projectId,
          title: form.title,
          description: emptyToNull(form.description),
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
        setMessage("Milestone ID tidak ditemukan.");
        return;
      }

      const result = await updateMilestoneAction({
        id: form.id,
        title: form.title,
        description: emptyToNull(form.description),
        status: form.status,
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

  function handleDelete(milestone: MilestoneListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus milestone ${milestone.title}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteMilestoneAction({
        id: milestone.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  const canCreateMilestone = activeProjects.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Projects
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Milestones
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola milestone per project, urutan pekerjaan, status, dan due
            date.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={openCreateDialog}
              disabled={!canCreateMilestone}
            >
              <Plus className="size-4" />
              New Milestone
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Create Milestone" : "Edit Milestone"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Milestone wajib terhubung ke project aktif.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {activeProjects.length === 0 ? (
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Belum ada project aktif. Buat project dulu sebelum membuat
                    milestone.
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
                  <Label htmlFor="title">Milestone Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Requirement & Planning"
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
                    placeholder="Deskripsi milestone"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                            status: event.target.value as MilestoneStatus,
                          }))
                        }
                      >
                        {milestoneStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

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
                disabled={isPending || !canCreateMilestone}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Create Milestone"
                ) : (
                  "Save Changes"
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

      {!canCreateMilestone ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Untuk membuat milestone, sistem membutuhkan minimal satu project
            aktif.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="size-5" />
            Milestones
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedMilestones.map((milestone) => (
                  <TableRow key={milestone.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{milestone.title}</p>
                        {milestone.description ? (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {milestone.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium">{milestone.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {milestone.projectCode}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>{milestone.order}</TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(milestone.status)}>
                        {milestone.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatDate(milestone.startDate)}</TableCell>

                    <TableCell>{formatDate(milestone.dueDate)}</TableCell>

                    <TableCell>{formatDate(milestone.completedAt)}</TableCell>

                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(milestone)}
                          disabled={isPending}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(milestone)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedMilestones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada milestone.
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
