"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogIn,
  LogOut,
  Save,
  X,
} from "lucide-react";

import {
  clockInAction,
  clockOutAction,
  deleteAttendanceRecordAction,
  updateAttendanceAction,
} from "@/modules/hr/actions";
import type {
  AttendanceRecordListItem,
  AttendanceStatus,
} from "@/types/attendance";
import type { CurrentUser } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceManagementTable } from "@/modules/hr/components/attendance-management-table";

type AttendanceManagementClientProps = {
  currentUser: CurrentUser;
  attendanceRecords: AttendanceRecordListItem[];
};

type EditFormState = {
  id: string;
  date: string;
  clockInAt: string;
  clockOutAt: string;
  status: AttendanceStatus;
  notes: string;
};

const attendanceStatuses: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "LEAVE",
  "SICK",
  "REMOTE",
];

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatDateTimeInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
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

export function AttendanceManagementClient({
  currentUser,
  attendanceRecords,
}: AttendanceManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [clockInDate, setClockInDate] = useState(getTodayDateString());
  const [clockInStatus, setClockInStatus] =
    useState<AttendanceStatus>("PRESENT");
  const [clockInNotes, setClockInNotes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const ownTodayAttendance = useMemo(() => {
    return attendanceRecords.find(
      (attendance) =>
        attendance.userId === currentUser.uid &&
        attendance.date === getTodayDateString(),
    );
  }, [attendanceRecords, currentUser.uid]);

  const canClockIn = currentUser.permissions.includes("attendance.clock_in");
  const canClockOut = currentUser.permissions.includes("attendance.clock_out");
  const canUpdateAttendance =
    currentUser.permissions.includes("attendance.update");
  const canDeleteAttendance =
    currentUser.permissions.includes("attendance.delete");

  const canClockInToday =
    canClockIn && (!ownTodayAttendance || !ownTodayAttendance.clockInAt);

  const canClockOutToday =
    canClockOut &&
    Boolean(ownTodayAttendance?.clockInAt) &&
    !ownTodayAttendance?.clockOutAt;

  function handleClockIn() {
    setMessage(null);

    startTransition(async () => {
      const result = await clockInAction({
        date: clockInDate,
        status: clockInStatus,
        notes: emptyToNull(clockInNotes),
      });

      setMessage(result.message);

      if (result.success) {
        setClockInDate(getTodayDateString());
        setClockInStatus("PRESENT");
        setClockInNotes("");
        router.refresh();
      }
    });
  }

  function handleClockOut() {
    if (!ownTodayAttendance) {
      setMessage("Kehadiran hari ini belum ditemukan.");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await clockOutAction({
        id: ownTodayAttendance.id,
        notes: emptyToNull(clockOutNotes),
      });

      setMessage(result.message);

      if (result.success) {
        setClockOutNotes("");
        router.refresh();
      }
    });
  }

  function openEditAttendanceDialog(attendance: AttendanceRecordListItem) {
    setMessage(null);
    setEditForm({
      id: attendance.id,
      date: attendance.date,
      clockInAt: formatDateTimeInput(attendance.clockInAt),
      clockOutAt: formatDateTimeInput(attendance.clockOutAt),
      status: attendance.status,
      notes: attendance.notes ?? "",
    });
    setOpenEditDialog(true);
  }

  function handleUpdateAttendance() {
    if (!editForm) {
      setMessage("Data kehadiran tidak ditemukan.");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await updateAttendanceAction({
        id: editForm.id,
        date: editForm.date,
        clockInAt: emptyToNull(editForm.clockInAt),
        clockOutAt: emptyToNull(editForm.clockOutAt),
        status: editForm.status,
        notes: emptyToNull(editForm.notes),
      });

      setMessage(result.message);

      if (result.success) {
        setOpenEditDialog(false);
        setEditForm(null);
        router.refresh();
      }
    });
  }

  function handleDeleteAttendance(attendance: AttendanceRecordListItem) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus kehadiran ${attendance.employeeName} pada ${attendance.date}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteAttendanceRecordAction({
        id: attendance.id,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
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
            Attendance
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Catat jam masuk dan pulang, pantau kehadiran, serta lakukan koreksi manual oleh
            HR.
          </p>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogIn className="size-5" />
              Clock In
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {ownTodayAttendance?.clockInAt ? (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-medium">Hari ini sudah clock in.</p>
                <p className="mt-1 text-muted-foreground">
                  {formatDateTime(ownTodayAttendance.clockInAt)}
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="clockInDate">Tanggal</Label>
                <Input
                  id="clockInDate"
                  type="date"
                  value={clockInDate}
                  onChange={(event) => setClockInDate(event.target.value)}
                  disabled={!canClockInToday || isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clockInStatus">Status</Label>
                <select
                  id="clockInStatus"
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                  value={clockInStatus}
                  onChange={(event) =>
                    setClockInStatus(event.target.value as AttendanceStatus)
                  }
                  disabled={!canClockInToday || isPending}
                >
                  {attendanceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {getBusinessLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clockInNotes">Catatan</Label>
              <Textarea
                id="clockInNotes"
                rows={3}
                value={clockInNotes}
                onChange={(event) => setClockInNotes(event.target.value)}
                placeholder="Catatan clock in..."
                disabled={!canClockInToday || isPending}
              />
            </div>

            <Button
              className="gap-2"
              onClick={handleClockIn}
              disabled={!canClockInToday || isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              Clock In
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogOut className="size-5" />
              Clock Out
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {ownTodayAttendance?.clockOutAt ? (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-medium">Hari ini sudah clock out.</p>
                <p className="mt-1 text-muted-foreground">
                  {formatDateTime(ownTodayAttendance.clockOutAt)}
                </p>
              </div>
            ) : null}

            {!ownTodayAttendance?.clockInAt ? (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-medium">Belum clock in hari ini.</p>
                <p className="mt-1 text-muted-foreground">
                  Clock out baru bisa dilakukan setelah clock in.
                </p>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="clockOutNotes">Catatan</Label>
              <Textarea
                id="clockOutNotes"
                rows={3}
                value={clockOutNotes}
                onChange={(event) => setClockOutNotes(event.target.value)}
                placeholder="Catatan clock out..."
                disabled={!canClockOutToday || isPending}
              />
            </div>

            <Button
              className="gap-2"
              variant="outline"
              onClick={handleClockOut}
              disabled={!canClockOutToday || isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Clock Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <AttendanceManagementTable
        records={attendanceRecords}
        currentUserId={currentUser.uid}
        canUpdate={canUpdateAttendance}
        canDelete={canDeleteAttendance}
        isPending={isPending}
        onEdit={openEditAttendanceDialog}
        onDelete={handleDeleteAttendance}
      />

      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ubah Kehadiran</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Koreksi manual hanya tersedia bagi pengguna dengan hak akses pengelolaan kehadiran.
            </p>
          </DialogHeader>

          {editForm ? (
            <div className="grid gap-5 py-2">
              <div className="grid gap-2">
                <Label htmlFor="editDate">Tanggal</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editForm.date}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current
                        ? {
                            ...current,
                            date: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="editClockInAt">Clock In At</Label>
                  <Input
                    id="editClockInAt"
                    type="datetime-local"
                    value={editForm.clockInAt}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? {
                              ...current,
                              clockInAt: event.target.value,
                            }
                          : current,
                      )
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="editClockOutAt">Clock Out At</Label>
                  <Input
                    id="editClockOutAt"
                    type="datetime-local"
                    value={editForm.clockOutAt}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? {
                              ...current,
                              clockOutAt: event.target.value,
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editStatus">Status</Label>
                <select
                  id="editStatus"
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current
                        ? {
                            ...current,
                            status: event.target.value as AttendanceStatus,
                          }
                        : current,
                    )
                  }
                >
                  {attendanceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {getBusinessLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editNotes">Catatan</Label>
                <Textarea
                  id="editNotes"
                  rows={3}
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current
                        ? {
                            ...current,
                            notes: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenEditDialog(false);
                    setEditForm(null);
                  }}
                  disabled={isPending}
                >
                  <X className="size-4" />
                  Batal
                </Button>

                <Button onClick={handleUpdateAttendance} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
