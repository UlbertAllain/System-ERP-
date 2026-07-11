"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  FilterX,
  Loader2,
  Plus,
  Receipt,
  Search,
  Send,
  Trash2,
  Wallet,
  XCircle,
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
import type { CompanySetting } from "@/types/company-setting";

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

function getStatusVariant(status: ExpenseListItem["status"]) {
  if (status === "PAID" || status === "APPROVED") {
    return "secondary" as const;
  }

  if (status === "REJECTED") {
    return "destructive" as const;
  }

  return "outline" as const;
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

  const sortedExpenses = useMemo(() => {
    return expenses;
  }, [expenses]);

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
        setMessage("Expense ID tidak ditemukan.");
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
      `Alasan reject untuk ${expense.expenseNumber}:`,
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
      `Yakin ingin menghapus expense ${expense.expenseNumber}?`,
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
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Finance
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
              New Expense
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Create Expense" : "Edit Expense"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Expense bisa optional dihubungkan ke project.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="expenseNumber">Expense Number</Label>
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
                    <Label htmlFor="expenseDate">Expense Date</Label>
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
                      className="h-10 rounded-md border bg-background px-3 text-sm"
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
                    placeholder="Deskripsi expense"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                    >
                      <option value="">Tanpa project</option>
                      {activeProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.projectCode} — {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="vendorName">Vendor</Label>
                    <Input
                      id="vendorName"
                      value={form.vendorName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          vendorName: event.target.value,
                        }))
                      }
                      placeholder="Google Cloud / Vercel / Vendor"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
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
                    placeholder="Catatan internal"
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

              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Create Expense"
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            Expenses
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_170px_220px_120px_auto_auto]">
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
                placeholder="Search expense, vendor, project"
                className="pl-9"
              />
            </div>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All status</option>
              {expenseStatuses.map((expenseStatus) => (
                <option key={expenseStatus} value={expenseStatus}>
                  {expenseStatus}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {expenseCategories.map((expenseCategory) => (
                <option key={expenseCategory} value={expenseCategory}>
                  {expenseCategory}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} - {project.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={pageSize}
              onChange={(event) => {
                setPageSize(event.target.value);
                updateQuery({
                  page: 1,
                  pageSize: event.target.value,
                });
              }}
            >
              <option value="10">10 rows</option>
              <option value="20">20 rows</option>
              <option value="50">50 rows</option>
            </select>

            <Button type="button" variant="outline" onClick={handleApplyFilters}>
              <Search className="size-4" />
              Apply
            </Button>

            <Button type="button" variant="ghost" onClick={handleResetFilters}>
              <FilterX className="size-4" />
              Reset
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="w-[360px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.expenseNumber}
                        </p>
                        {expense.rejectedReason ? (
                          <p className="mt-1 text-xs text-destructive">
                            Reject: {expense.rejectedReason}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      {expense.projectName ? (
                        <div>
                          <p className="font-medium">{expense.projectName}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.projectCode}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell>{expense.category}</TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(expense.status)}>
                        {expense.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatCurrency(expense.amount)}</TableCell>

                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>

                    <TableCell>{expense.vendorName ?? "-"}</TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(expense)}
                          disabled={isPending || expense.status === "PAID"}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSubmitExpense(expense)}
                          disabled={
                            isPending ||
                            !["DRAFT", "REJECTED"].includes(expense.status)
                          }
                        >
                          <Send className="size-4" />
                          Submit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(expense)}
                          disabled={isPending || expense.status !== "SUBMITTED"}
                        >
                          <CheckCircle2 className="size-4" />
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(expense)}
                          disabled={isPending || expense.status !== "SUBMITTED"}
                        >
                          <XCircle className="size-4" />
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePaid(expense)}
                          disabled={isPending || expense.status !== "APPROVED"}
                        >
                          <Wallet className="size-4" />
                          Paid
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(expense)}
                          disabled={isPending || expense.status === "PAID"}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada expense.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              Showing {expenses.length} of {pagination.totalItems} expenses
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
                Prev
              </Button>

              <span>
                Page {pagination.page} / {pagination.totalPages}
              </span>

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
