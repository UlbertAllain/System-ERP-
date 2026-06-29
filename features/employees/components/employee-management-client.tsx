"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Edit,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import {
  createEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeAction,
  updateEmployeePhotoAction,
} from "@/features/employees/actions";
import type {
  EmployeeDepartment,
  EmployeeListItem,
  EmployeeStatus,
  EmploymentType,
} from "@/types/employee";
import type { UserListItem } from "@/types/user";
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
import {
  uploadImageToCloudinaryUnsigned,
  validateImageFile,
} from "@/lib/cloudinary/client";

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

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) =>
      a.employeeCode.localeCompare(b.employeeCode),
    );
  }, [employees]);

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
        setMessage("Employee ID tidak ditemukan.");
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
      `Yakin ingin menghapus employee ${employee.fullName}? Data akan soft delete.`,
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
        const uploadedImage = await uploadImageToCloudinaryUnsigned(
          file,
          `nexty/employees/${employee.id}/photo`,
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
            : "Upload foto employee gagal.";

        setMessage(errorMessage);
      } finally {
        setUploadingEmployeeId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Employees
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Employee Management
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
              New Employee
            </Button>
          </DialogTrigger>

          <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {mode === "create" ? "Create Employee" : "Edit Employee"}
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
                    <Label htmlFor="employeeCode">Employee Code</Label>
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
                    <Label htmlFor="fullName">Full Name</Label>
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
                      placeholder="employee@nextylabs.id"
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

                <div className="grid gap-2">
                  <Label htmlFor="userId">Linked User</Label>
                  <select
                    id="userId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
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
                    Satu user hanya boleh terhubung ke satu employee profile.
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
                      className="h-10 rounded-md border bg-background px-3 text-sm"
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
                      className="h-10 rounded-md border bg-background px-3 text-sm"
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
                    <Label htmlFor="joinDate">Join Date</Label>
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
                      className="h-10 rounded-md border bg-background px-3 text-sm"
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
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {mode === "edit" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="resignDate">Resign Date</Label>
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
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Alamat employee"
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
                  <Label htmlFor="notes">Notes</Label>
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
                  "Create Employee"
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
            <Users className="size-5" />
            Employees
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked User</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedEmployees.map((employee) => {
                  const linkedUser = users.find(
                    (user) => user.uid === employee.userId,
                  );

                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.employeeCode}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {employee.email}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                            {employee.photo?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={employee.photo.url}
                                alt={employee.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="size-5 text-muted-foreground" />
                            )}
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted">
                            {uploadingEmployeeId === employee.id ? (
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
                                isPending || uploadingEmployeeId === employee.id
                              }
                              onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                  handleEmployeePhotoUpload(employee, file);
                                }

                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">{employee.department}</Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {employee.employmentType}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            employee.status === "ACTIVE"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {employee.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {linkedUser ? (
                          <div>
                            <p className="text-sm font-medium">
                              {linkedUser.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {linkedUser.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not linked
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(employee)}
                            disabled={isPending}
                          >
                            <Edit className="size-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(employee)}
                            disabled={isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {sortedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada employee.
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
