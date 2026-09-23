"use client";

import { Clock, Edit, Trash2 } from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type {
  AttendanceRecordListItem,
  AttendanceStatus,
} from "@/types/attendance";
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

type AttendanceManagementTableProps = {
  records: AttendanceRecordListItem[];
  currentUserId: string;
  canUpdate: boolean;
  canDelete: boolean;
  isPending: boolean;
  onEdit: (attendance: AttendanceRecordListItem) => void;
  onDelete: (attendance: AttendanceRecordListItem) => void;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getStatusVariant(status: AttendanceStatus) {
  if (status === "PRESENT" || status === "REMOTE") {
    return "secondary" as const;
  }

  if (status === "ABSENT") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function AttendanceManagementTable({
  records,
  currentUserId,
  canUpdate,
  canDelete,
  isPending,
  onEdit,
  onDelete,
}: AttendanceManagementTableProps) {
  const sortedRecords = [...records].sort((a, b) => {
    if (a.date === b.date) {
      const createdA = a.createdAt?.getTime() ?? 0;
      const createdB = b.createdAt?.getTime() ?? 0;

      return createdB - createdA;
    }

    return b.date.localeCompare(a.date);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          Riwayat Kehadiran
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="w-[160px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedRecords.map((attendance) => {
                const ownAttendance = attendance.userId === currentUserId;

                return (
                  <TableRow key={attendance.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{attendance.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {ownAttendance
                            ? "Kehadiran sendiri"
                            : attendance.userId}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>{attendance.date}</TableCell>
                    <TableCell>{formatDateTime(attendance.clockInAt)}</TableCell>
                    <TableCell>{formatDateTime(attendance.clockOutAt)}</TableCell>

                    <TableCell>
                      <Badge variant={getStatusVariant(attendance.status)}>
                        {getBusinessLabel(attendance.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="min-w-[220px]">
                      <p className="line-clamp-2 text-sm">
                        {attendance.notes ?? "-"}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex gap-2">
                        {canUpdate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(attendance)}
                            disabled={isPending}
                          >
                            <Edit className="size-4" />
                          </Button>
                        ) : null}

                        {canDelete ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDelete(attendance)}
                            disabled={isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {sortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Belum ada catatan kehadiran.
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
