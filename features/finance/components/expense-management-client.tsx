"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
} from "lucide-react";

import {
  approveExpenseAction,
  createExpenseAction,
  deleteExpenseAction,
  markExpensePaidAction,
  rejectExpenseAction,
  submitExpenseAction,
  updateExpenseAction,
} from "@/features/finance/actions";
import type {
  ExpenseCategory,
  ExpenseListItem,
  ExpenseStatus,
} from "@/types/expense";
import type { ProjectListItem } from "@/types/project";
import { Button } from "@/components/ui/button";
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
import type { CompanySetting } from "@/types/company-setting";
import { ExpenseManagementList } from "@/features/finance/components/expense-management-list";

type ExpenseManagementClientProps = {
  expenses: ExpenseListItem[];
  projects: ProjectListItem[];
  companySetting: CompanySetting;
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    status: string;
    category: string;
    projectId: string;
  };
};

type ExpenseFormState = {
  id?: string;
  expenseNumber: string;
  title: string;
  description: string;
  category: ExpenseCategory;
  projectId: string;
  vendorName: string;
  amount: string;
  expenseDate: string;
  notes: string;
};

const expenseCategories: ExpenseCategory[] = [
  "OPERATIONAL",
  "SOFTWARE",
  "HARDWARE",
  "MARKETING",
  "TRANSPORT",
  "MEAL",
  "SALARY",
  "TAX",
  "OTHER",
];

const expenseStatuses: ExpenseStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PAID",
];

const initialForm: ExpenseFormState = {
  expenseNumber: "",
  title: "",
  description: "",
  category: "OPERATIONAL",
  projectId: "",
  vendorName: "",
  amount: "0",
  expenseDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parseNumber(value: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function formatDateInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function generateExpenseNumber(prefix: string) {
  const normalizedPrefix = prefix.trim().toUpperCase() || "EXP";
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");

  return `${normalizedPrefix}-${year}${month}-${random}`;
}

export function ExpenseManagementClient({
  expenses,
  projects,
  companySetting,
  pagination,
}: ExpenseManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ExpenseFormState>(initialForm);
  const [search, setSearch] = useState(pagination.search);
  const [status, setStatus] = useState(pagination.status);
  const [category, setCategory] = useState(pagination.category);
  const [projectId, setProjectId] = useState(pagination.projectId);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => project.status !== "ARCHIVED")
      .sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  }, [projects]);

  function updateQuery(next: {
    search?: string;
    status?: string;
    category?: string;
    projectId?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextStatus = next.status ?? status;
    const nextCategory = next.category ?? category;
    const nextProjectId = next.projectId ?? projectId;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    if (nextProjectId) {
      params.set("projectId", nextProjectId);
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
    setCategory("");
    setProjectId("");
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
      expenseNumber: generateExpenseNumber(companySetting.expensePrefix),
    });
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(expense: ExpenseListItem) {
    setMode("edit");
    setMessage(null);
    setForm({
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      title: expense.title,
      description: expense.description ?? "",
      category: expense.category,
      projectId: expense.projectId ?? "",
      vendorName: expense.vendorName ?? "",
      amount: String(expense.amount),
      expenseDate: formatDateInput(expense.expenseDate),
      notes: expense.notes ?? "",
    });
    setOpenDialog(true);
  }

  function handleSubmit() {
    setMessage(null);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createExpenseAction({
          expenseNumber: form.expenseNumber,
          title: form.title,
          description: emptyToNull(form.description),
          category: form.category,
          projectId: emptyToNull(form.projectId),
          vendorName: emptyToNull(form.vendorName),
          amount: parseNumber(form.amount),
          expenseDate: form.expenseDate,
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
        setMessage("ID pengeluaran tidak ditemukan.");
        return;
      }

      const result = await updateExpenseAction({
        id: form.id,
        expenseNumber: form.expenseNumber,
        title: form.title,
        description: emptyToNull(form.description),
        category: form.category,
        projectId: emptyToNull(form.projectId),
        vendorName: emptyToNull(form.vendorName),
        amount: parseNumber(form.amount),
        expenseDate: form.expenseDate,
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

  function handleSubmitExpense(expense: ExpenseListItem) {
    setMessage(null);

    startTransition(async () => {
      const result = await submitExpenseAction({ id: expense.id });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleApprove(expense: ExpenseListItem) {
    setMessage(null);

    startTransition(async () => {
      const result = await approveExpenseAction({ id: expense.id });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleReject(expense: ExpenseListItem) {
    const reason = window.prompt(
      `Alasan penolakan untuk ${expense.expenseNumber}:`,
    );

    if (!reason) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await rejectExpenseAction({
        id: expense.id,
        reason,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handlePaid(expense: ExpenseListItem) {
    setMessage(null);

    startTransition(async () => {
      const result = await markExpensePaidAction({ id: expense.id });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleDelete(expense: ExpenseListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus pengeluaran ${expense.expenseNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteExpenseAction({ id: expense.id });

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
            Keuangan
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Expenses
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Catat pengeluaran internal, project expense, approval, dan status
            pembayaran.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Catat Pengeluaran
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Tambah Pengeluaran" : "Ubah Pengeluaran"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Pengeluaran dapat dihubungkan ke proyek apabila biaya tersebut terkait pekerjaan tertentu.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="expenseNumber">Nomor Pengeluaran</Label>
                    <Input
                      id="expenseNumber"
                      value={form.expenseNumber}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          expenseNumber: event.target.value,
                        }))
                      }
                      placeholder="EXP-202606-0001"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="expenseDate">Tanggal Pengeluaran</Label>
                    <Input
                      id="expenseDate"
                      type="date"
                      value={form.expenseDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          expenseDate: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value as ExpenseCategory,
                        }))
                      }
                    >
                      {expenseCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Biaya server bulanan"
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
                    placeholder="Deskripsi pengeluaran"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                    >
                      <option value="">Tanpa proyek</option>
                      {activeProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.projectCode} — {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="vendorName">Pemasok</Label>
                    <Input
                      id="vendorName"
                      value={form.vendorName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          vendorName: event.target.value,
                        }))
                      }
                      placeholder="Google Cloud / Vercel / pemasok"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="amount">Nominal</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Catatan internal"
                    rows={3}
                  />
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

              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Tambah Pengeluaran"
                ) : (
                  "Simpan Perubahan"
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

      <ExpenseManagementList
        expenses={expenses}
        projects={projects}
        statuses={expenseStatuses}
        categories={expenseCategories}
        search={search}
        status={status}
        category={category}
        projectId={projectId}
        pageSize={pageSize}
        pagination={pagination}
        isPending={isPending}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCategoryChange={setCategory}
        onProjectIdChange={setProjectId}
        onPageSizeChange={(value) => {
          setPageSize(value);
          updateQuery({
            page: 1,
            pageSize: value,
          });
        }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onEdit={openEditDialog}
        onSubmit={handleSubmitExpense}
        onApprove={handleApprove}
        onReject={handleReject}
        onPaid={handlePaid}
        onDelete={handleDelete}
        onPageChange={goToPage}
      />
    </div>
  );
}
