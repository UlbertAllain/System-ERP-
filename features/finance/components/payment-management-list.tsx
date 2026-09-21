"use client";

import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Search,
  XCircle,
} from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { ClientListItem } from "@/types/client";
import type { PaymentListItem, PaymentMethod } from "@/types/payment";
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

type PaymentManagementListProps = {
  payments: PaymentListItem[];
  clients: ClientListItem[];
  projects: ProjectListItem[];
  methods: readonly PaymentMethod[];
  search: string;
  status: string;
  method: string;
  clientId: string;
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
  onMethodChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onProjectIdChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onCancel: (payment: PaymentListItem) => void;
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

function getStatusVariant(status: PaymentListItem["status"]) {
  return status === "CONFIRMED" ? ("secondary" as const) : ("destructive" as const);
}

export function PaymentManagementList({
  payments,
  clients,
  projects,
  methods,
  search,
  status,
  method,
  clientId,
  projectId,
  pageSize,
  pagination,
  isPending,
  onSearchChange,
  onStatusChange,
  onMethodChange,
  onClientIdChange,
  onProjectIdChange,
  onPageSizeChange,
  onApply,
  onReset,
  onCancel,
  onPageChange,
}: PaymentManagementListProps) {
  const filteredProjects = clientId
    ? projects.filter((project) => project.clientId === clientId)
    : projects;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="size-5" />
          Pembayaran
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_170px_180px_220px_120px_auto_auto]">
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
              placeholder="Cari tagihan, pelanggan, atau referensi"
              className="pl-9"
            />
          </div>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="">Semua status</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={method}
            onChange={(event) => onMethodChange(event.target.value)}
          >
            <option value="">Semua metode</option>
            {methods.map((item) => (
              <option key={item} value={item}>
                {getBusinessLabel(item)}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={clientId}
            onChange={(event) => onClientIdChange(event.target.value)}
          >
            <option value="">Semua pelanggan</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={projectId}
            onChange={(event) => onProjectIdChange(event.target.value)}
          >
            <option value="">Semua proyek</option>
            {filteredProjects.map((project) => (
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
                <TableHead>Tagihan</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead className="w-[220px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <p className="font-medium">{payment.invoiceNumber}</p>
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="font-medium">{payment.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.clientCompany ?? "-"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    {payment.projectName ? (
                      <div>
                        <p className="font-medium">{payment.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.projectCode}
                        </p>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell>{getBusinessLabel(payment.method)}</TableCell>

                  <TableCell>
                    <Badge variant={getStatusVariant(payment.status)}>
                      {getBusinessLabel(payment.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>{payment.referenceNumber ?? "-"}</TableCell>

                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel(payment)}
                      disabled={isPending || payment.status === "CANCELLED"}
                    >
                      <XCircle className="size-4" />
                      Batalkan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Belum ada pembayaran.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Menampilkan {payments.length} dari {pagination.totalItems} pembayaran
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Sebelumnya
            </Button>

            <span>
              Halaman {pagination.page} / {pagination.totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Berikutnya
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
