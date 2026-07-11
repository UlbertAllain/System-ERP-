"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  FilterX,
  FolderKanban,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/features/projects/actions";
import type { ClientListItem } from "@/types/client";
import type { EmployeeListItem } from "@/types/employee";
import type {
  ProjectBillingType,
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from "@/types/project";
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

type ProjectManagementClientProps = {
  projects: ProjectListItem[];
  clients: ClientListItem[];
  employees: EmployeeListItem[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    status: string;
    priority: string;
  };
};

type ProjectFormState = {
  id?: string;
  projectCode: string;
  name: string;
  description: string;
  clientId: string;
  picEmployeeId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  billingType: ProjectBillingType;
  budget: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const projectStatuses: ProjectStatus[] = [
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

const projectPriorities: ProjectPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const projectBillingTypes: ProjectBillingType[] = [
  "FIXED_PRICE",
  "HOURLY",
  "RETAINER",
  "INTERNAL",
];

const initialForm: ProjectFormState = {
  projectCode: "",
  name: "",
  description: "",
  clientId: "",
  picEmployeeId: "",
  status: "PLANNING",
  priority: "MEDIUM",
  billingType: "FIXED_PRICE",
  budget: "0",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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

function getStatusVariant(status: ProjectStatus) {
  if (status === "IN_PROGRESS" || status === "COMPLETED") {
    return "secondary" as const;
  }

  if (status === "CANCELLED" || status === "ARCHIVED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function getPriorityVariant(priority: ProjectPriority) {
  if (priority === "URGENT" || priority === "HIGH") {
    return "destructive" as const;
  }

  if (priority === "MEDIUM") {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function ProjectManagementClient({
  projects,
  clients,
  employees,
  pagination,
}: ProjectManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ProjectFormState>(initialForm);
  const [search, setSearch] = useState(pagination.search);
  const [status, setStatus] = useState(pagination.status);
  const [priority, setPriority] = useState(pagination.priority);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));

  const activeClients = useMemo(() => {
    return clients
      .filter((client) => client.status !== "ARCHIVED")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const activeEmployees = useMemo(() => {
    return employees
      .filter((employee) => employee.status === "ACTIVE")
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees]);

  const sortedProjects = useMemo(() => {
    return projects;
  }, [projects]);

  function updateQuery(next: {
    search?: string;
    status?: string;
    priority?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextStatus = next.status ?? status;
    const nextPriority = next.priority ?? priority;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
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
    setStatus("");
    setPriority("");
    setPageSize("10");
    router.push(`${pathname}?page=1&pageSize=10`);
  }

  function goToPage(page: number) {
    updateQuery({
      page,
    });
  }

  function resetForm() {
    setForm({
      ...initialForm,
      clientId: activeClients[0]?.id ?? "",
      picEmployeeId: activeEmployees[0]?.id ?? "",
    });
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(project: ProjectListItem) {
    setMode("edit");
    setMessage(null);
    setForm({
      id: project.id,
      projectCode: project.projectCode,
      name: project.name,
      description: project.description ?? "",
      clientId: project.clientId,
      picEmployeeId: project.picEmployeeId ?? activeEmployees[0]?.id ?? "",
      status: project.status,
      priority: project.priority,
      billingType: project.billingType,
      budget: String(project.budget),
      startDate: formatDateInput(project.startDate),
      endDate: formatDateInput(project.endDate),
      notes: project.notes ?? "",
    });
    setOpenDialog(true);
  }

  function handleSubmit() {
    setMessage(null);

    startTransition(async () => {
      const parsedBudget = Number(form.budget);

      if (Number.isNaN(parsedBudget)) {
        setMessage("Budget harus berupa angka.");
        return;
      }

      if (mode === "create") {
        const result = await createProjectAction({
          projectCode: form.projectCode,
          name: form.name,
          description: emptyToNull(form.description),
          clientId: form.clientId,
          picEmployeeId: form.picEmployeeId,
          priority: form.priority,
          billingType: form.billingType,
          budget: parsedBudget,
          startDate: form.startDate,
          endDate: emptyToNull(form.endDate),
          notes: emptyToNull(form.notes),
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
        setMessage("Project ID tidak ditemukan.");
        return;
      }

      const result = await updateProjectAction({
        id: form.id,
        projectCode: form.projectCode,
        name: form.name,
        description: emptyToNull(form.description),
        clientId: form.clientId,
        picEmployeeId: form.picEmployeeId,
        status: form.status,
        priority: form.priority,
        billingType: form.billingType,
        budget: parsedBudget,
        startDate: form.startDate,
        endDate: emptyToNull(form.endDate),
        notes: emptyToNull(form.notes),
      });

      setMessage(result.message);

      if (result.success) {
        setOpenDialog(false);
        resetForm();
        router.refresh();
      }
    });
  }

  function handleDelete(project: ProjectListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus project ${project.name}? Data akan di-archive.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteProjectAction({
        id: project.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  const canCreateProject =
    activeClients.length > 0 && activeEmployees.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Projects
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Project Management
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola project, client, PIC, status, priority, billing type, budget,
            dan timeline.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={openCreateDialog}
              disabled={!canCreateProject}
            >
              <Plus className="size-4" />
              New Project
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Create Project" : "Edit Project"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Project wajib terhubung ke client aktif dan punya satu PIC
                utama.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {activeClients.length === 0 ? (
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Belum ada client aktif. Buat client dulu sebelum membuat
                    project.
                  </div>
                ) : null}

                {activeEmployees.length === 0 ? (
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Belum ada employee aktif. Buat employee dulu sebelum memilih
                    PIC project.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="projectCode">Project Code</Label>
                    <Input
                      id="projectCode"
                      value={form.projectCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          projectCode: event.target.value,
                        }))
                      }
                      placeholder="NX-PROJ-0001"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Website Company Profile"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="clientId">Client</Label>
                    <select
                      id="clientId"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.clientId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          clientId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Pilih client</option>
                      {activeClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                          {client.company ? ` — ${client.company}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="picEmployeeId">PIC Project</Label>
                    <select
                      id="picEmployeeId"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.picEmployeeId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          picEmployeeId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Pilih PIC</option>
                      {activeEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName} — {employee.position}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    placeholder="Deskripsi project"
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
                            status: event.target.value as ProjectStatus,
                          }))
                        }
                      >
                        {projectStatuses.map((status) => (
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
                          priority: event.target.value as ProjectPriority,
                        }))
                      }
                    >
                      {projectPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="billingType">Billing Type</Label>
                    <select
                      id="billingType"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.billingType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          billingType: event.target.value as ProjectBillingType,
                        }))
                      }
                    >
                      {projectBillingTypes.map((billingType) => (
                        <option key={billingType} value={billingType}>
                          {billingType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      min={0}
                      value={form.budget}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          budget: event.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Catatan tambahan"
                    rows={3}
                  />
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
                disabled={isPending || !canCreateProject}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Create Project"
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

      <Card>
        <CardContent className="grid gap-3 p-4 xl:grid-cols-[1fr_180px_180px_140px_auto_auto]">
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
              placeholder="Search code, project, client, PIC"
              className="pl-9"
            />
          </div>

          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All status</option>
            {projectStatuses.map((projectStatus) => (
              <option key={projectStatus} value={projectStatus}>
                {projectStatus}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="">All priority</option>
            {projectPriorities.map((projectPriority) => (
              <option key={projectPriority} value={projectPriority}>
                {projectPriority}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value)}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={String(size)}>
                {size} / page
              </option>
            ))}
          </select>

          <Button type="button" onClick={handleApplyFilters}>
            Apply
          </Button>

          <Button type="button" variant="outline" onClick={handleResetFilters}>
            <FilterX className="size-4" />
            Reset
          </Button>
        </CardContent>
      </Card>

      {!canCreateProject ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Untuk membuat project, sistem membutuhkan minimal satu client aktif
            dan satu employee aktif sebagai PIC.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="size-5" />
              Projects
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {pagination.totalItems} records - page {pagination.page} of{" "}
              {pagination.totalPages}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>PIC</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.projectCode}
                        </p>
                        {project.description ? (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {project.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {project.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.clientCompany ?? "-"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {project.picName ?? "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.picEmployeeId ?? "-"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>{formatCurrency(project.budget)}</TableCell>

                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(project.startDate)}</p>
                        <p className="text-muted-foreground">
                          to {formatDate(project.endDate)}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getPriorityVariant(project.priority)}>
                        {project.priority}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">{project.billingType}</Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(project)}
                          disabled={isPending}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(project)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada project.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {sortedProjects.length} of {pagination.totalItems} projects
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
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
