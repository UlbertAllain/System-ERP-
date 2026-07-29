export type AttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "ABSENT"
  | "LEAVE"
  | "SICK"
  | "REMOTE";

export type AttendanceRecordListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  userId: string;
  date: string;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  status: AttendanceStatus;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AttendanceRecordDetail = AttendanceRecordListItem;
