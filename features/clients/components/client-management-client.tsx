"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Edit,
  ImageIcon,
  Loader2,
  Plus,
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
  uploadImageToCloudinaryUnsigned,
  validateImageFile,
} from "@/lib/cloudinary/client";

type ClientManagementClientProps = {
  clients: ClientListItem[];
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
}: ClientManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ClientFormState>(initialForm);
  const [uploadingClientId, setUploadingClientId] = useState<string | null>(
    null,
  );

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

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
        setMessage("Client ID tidak ditemukan.");
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
      `Yakin ingin menghapus client ${client.name}? Data akan di-archive.`,
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
        const uploadedImage = await uploadImageToCloudinaryUnsigned(
          file,
          `nexty/clients/${client.id}/logo`,
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
          error instanceof Error ? error.message : "Upload logo client gagal.";

        setMessage(errorMessage);
      } finally {
        setUploadingClientId(null);
      }
    });
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Clients
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Client Management
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola data client, company, kontak, website, dan status client.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="size-4" />
              New Client
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Create Client" : "Edit Client"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Isi data client. Logo upload akan dibuat setelah CRUD core aman.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="name">Client Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nama client"
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
                    <Label htmlFor="phone">Phone</Label>
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
                    <Label htmlFor="company">Company</Label>
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
                    <Label htmlFor="website">Website</Label>
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
                      className="h-10 rounded-md border bg-background px-3 text-sm"
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
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Alamat client"
                    rows={3}
                  />
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
                    placeholder="Catatan client"
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
                  "Create Client"
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
            <Building2 className="size-5" />
            Clients
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
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
                          Upload
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
                        {client.status}
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
                      Belum ada client.
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
