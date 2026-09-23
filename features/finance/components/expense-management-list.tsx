"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  FilterX,
  Receipt,
  Search,
  Send,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type {
  ExpenseCategory,
  ExpenseListItem,
  ExpenseStatus,
} from "@/types/expense";
import type { ProjectListItem } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExpenseManagementListProps = {
  expenses: ExpenseListItem[];
  projects: ProjectListItem[];
  statuses: readonly ExpenseStatus[];
  categories: readonly ExpenseCategory[];
  search: string;
  status: string;
  category: string;
  projectId: string;
  pageSize: string;
  pagination: {
    totalItems: number;
    page: number;
    totalPages: number;
  };
  isPending: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onProjectIdChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onEdit: (expense: ExpenseListItem) => void;
  onSubmit: (expense: ExpenseListItem) => void;
  onApprove: (expense: ExpenseListItem) => void;
  onReject: (expense: ExpenseListItem) => void;
  onPaid: (expense: ExpenseListItem) => void;
  onDelete: (expense: ExpenseListItem) => void;
  onPageChange: (page: number) => void;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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

export function ExpenseManagementList({
  expenses,
  projects,
  statuses,
  categories,
  search,
  status,
  category,
  projectId,
  pageSize,
  pagination,
  isPending,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onProjectIdChange,
  onPageSizeChange,
  onApply,
  onReset,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  onPaid,
  onDelete,
  onPageChange,
}: ExpenseManagementListProps) {
  return (
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
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onApply();
                }
              }}
              placeholder="Cari pengeluaran, pemasok, atau proyek"
              className="pl-9"
            />
          </div>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="">Semua status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {getBusinessLabel(item)}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">Semua kategori</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {getBusinessLabel(item)}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={projectId}
            onChange={(event) => onProjectIdChange(event.target.value)}
          >
            <option value="">Semua proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} - {project.name}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
          >
            <option value="10">10 rows</option>
            <option value="20">20 rows</option>
            <option value="50">50 rows</option>
          </select>

          <Button type="button" variant="outline" onClick={onApply}>
            <Search className="size-4" />
            Terapkan
          </Button>

          <Button type="button" variant="ghost" onClick={onReset}>
            <FilterX className="size-4" />
            Atur Ulang
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengeluaran</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead className="w-[360px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.expenseNumber}
                      </p>
                      {expense.rejectedReason ? (
                        <p className="mt-1 text-xs text-destructive">
                          Alasan ditolak: {expense.rejectedReason}
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

                  <TableCell>{getBusinessLabel(expense.category)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(expense.status)}>
                      {getBusinessLabel(expense.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                  <TableCell>{expense.vendorName ?? "-"}</TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(expense)} disabled={isPending || expense.status === "PAID"}>
                        <Edit className="size-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onSubmit(expense)} disabled={isPending || !["DRAFT", "REJECTED"].includes(expense.status)}>
                        <Send className="size-4" />
                        Submit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onApprove(expense)} disabled={isPending || expense.status !== "SUBMITTED"}>
                        <CheckCircle2 className="size-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onReject(expense)} disabled={isPending || expense.status !== "SUBMITTED"}>
                        <XCircle className="size-4" />
                        Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onPaid(expense)} disabled={isPending || expense.status !== "APPROVED"}>
                        <Wallet className="size-4" />
                        Paid
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(expense)} disabled={isPending || expense.status === "PAID"}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                    Belum ada pengeluaran.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>Menampilkan {expenses.length} dari {pagination.totalItems} pengeluaran</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <span>Halaman {pagination.page} / {pagination.totalPages}</span>
            <Button type="button" variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>
              Berikutnya
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
