"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
} from "lucide-react";

import {
  createEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeAction,
  updateEmployeePhotoAction,
} from "@/modules/employees/actions";
import type {
  EmployeeDepartment,
  EmployeeListItem,
  EmployeeStatus,
  EmploymentType,
} from "@/types/employee";
import type { UserListItem } from "@/types/user";
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
import {
  uploadImageToCloudinary,
  validateImageFile,
} from "@/lib/cloudinary/client";
import { EmployeeManagementTable } from "@/modules/employees/components/employee-management-table";

type EmployeeManagementClientProps = {
  employees: EmployeeListItem[];
  users: UserListItem[];
};

type EmployeeFormState = {
  id?: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  department: EmployeeDepartment;
  employmentType: EmploymentType;
  joinDate: string;
  resignDate: string;
  status: EmployeeStatus;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
};

const departments: EmployeeDepartment[] = [
  "MANAGEMENT",
  "ENGINEERING",
  "UI_UX",
  "QUALITY_ASSURANCE",
  "PRODUCT",
  "MARKETING",
  "SALES",
  "FINANCE",
  "HR",
  "SUPPORT",
];

const employmentTypes: EmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "FREELANCE",
  "INTERNSHIP",
  "CONTRACT",
  "PROBATION",
];

const employeeStatuses: EmployeeStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "RESIGNED",
  "TERMINATED",
];

const initialForm: EmployeeFormState = {
  userId: "",
  employeeCode: "",
  fullName: "",
  email: "",
  phone: "",
  address: "",
  position: "",
  department: "ENGINEERING",
  employmentType: "FULL_TIME",
  joinDate: new Date().toISOString().slice(0, 10),
  resignDate: "",
  status: "ACTIVE",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
};

function formatDateInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function EmployeeManagementClient({
  employees,
  users,
}: EmployeeManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<EmployeeFormState>(initialForm);
  const [uploadingEmployeeId, setUploadingEmployeeId] = useState<string | null>(
    null,
  );

  const availableUsers = useMemo(() => {
    const linkedUserIds = new Set(
      employees
        .map((employee) => employee.userId)
        .filter((userId): userId is string => Boolean(userId)),
    );

    return users.filter((user) => {
      if (form.userId && user.uid === form.userId) {
        return true;
      }

      return !linkedUserIds.has(user.uid);
    });
  }, [employees, form.userId, users]);

  function resetForm() {
    setForm(initialForm);
    setMode("create");
    setMessage(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpenDialog(true);
  }

  function openEditDialog(employee: EmployeeListItem) {
    setMode("edit");
    setMessage(null);
    setForm({
      id: employee.id,
      userId: employee.userId ?? "",
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      position: employee.position,
      department: employee.department,
      employmentType: employee.employmentType,
      joinDate: formatDateInput(employee.joinDate),
      resignDate: formatDateInput(employee.resignDate),
      status: employee.status,
      emergencyContactName: employee.emergencyContactName ?? "",
      emergencyContactPhone: employee.emergencyContactPhone ?? "",
      notes: employee.notes ?? "",
    });
    setOpenDialog(true);
  }

  function handleSubmit() {
    setMessage(null);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createEmployeeAction({
          userId: emptyToNull(form.userId),
          employeeCode: form.employeeCode,
          fullName: form.fullName,
          email: form.email,
          phone: emptyToNull(form.phone),
          address: emptyToNull(form.address),
          position: form.position,
          department: form.department,
          employmentType: form.employmentType,
          joinDate: form.joinDate,
          emergencyContactName: emptyToNull(form.emergencyContactName),
          emergencyContactPhone: emptyToNull(form.emergencyContactPhone),
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
        setMessage("ID karyawan tidak ditemukan.");
        return;
      }

      const result = await updateEmployeeAction({
        id: form.id,
        userId: emptyToNull(form.userId),
        employeeCode: form.employeeCode,
        fullName: form.fullName,
        email: form.email,
        phone: emptyToNull(form.phone),
        address: emptyToNull(form.address),
        position: form.position,
        department: form.department,
        employmentType: form.employmentType,
        joinDate: form.joinDate,
        resignDate: emptyToNull(form.resignDate),
        status: form.status,
        emergencyContactName: emptyToNull(form.emergencyContactName),
        emergencyContactPhone: emptyToNull(form.emergencyContactPhone),
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

  function handleDelete(employee: EmployeeListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menonaktifkan karyawan ${employee.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteEmployeeAction({
        id: employee.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleEmployeePhotoUpload(employee: EmployeeListItem, file: File) {
    setMessage(null);

    const validationMessage = validateImageFile(file, "employeePhoto");

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    startTransition(async () => {
      setUploadingEmployeeId(employee.id);

      try {
        const uploadedImage = await uploadImageToCloudinary(
          file,
          `erp/employees/${employee.id}/photo`,
        );

        const result = await updateEmployeePhotoAction({
          id: employee.id,
          photo: uploadedImage,
        });

        setMessage(result.message);

        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unggah foto karyawan gagal.";

        setMessage(errorMessage);
      } finally {
        setUploadingEmployeeId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Sumber Daya Manusia
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Data Karyawan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola profil employee, kontak darurat, status kerja, dan link akun
            user internal.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Tambah Karyawan
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Tambah Karyawan" : "Ubah Karyawan"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Isi data employee dasar. Photo upload akan dibuat setelah CRUD
                core aman.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="employeeCode">Kode Karyawan</Label>
                    <Input
                      id="employeeCode"
                      value={form.employeeCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          employeeCode: event.target.value,
                        }))
                      }
                      placeholder="NX-EMP-0002"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Nama Lengkap</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      placeholder="Nama lengkap"
                    />
                  </div>
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
                      placeholder="employee@company.com"
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

                <div className="grid gap-2">
                  <Label htmlFor="userId">Akun Tertaut</Label>
                  <select
                    id="userId"
                    className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                    value={form.userId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        userId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Tidak dihubungkan ke user</option>
                    {availableUsers.map((user) => (
                      <option key={user.uid} value={user.uid}>
                        {user.name} — {user.email}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Satu pengguna hanya boleh terhubung ke satu profil karyawan.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={form.position}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          position: event.target.value,
                        }))
                      }
                      placeholder="Frontend Developer"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <select
                      id="department"
                      className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                      value={form.department}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          department: event.target.value as EmployeeDepartment,
                        }))
                      }
                    >
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <select
                      id="employmentType"
                      className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                      value={form.employmentType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          employmentType: event.target.value as EmploymentType,
                        }))
                      }
                    >
                      {employmentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="joinDate">Tanggal Bergabung</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={form.joinDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          joinDate: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as EmployeeStatus,
                        }))
                      }
                      disabled={mode === "create"}
                    >
                      {employeeStatuses.map((status) => (
                        <option key={status} value={status}>
                          {getBusinessLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {mode === "edit" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="resignDate">Tanggal Berhenti</Label>
                    <Input
                      id="resignDate"
                      type="date"
                      value={form.resignDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          resignDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Alamat karyawan"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactName">
                      Emergency Contact Name
                    </Label>
                    <Input
                      id="emergencyContactName"
                      value={form.emergencyContactName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          emergencyContactName: event.target.value,
                        }))
                      }
                      placeholder="Nama kontak darurat"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactPhone">
                      Emergency Contact Phone
                    </Label>
                    <Input
                      id="emergencyContactPhone"
                      value={form.emergencyContactPhone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          emergencyContactPhone: event.target.value,
                        }))
                      }
                      placeholder="Nomor kontak darurat"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Catatan tambahan"
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
                  "Tambah Karyawan"
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

      <EmployeeManagementTable
        employees={employees}
        users={users}
        isPending={isPending}
        uploadingEmployeeId={uploadingEmployeeId}
        onPhotoUpload={handleEmployeePhotoUpload}
        onEdit={openEditDialog}
        onDelete={handleDelete}
      />
    </div>
  );
}
