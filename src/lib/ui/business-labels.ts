const BUSINESS_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin Operasional",
  project_manager: "Project Manager",
  developer: "Developer",
  designer: "Designer",
  qa: "Quality Assurance",
  finance_manager: "Finance Manager",
  finance: "Finance",
  hr: "Human Resources",
  employee: "Karyawan",

  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  SUSPENDED: "Ditangguhkan",
  ARCHIVED: "Diarsipkan",

  PLANNING: "Perencanaan",
  PLANNED: "Direncanakan",
  IN_PROGRESS: "Berjalan",
  ON_HOLD: "Ditunda",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",

  TODO: "Belum dimulai",
  IN_REVIEW: "Dalam peninjauan",
  DONE: "Selesai",
  BLOCKED: "Terhambat",

  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak",

  FIXED_PRICE: "Harga tetap",
  HOURLY: "Per jam",
  RETAINER: "Retainer",
  INTERNAL: "Internal",

  PROJECT_MANAGER: "Manajer proyek",
  TECH_LEAD: "Pimpinan teknis",
  DEVELOPER: "Developer",
  DESIGNER: "Desainer",
  QA: "Quality assurance",
  BUSINESS_ANALYST: "Analis bisnis",
  FINANCE: "Keuangan",
  OBSERVER: "Pengamat",
  REMOVED: "Dihapus",

  DRAFT: "Draf",
  ISSUED: "Diterbitkan",
  PARTIALLY_PAID: "Dibayar sebagian",
  PAID: "Lunas",
  OVERDUE: "Jatuh tempo",
  VOID: "Dibatalkan",
  SUBMITTED: "Diajukan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CONFIRMED: "Terkonfirmasi",

  CASH: "Tunai",
  BANK_TRANSFER: "Transfer bank",
  QRIS: "QRIS",
  EWALLET: "Dompet digital",
  CARD: "Kartu",
  OTHER: "Lainnya",

  SOFTWARE: "Perangkat lunak",
  INFRASTRUCTURE: "Infrastruktur",
  OPERATIONAL: "Operasional",
  MARKETING: "Pemasaran",
  TRAVEL: "Perjalanan",
  EQUIPMENT: "Peralatan",
  SALARY: "Gaji",
  TAX: "Pajak",

  FULL_TIME: "Penuh waktu",
  PART_TIME: "Paruh waktu",
  CONTRACT: "Kontrak",
  INTERN: "Magang",
  FREELANCE: "Freelance",
  PROBATION: "Masa percobaan",
  RESIGNED: "Mengundurkan diri",
  TERMINATED: "Diberhentikan",

  MANAGEMENT: "Manajemen",
  ENGINEERING: "Teknik",
  DESIGN: "Desain",
  PRODUCT: "Produk",
  SALES: "Penjualan",
  HUMAN_RESOURCES: "Sumber daya manusia",
  GENERAL_AFFAIRS: "Urusan umum",

  PRESENT: "Hadir",
  LATE: "Terlambat",
  ABSENT: "Tidak hadir",
  HALF_DAY: "Setengah hari",
  WORK_FROM_HOME: "Bekerja dari rumah",

  ANNUAL: "Cuti tahunan",
  SICK: "Sakit",
  UNPAID: "Cuti tanpa bayaran",
  MATERNITY: "Cuti melahirkan",
  PATERNITY: "Cuti ayah",
  BEREAVEMENT: "Cuti kedukaan",
};

export function getBusinessLabel(value: string | null | undefined): string {
  if (!value) return "-";

  return (
    BUSINESS_LABELS[value] ??
    value
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
