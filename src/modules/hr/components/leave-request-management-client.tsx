"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Send, X, XCircle } from "lucide-react";

import {
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  createLeaveRequestAction,
  rejectLeaveRequestAction,
  submitLeaveRequestAction,
} from "@/modules/hr/actions";
import type {
  LeaveRequestListItem,
  LeaveRequestStatus,
  LeaveRequestType,
} from "@/types/leave";
import type { CurrentUser } from "@/types/auth";
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

type LeaveRequestManagementClientProps = {
  currentUser: CurrentUser;
  leaveRequests: LeaveRequestListItem[];
};

type LeaveFormState = {
  type: LeaveRequestType;
  startDate: string;
  endDate: string;
  reason: string;
};

const leaveTypes: LeaveRequestType[] = [
  "ANNUAL_LEAVE",
  "SICK_LEAVE",
  "PERMISSION",
  "UNPAID_LEAVE",
  "OTHER",
];

const initialForm: LeaveFormState = {
  type: "ANNUAL_LEAVE",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  reason: "",
};

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

function getStatusVariant(status: LeaveRequestStatus) {
  if (status === "APPROVED") {
    return "secondary" as const;
  }

  if (status === "REJECTED" || status === "CANCELLED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function LeaveRequestManagementClient({
  currentUser,
  leaveRequests,
}: LeaveRequestManagementClientProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [form, setForm] = useState<LeaveFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectedReason, setRejectedReason] = useState("");

  const sortedLeaveRequests = useMemo(() => {
    return [...leaveRequests].sort((a, b) => {
      const dateA = a.createdAt?.getTime() ?? 0;
      const dateB = b.createdAt?.getTime() ?? 0;

      return dateB - dateA;
    });
  }, [leaveRequests]);

  const canCreateLeave = currentUser.permissions.includes("leave.create");
  const canSubmitLeave = currentUser.permissions.includes("leave.submit");
  const canCancelLeave = currentUser.permissions.includes("leave.cancel");
  const canApproveLeave = currentUser.permissions.includes("leave.approve");
  const canRejectLeave = currentUser.permissions.includes("leave.reject");

  function resetCreateForm() {
    setForm(initialForm);
    setMessage(null);
  }

  function handleCreateLeaveRequest() {
    setMessage(null);

    startTransition(async () => {
      const result = await createLeaveRequestAction({
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });

      setMessage(result.message);

      if (result.success) {
        setOpenCreateDialog(false);
        resetCreateForm();
        router.refresh();
      }
    });
  }

  function handleSubmitLeaveRequest(id: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await submitLeaveRequestAction({ id });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleCancelLeaveRequest(id: string) {
    const confirmed = window.confirm(
      "Yakin ingin membatalkan pengajuan cuti ini?",
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await cancelLeaveRequestAction({ id });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleApproveLeaveRequest(id: string) {
    const confirmed = window.confirm("Setujui pengajuan cuti ini?");

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await approveLeaveRequestAction({ id });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleRejectLeaveRequest(id: string) {
    setMessage(null);

    if (rejectedReason.trim().length < 5) {
      setMessage("Alasan penolakan minimal 5 karakter.");
      return;
    }

    startTransition(async () => {
      const result = await rejectLeaveRequestAction({
        id,
        rejectedReason,
      });

      setMessage(result.message);

      if (result.success) {
        setRejectingLeaveId(null);
        setRejectedReason("");
        router.refresh();
      }
    });
  }

  function isOwnLeaveRequest(leaveRequest: LeaveRequestListItem) {
    return leaveRequest.userId === currentUser.uid;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Sumber Daya Manusia
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Pengajuan Izin dan Cuti
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola pengajuan cuti, izin, sakit, unpaid leave, approval, dan
            pembatalan request.
          </p>
        </div>

        {canCreateLeave ? (
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetCreateForm}>
                <Plus className="size-4" />
                Buat Pengajuan
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Buat Pengajuan Cuti</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Request akan dibuat sebagai DRAFT. Setelah itu bisa disubmit
                  untuk approval.
                </p>
              </DialogHeader>

              <div className="grid gap-5 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="type">Jenis Cuti</Label>
                  <select
                    id="type"
                    className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value as LeaveRequestType,
                      }))
                    }
                  >
                    {leaveTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Tanggal Mulai</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="endDate">Tanggal Selesai</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={form.reason}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    placeholder="Jelaskan alasan pengajuan cuti..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenCreateDialog(false)}
                    disabled={isPending}
                  >
                    Batal
                  </Button>

                  <Button
                    onClick={handleCreateLeaveRequest}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Draf"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Cuti</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jumlah Hari</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[280px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedLeaveRequests.map((leaveRequest) => {
                  const ownLeave = isOwnLeaveRequest(leaveRequest);

                  const canSubmitThis =
                    canSubmitLeave &&
                    ownLeave &&
                    leaveRequest.status === "DRAFT";

                  const canCancelThis =
                    canCancelLeave &&
                    ownLeave &&
                    ["DRAFT", "SUBMITTED"].includes(leaveRequest.status);

                  const canReviewThis =
                    leaveRequest.status === "SUBMITTED" &&
                    (canApproveLeave || canRejectLeave);

                  return (
                    <TableRow key={leaveRequest.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {leaveRequest.employeeName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ownLeave ? "Own request" : leaveRequest.userId}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{getBusinessLabel(leaveRequest.type)}</Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(leaveRequest.startDate)}</p>
                          <p className="text-muted-foreground">
                            to {formatDate(leaveRequest.endDate)}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>{leaveRequest.totalDays} hari</TableCell>

                      <TableCell>
                        <Badge variant={getStatusVariant(leaveRequest.status)}>
                          {getBusinessLabel(leaveRequest.status)}
                        </Badge>
                      </TableCell>

                      <TableCell className="min-w-[220px]">
                        <p className="line-clamp-2 text-sm">
                          {leaveRequest.reason}
                        </p>

                        {leaveRequest.rejectedReason ? (
                          <p className="mt-1 text-xs text-destructive">
                            Alasan ditolak: {leaveRequest.rejectedReason}
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {canSubmitThis ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() =>
                                handleSubmitLeaveRequest(leaveRequest.id)
                              }
                              disabled={isPending}
                            >
                              <Send className="size-3" />
                              Submit
                            </Button>
                          ) : null}

                          {canCancelThis ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() =>
                                handleCancelLeaveRequest(leaveRequest.id)
                              }
                              disabled={isPending}
                            >
                              <XCircle className="size-3" />
                              Batal
                            </Button>
                          ) : null}

                          {canReviewThis && canApproveLeave ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() =>
                                handleApproveLeaveRequest(leaveRequest.id)
                              }
                              disabled={isPending}
                            >
                              <Check className="size-3" />
                              Approve
                            </Button>
                          ) : null}

                          {canReviewThis && canRejectLeave ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => {
                                setRejectingLeaveId(leaveRequest.id);
                                setRejectedReason("");
                              }}
                              disabled={isPending}
                            >
                              <X className="size-3" />
                              Reject
                            </Button>
                          ) : null}
                        </div>

                        {rejectingLeaveId === leaveRequest.id ? (
                          <div className="mt-3 space-y-2 rounded-xl border bg-muted/30 p-3">
                            <Label className="text-xs">Reject Reason</Label>
                            <Textarea
                              value={rejectedReason}
                              onChange={(event) =>
                                setRejectedReason(event.target.value)
                              }
                              placeholder="Alasan penolakan..."
                              rows={3}
                            />

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleRejectLeaveRequest(leaveRequest.id)
                                }
                                disabled={isPending}
                              >
                                Confirm Reject
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectingLeaveId(null);
                                  setRejectedReason("");
                                }}
                                disabled={isPending}
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {sortedLeaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      Belum ada pengajuan izin atau cuti.
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
