"use client";

import {
  ChevronLeft,
  ChevronRight,
  Edit,
  FileText,
  FilterX,
  Loader2,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { ClientListItem } from "@/types/client";
import type { InvoiceListItem } from "@/types/invoice";
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

type InvoiceManagementListProps = {
  invoices: InvoiceListItem[];
  clients: ClientListItem[];
  projects: ProjectListItem[];
  search: string;
  status: string;
  clientId: string;
  projectId: string;
  pageSize: string;
  pagination: {
    totalItems: number;
    page: number;
    totalPages: number;
  };
  saving: boolean;
  isLoadingDetail: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onProjectIdChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onEdit: (invoice: InvoiceListItem) => void;
  onIssue: (invoice: InvoiceListItem) => void;
  onVoid: (invoice: InvoiceListItem) => void;
  onDelete: (invoice: InvoiceListItem) => void;
  onPageChange: (page: number) => void;
};

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

function getStatusVariant(status: string) {
  if (status === "PAID") {
    return "default" as const;
  }

  if (status === "VOID") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function InvoiceManagementList({
  invoices,
  clients,
  projects,
  search,
  status,
  clientId,
  projectId,
  pageSize,
  pagination,
  saving,
  isLoadingDetail,
  onSearchChange,
  onStatusChange,
  onClientIdChange,
  onProjectIdChange,
  onPageSizeChange,
  onApply,
  onReset,
  onEdit,
  onIssue,
  onVoid,
  onDelete,
  onPageChange,
}: InvoiceManagementListProps) {
  const filteredProjects = clientId
    ? projects.filter((project) => project.clientId === clientId)
    : projects;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          Daftar Tagihan
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_180px_220px_120px_auto_auto]">
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
              placeholder="Cari tagihan, pelanggan, atau proyek"
              className="pl-9"
            />
          </div>

          <select className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="">Semua status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ISSUED">ISSUED</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="VOID">VOID</option>
          </select>

          <select className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm" value={clientId} onChange={(event) => onClientIdChange(event.target.value)}>
            <option value="">Semua pelanggan</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <select className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm" value={projectId} onChange={(event) => onProjectIdChange(event.target.value)}>
            <option value="">Semua proyek</option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} - {project.name}
              </option>
            ))}
          </select>

          <select className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm" value={pageSize} onChange={(event) => onPageSizeChange(event.target.value)}>
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
                <TableHead>Tagihan</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Tagihan</TableHead>
                <TableHead>Terbayar</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="w-[260px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Terbit: {formatDate(invoice.issueDate)}
                    </p>
                  </TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>
                    <p className="font-medium">{invoice.projectCode ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.projectName ?? "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(invoice.status)}>
                      {getBusinessLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(invoice.paidAmount)}</TableCell>
                  <TableCell>{formatCurrency(invoice.remainingAmount)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={saving || invoice.status !== "DRAFT"} onClick={() => onEdit(invoice)}>
                        {isLoadingDetail ? <Loader2 className="size-4 animate-spin" /> : <Edit className="size-4" />}
                        Ubah
                      </Button>
                      {invoice.status === "DRAFT" ? (
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => onIssue(invoice)}>
                          <Send className="size-4" />
                          Terbitkan
                        </Button>
                      ) : null}
                      {invoice.status !== "DRAFT" && invoice.status !== "VOID" && invoice.paidAmount === 0 ? (
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => onVoid(invoice)}>
                          <XCircle className="size-4" />
                          Batalkan
                        </Button>
                      ) : null}
                      <Button size="sm" variant="destructive" disabled={saving || invoice.status !== "DRAFT"} onClick={() => onDelete(invoice)}>
                        <Trash2 className="size-4" />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                    Belum ada tagihan.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>Menampilkan {invoices.length} dari {pagination.totalItems} tagihan</p>
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
