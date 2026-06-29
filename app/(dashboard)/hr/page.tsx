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
          <CardTitle>HR Dashboard Error</CardTitle>
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
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            HR
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            HR Dashboard
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ringkasan employee, leave request, dan attendance harian.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/hr/leave-requests">Leave Requests</Link>
          </Button>

          <Button asChild>
            <Link href="/hr/attendance">Attendance</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Active Employees
              <Users className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.activeEmployees}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Employee dengan status ACTIVE.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Pending Leave
              <FileCheck2 className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.pendingLeaveRequests}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave request berstatus SUBMITTED.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Attendance Today
              <CalendarCheck className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.todayAttendanceRecords}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total attendance record hari ini.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Clocked In
              <UserCheck className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.todayClockedIn}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Employee sudah clock in hari ini.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Not Clocked In
              <Clock className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.todayNotClockedIn}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimasi employee belum clock in.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
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

                <Badge variant="secondary">{leaveRequest.status}</Badge>
              </div>
            ))}

            {summary.recentLeaveRequests.length === 0 ? (
              <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                Belum ada leave request.
              </div>
            ) : null}

            <Button asChild variant="outline" className="w-full">
              <Link href="/hr/leave-requests">View All Leave Requests</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
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
                    In: {formatDateTime(attendance.clockInAt)} · Out:{" "}
                    {formatDateTime(attendance.clockOutAt)}
                  </p>
                </div>

                <Badge variant="secondary">{attendance.status}</Badge>
              </div>
            ))}

            {summary.recentAttendanceRecords.length === 0 ? (
              <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
                Belum ada attendance record.
              </div>
            ) : null}

            <Button asChild variant="outline" className="w-full">
              <Link href="/hr/attendance">View All Attendance</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
