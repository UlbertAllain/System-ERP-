"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit,
  FilterX,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
  updateClientLogoAction,
} from "@/features/clients/actions";
import type { ClientListItem, ClientStatus } from "@/types/client";
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
import {
  uploadImageToCloudinary,
  validateImageFile,
} from "@/lib/cloudinary/client";

type ClientManagementClientProps = {
  clients: ClientListItem[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search: string;
    status: string;
  };
};

type ClientFormState = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  address: string;
  status: ClientStatus;
  notes: string;
};

const clientStatuses: ClientStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

const initialForm: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  website: "",
  address: "",
  status: "ACTIVE",
  notes: "",
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getStatusVariant(status: ClientStatus) {
  if (status === "ACTIVE") {
    return "secondary" as const;
  }

  if (status === "ARCHIVED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function ClientManagementClient({
  clients,
  pagination,
}: ClientManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ClientFormState>(initialForm);
  const [uploadingClientId, setUploadingClientId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState(pagination.search);
  const [status, setStatus] = useState(pagination.status);
  const [pageSize, setPageSize] = useState(String(pagination.pageSize));

  const sortedClients = useMemo(() => {
    return clients;
  }, [clients]);

  function updateQuery(next: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextStatus = next.status ?? status;
    const nextPageSize = next.pageSize ?? pageSize;
    const nextPage = next.page ?? 1;

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextStatus) {
      params.set("status", nextStatus);
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
    setPageSize("10");
    router.push(`${pathname}?page=1&pageSize=10`);
  }

  function goToPage(page: number) {
    updateQuery({
      page,
    });
  }

  function resetForm() {
    setForm(initialForm);
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(client: ClientListItem) {
    setMode("edit");
    setMessage(null);
    setForm({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone ?? "",
      company: client.company ?? "",
      website: client.website ?? "",
      address: client.address ?? "",
      status: client.status,
      notes: client.notes ?? "",
    });
    setOpenDialog(true);
  }

  function handleSubmit() {
    setMessage(null);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createClientAction({
          name: form.name,
          email: form.email,
          phone: emptyToNull(form.phone),
          company: emptyToNull(form.company),
          website: emptyToNull(form.website),
          address: emptyToNull(form.address),
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
        setMessage("ID pelanggan tidak ditemukan.");
        return;
      }

      const result = await updateClientAction({
        id: form.id,
        name: form.name,
        email: form.email,
        phone: emptyToNull(form.phone),
        company: emptyToNull(form.company),
        website: emptyToNull(form.website),
        address: emptyToNull(form.address),
        status: form.status,
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

  function handleDelete(client: ClientListItem) {
    const confirmed = window.confirm(
      `Yakin ingin mengarsipkan pelanggan ${client.name}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteClientAction({
        id: client.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleClientLogoUpload(client: ClientListItem, file: File) {
    setMessage(null);

    const validationMessage = validateImageFile(file, "clientLogo");

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    startTransition(async () => {
      setUploadingClientId(client.id);

      try {
        const uploadedImage = await uploadImageToCloudinary(
          file,
          `erp/clients/${client.id}/logo`,
        );

        const result = await updateClientLogoAction({
          id: client.id,
          logo: uploadedImage,
        });

        setMessage(result.message);

        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unggah logo pelanggan gagal.";

        setMessage(errorMessage);
      } finally {
        setUploadingClientId(null);
      }
    });
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Operasional
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Data Pelanggan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola identitas pelanggan, perusahaan, kontak, situs web, dan status kerja sama.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Tambah Pelanggan
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Tambah Pelanggan" : "Ubah Pelanggan"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Lengkapi data pelanggan. Logo dapat diperbarui setelah data utama tersimpan.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama Pelanggan</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nama pelanggan"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="client@example.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telepon</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="Nomor telepon"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="company">Perusahaan</Label>
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          company: event.target.value,
                        }))
                      }
                      placeholder="Nama perusahaan"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="website">Situs Web</Label>
                    <Input
                      id="website"
                      value={form.website}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          website: event.target.value,
                        }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

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
                          status: event.target.value as ClientStatus,
                        }))
                      }
                    >
                      {clientStatuses.map((status) => (
                        <option key={status} value={status}>
                          {getBusinessLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Alamat pelanggan"
                    rows={3}
                  />
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
                    placeholder="Catatan pelanggan"
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
                  "Tambah Pelanggan"
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

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_140px_auto_auto]">
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
              placeholder="Cari nama, email, perusahaan, atau telepon"
              className="pl-9"
            />
          </div>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            {clientStatuses.map((clientStatus) => (
              <option key={clientStatus} value={clientStatus}>
                {getBusinessLabel(clientStatus)}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value)}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={String(size)}>
                {size} / halaman
              </option>
            ))}
          </select>

          <Button type="button" onClick={handleApplyFilters}>
            Terapkan
          </Button>

          <Button type="button" variant="outline" onClick={handleResetFilters}>
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
                {sortedClients.map((client) => (
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
                                handleClientLogoUpload(client, file);
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
                          onClick={() => openEditDialog(client)}
                          disabled={isPending}
                        >
                          <Edit className="size-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(client)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedClients.length === 0 ? (
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
              Menampilkan {sortedClients.length} dari {pagination.totalItems} pelanggan
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
                Sebelumnya
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Berikutnya
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
