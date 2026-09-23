import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  FileCheck2,
  UserCheck,
  Users,
} from "lucide-react";

import { getHrDashboardSummaryAction } from "@/features/hr/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { getBusinessLabel } from "@/lib/ui/business-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function HrPage() {
  await requireAnyPagePermission([
    "hr.dashboard.read",
    "employee.read",
    "employee.read_all",
    "leave.read",
    "leave.read_all",
    "leave.read_own",
    "attendance.read",
    "attendance.read_all",
    "attendance.read_own",
  ]);

  const result = await getHrDashboardSummaryAction();

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kesalahan Ringkasan SDM</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    );
  }

  const summary = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Sumber Daya Manusia
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Ringkasan SDM
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pantau karyawan, pengajuan izin, dan kehadiran harian dalam satu tampilan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/hr/leave-requests">Pengajuan Cuti</Link>
          </Button>

          <Button asChild>
            <Link href="/hr/attendance">Kehadiran</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Karyawan Aktif
              <Users className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.activeEmployees}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Karyawan yang masih aktif bekerja.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Izin Menunggu Persetujuan
              <FileCheck2 className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.pendingLeaveRequests}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pengajuan izin yang perlu ditinjau.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Kehadiran Hari Ini
              <CalendarCheck className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.todayAttendanceRecords}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jumlah catatan kehadiran hari ini.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Sudah Masuk
              <UserCheck className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.todayClockedIn}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Karyawan yang sudah mencatat jam masuk.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Belum Masuk
              <Clock className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.todayNotClockedIn}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Perkiraan karyawan yang belum mencatat jam masuk.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pengajuan Cuti Terbaru</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {summary.recentLeaveRequests.map((leaveRequest) => (
              <div
                key={leaveRequest.id}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{leaveRequest.employeeName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {leaveRequest.type} · {formatDate(leaveRequest.startDate)} -{" "}
                    {formatDate(leaveRequest.endDate)} ·{" "}
                    {leaveRequest.totalDays} hari
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {leaveRequest.reason}
                  </p>
                </div>

                <Badge variant="secondary">
                  {getBusinessLabel(leaveRequest.status)}
                </Badge>
              </div>
            ))}

            {summary.recentLeaveRequests.length === 0 ? (
              <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                Belum ada pengajuan izin.
              </div>
            ) : null}

            <Button asChild variant="outline" className="w-full">
              <Link href="/hr/leave-requests">Lihat Semua Pengajuan Cuti</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kehadiran Terbaru</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {summary.recentAttendanceRecords.map((attendance) => (
              <div
                key={attendance.id}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{attendance.employeeName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {attendance.date}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Masuk: {formatDateTime(attendance.clockInAt)} · Pulang:{" "}
                    {formatDateTime(attendance.clockOutAt)}
                  </p>
                </div>

                <Badge variant="secondary">
                  {getBusinessLabel(attendance.status)}
                </Badge>
              </div>
            ))}

            {summary.recentAttendanceRecords.length === 0 ? (
              <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                Belum ada catatan kehadiran.
              </div>
            ) : null}

            <Button asChild variant="outline" className="w-full">
              <Link href="/hr/attendance">Lihat Semua Kehadiran</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
