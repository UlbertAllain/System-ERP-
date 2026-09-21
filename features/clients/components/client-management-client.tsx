"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
  updateClientLogoAction,
} from "@/features/clients/actions";
import type { ClientListItem, ClientStatus } from "@/types/client";
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
import {
  uploadImageToCloudinary,
  validateImageFile,
} from "@/lib/cloudinary/client";
import { ClientManagementList } from "@/features/clients/components/client-management-list";

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

      <ClientManagementList
        clients={clients}
        statuses={clientStatuses}
        search={search}
        status={status}
        pageSize={pageSize}
        pagination={pagination}
        isPending={isPending}
        uploadingClientId={uploadingClientId}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPageSizeChange={setPageSize}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onLogoUpload={handleClientLogoUpload}
        onEdit={openEditDialog}
        onDelete={handleDelete}
        onPageChange={goToPage}
      />
    </div>
  );
}
