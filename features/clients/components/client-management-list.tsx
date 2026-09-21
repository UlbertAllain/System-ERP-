"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit,
  FilterX,
  ImageIcon,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { ClientListItem, ClientStatus } from "@/types/client";
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

type ClientManagementListProps = {
  clients: ClientListItem[];
  statuses: readonly ClientStatus[];
  search: string;
  status: string;
  pageSize: string;
  pagination: {
    totalItems: number;
    page: number;
    totalPages: number;
  };
  isPending: boolean;
  uploadingClientId: string | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onLogoUpload: (client: ClientListItem, file: File) => void;
  onEdit: (client: ClientListItem) => void;
  onDelete: (client: ClientListItem) => void;
  onPageChange: (page: number) => void;
};

function getStatusVariant(status: ClientStatus) {
  if (status === "ACTIVE") {
    return "secondary" as const;
  }

  if (status === "ARCHIVED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function ClientManagementList({
  clients,
  statuses,
  search,
  status,
  pageSize,
  pagination,
  isPending,
  uploadingClientId,
  onSearchChange,
  onStatusChange,
  onPageSizeChange,
  onApply,
  onReset,
  onLogoUpload,
  onEdit,
  onDelete,
  onPageChange,
}: ClientManagementListProps) {
  return (
    <>
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_140px_auto_auto]">
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
              placeholder="Cari nama, email, perusahaan, atau telepon"
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
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={String(size)}>
                {size} / halaman
              </option>
            ))}
          </select>

          <Button type="button" onClick={onApply}>
            Terapkan
          </Button>

          <Button type="button" variant="outline" onClick={onReset}>
            <FilterX className="size-4" />
            Atur Ulang
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Clients
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {pagination.totalItems} data · halaman {pagination.page} dari{" "}
              {pagination.totalPages}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Situs Web</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[220px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.id}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                          {client.logo?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={client.logo.url}
                              alt={client.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="size-5 text-muted-foreground" />
                          )}
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted">
                          {uploadingClientId === client.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Upload className="size-3" />
                          )}
                          Unggah
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={
                              isPending || uploadingClientId === client.id
                            }
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                onLogoUpload(client, file);
                              }

                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </TableCell>

                    <TableCell>{client.company ?? "-"}</TableCell>

                    <TableCell>
                      <div>
                        <p className="text-sm">{client.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.phone ?? "-"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      {client.website ? (
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline underline-offset-4"
                        >
                          {client.website}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(client.status)}>
                        {getBusinessLabel(client.status)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(client)}
                          disabled={isPending}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(client)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada pelanggan.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan {clients.length} dari {pagination.totalItems} pelanggan
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
    </>
  );
}
