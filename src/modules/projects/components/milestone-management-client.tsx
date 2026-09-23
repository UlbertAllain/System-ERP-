"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import { MILESTONE_STATUS_TRANSITIONS } from "@/modules/projects/milestones/milestone-domain";

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
  ProjectWorkspaceNav,
  type ProjectWorkspaceAccess,
} from "@/features/projects/components/project-workspace-nav";
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
  workspaceAccess: ProjectWorkspaceAccess;
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
  workspaceAccess,
  projects,
}: MilestoneManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<MilestoneFormState>(initialForm);
  const [originalMilestoneStatus, setOriginalMilestoneStatus] =
    useState<MilestoneStatus>("PLANNED");

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
    setOriginalMilestoneStatus("PLANNED");
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
    setOriginalMilestoneStatus(milestone.status);
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
        setMessage("ID tahapan tidak ditemukan.");
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
      `Yakin ingin menghapus tahapan ${milestone.title}?`,
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
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Operasional Proyek
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Daftar Tahapan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Susun target utama proyek, urutan pelaksanaan, status, dan batas waktunya.
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
              Tambah Tahapan
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Tambah Tahapan" : "Ubah Tahapan"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Tahapan wajib terhubung ke proyek aktif.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {activeProjects.length === 0 ? (
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Belum ada proyek aktif. Buat proyek terlebih dahulu sebelum menambahkan tahapan.
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="projectId">Proyek</Label>
                  <select
                    id="projectId"
                    className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                    value={form.projectId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        projectId: event.target.value,
                      }))
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

                <div className="grid gap-2">
                  <Label htmlFor="title">Nama Tahapan</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Contoh: Analisis kebutuhan"
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
                    placeholder="Deskripsi tahapan"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                            status: event.target.value as MilestoneStatus,
                          }))
                        }
                      >
                        {MILESTONE_STATUS_TRANSITIONS[
                          originalMilestoneStatus
                        ].map((status) => (
                          <option key={status} value={status}>
                            {getBusinessLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label htmlFor="order">Urutan</Label>
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
                disabled={isPending || !canCreateMilestone}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Tambah Tahapan"
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ProjectWorkspaceNav active="milestones" access={workspaceAccess} />

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      {!canCreateMilestone ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Untuk membuat tahapan, sistem membutuhkan minimal satu proyek aktif.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="size-5" />
            Daftar Tahapan
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tahapan</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Tenggat</TableHead>
                  <TableHead>Selesai Pada</TableHead>
                  <TableHead className="w-[160px]">Aksi</TableHead>
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
                        {getBusinessLabel(milestone.status)}
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
                      Belum ada tahapan proyek.
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
