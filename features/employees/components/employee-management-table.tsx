"use client";

import {
  Edit,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { EmployeeListItem } from "@/types/employee";
import type { UserListItem } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EmployeeManagementTableProps = {
  employees: EmployeeListItem[];
  users: UserListItem[];
  isPending: boolean;
  uploadingEmployeeId: string | null;
  onPhotoUpload: (employee: EmployeeListItem, file: File) => void;
  onEdit: (employee: EmployeeListItem) => void;
  onDelete: (employee: EmployeeListItem) => void;
};

export function EmployeeManagementTable({
  employees,
  users,
  isPending,
  uploadingEmployeeId,
  onPhotoUpload,
  onEdit,
  onDelete,
}: EmployeeManagementTableProps) {
  const sortedEmployees = [...employees].sort((a, b) =>
    a.employeeCode.localeCompare(b.employeeCode),
  );

  return (
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
                <TableHead>Karyawan</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Employment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Akun Tertaut</TableHead>
                <TableHead className="w-[220px]">Aksi</TableHead>
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
                          Unggah
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
                                onPhotoUpload(employee, file);
                              }

                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {getBusinessLabel(employee.department)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {getBusinessLabel(employee.employmentType)}
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
                        {getBusinessLabel(employee.status)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {linkedUser ? (
                        <div>
                          <p className="text-sm font-medium">{linkedUser.name}</p>
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
                          onClick={() => onEdit(employee)}
                          disabled={isPending}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(employee)}
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
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                    Belum ada karyawan.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
