# NEXTY ERP

NEXTY ERP adalah sistem ERP internal untuk mengelola operasi perusahaan berbasis proyek: user dan role, employee, HR, client, project delivery, invoice, payment, expense, report, dan audit log.

Stack utama:

- Next.js 16 App Router
- React 19
- TypeScript
- Firebase Authentication
- Firestore via Firebase Admin SDK
- Cloudinary unsigned upload untuk logo/foto/receipt
- shadcn/Radix UI, Tailwind CSS, lucide-react

## Alur Sistem

1. User login memakai Firebase Authentication.
2. Client mengirim Firebase `idToken` ke server action.
3. Server memverifikasi user Firestore dan membuat HTTP-only session cookie.
4. Dashboard membaca session cookie, memuat user aktif, role, dan `permissionsCache`.
5. Setiap page dan server action melakukan authorization ulang berdasarkan permission.
6. Service layer melakukan validasi bisnis, mutasi Firestore, dan menulis audit log.

## Setup Lokal

Install dependency:

```bash
npm install
```

Buat `.env.local` dari contoh:

```bash
cp .env.local.example .env.local
```

Isi minimal environment berikut:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `SUPER_ADMIN_NAME`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- konfigurasi Cloudinary jika upload digunakan

Seed data awal:

```bash
npm run seed
```

Jalankan aplikasi:

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Akun Pertama

Setelah `npm run seed`, sistem membuat atau memperbarui akun Super Admin dari environment:

- `SUPER_ADMIN_NAME`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

Saat login pertama, user wajib mengganti password karena `mustChangePassword` diset `true`.

## Role dan Hak Akses

Permission sistem disimpan di `constants/permissions/permissions.ts`, sedangkan role bawaan ada di `constants/permissions/roles.ts`. Role dapat diatur ulang dari halaman Roles, kecuali `super_admin` yang dikunci agar selalu memiliki akses penuh.

### Super Admin

Super Admin memiliki seluruh permission.

Alur kerja:

1. Login ke sistem.
2. Ganti password pada login pertama.
3. Kelola company setting.
4. Kelola role permission.
5. Buat user internal.
6. Hubungkan user dengan employee profile.
7. Pantau semua modul, report, dan audit log.

Menu utama:

- Dashboard
- Reports
- Audit Logs
- Employees
- HR
- Clients
- Projects
- Finance
- Settings
- Users
- Roles

### Admin

Admin berfokus pada operasi umum non-sensitif.

Alur kerja:

1. Kelola client.
2. Buat dan update project.
3. Kelola project member.
4. Buat milestone dan task.
5. Pantau report operasional.
6. Baca audit log dasar.

Catatan:

- Admin tidak dirancang untuk mengubah role permission.
- Admin tidak memiliki seluruh approval finance sensitif.

### Project Manager

Project Manager mengelola project yang ditugaskan kepadanya.

Alur kerja:

1. Buka Projects untuk melihat project assigned.
2. Kelola member pada project yang relevan.
3. Buat milestone.
4. Buat, assign, dan update task.
5. Update status milestone dan task.
6. Baca invoice project jika diberi permission `invoice.read_project`.
7. Pantau report project dan task.

Aturan akses:

- `project.read_assigned` hanya menampilkan project saat user menjadi PIC atau active project member.
- `milestone.read_assigned` hanya menampilkan milestone dari project assigned.
- `task.read_assigned` menampilkan task assigned ke user atau task dari project assigned.

### Developer, Designer, QA

Role ini berfokus pada pekerjaan project dan task.

Alur kerja:

1. Buka Projects untuk melihat project assigned.
2. Buka Milestones untuk konteks delivery.
3. Buka Tasks untuk melihat task assigned.
4. Update status task sendiri jika punya permission `task.change_own_status`.
5. Update jam kerja task sendiri jika punya permission `task.update_own_hours`.
6. Buat dan kelola leave request sendiri.
7. Clock in dan clock out attendance.

Catatan:

- QA memiliki tambahan permission untuk membuat task pada skenario bug/task record.
- Akses data dibatasi pada project/task yang terhubung dengan user.

### Finance

Finance mengelola cashflow operasional.

Alur invoice:

1. Buka Clients atau Projects untuk memastikan data relasi sudah benar.
2. Buat invoice dari halaman Invoices.
3. Tambahkan line item.
4. Issue invoice dari status `DRAFT` ke `ISSUED`.
5. Record payment dari halaman Payments.
6. Sistem otomatis memperbarui `paidAmount`, `remainingAmount`, `status`, dan `paidAt` invoice.

Alur expense:

1. Buat expense dari halaman Expenses.
2. Submit expense.
3. Approve atau reject expense sesuai kebijakan.
4. Mark as paid setelah expense approved.

Catatan logic:

- Payment tidak boleh melebihi total invoice.
- Perubahan payment dan invoice dilakukan dalam Firestore transaction.
- Invoice `VOID` tidak dapat menerima payment.
- Expense `PAID` dikunci dari update/delete biasa.

### HR

HR mengelola employee, leave, dan attendance.

Alur employee:

1. Buat employee profile.
2. Hubungkan employee ke user jika user login diperlukan.
3. Update data employee.
4. Soft delete atau restore employee jika perlu.

Alur leave:

1. Employee membuat leave request status `DRAFT`.
2. Employee submit request.
3. HR approve atau reject request.
4. Employee dapat cancel sebelum approved/rejected.

Alur attendance:

1. Employee clock in.
2. Employee clock out.
3. HR dapat melihat seluruh attendance.
4. HR dapat mengoreksi attendance jika memiliki permission update.

### Employee

Employee memiliki akses self-service.

Alur kerja:

1. Update profil pribadi.
2. Upload foto pribadi.
3. Buat dan submit leave request sendiri.
4. Clock in dan clock out attendance.
5. Lihat task assigned.

Aturan akses:

- `employee.read_own` hanya membaca employee profile milik user tersebut.
- `leave.read_own` hanya membaca leave request milik user tersebut.
- `attendance.read_own` hanya membaca attendance milik user tersebut.
- `expense.read_own` hanya membaca expense yang dibuat user tersebut.

### Client

Role Client disiapkan untuk fase portal client berikutnya. Pada MVP ini role tersebut belum memiliki permission aktif.

## Modul Utama

### Users

Digunakan untuk membuat user internal, suspend/activate user, soft delete user, dan assign role. Permission user dihitung ke `permissionsCache` agar guard cepat dan konsisten.

### Roles

Digunakan untuk mengubah permission role non-Super Admin. Setelah role diubah, sistem rebuild `permissionsCache` user yang memakai role tersebut.

### Employees

Menyimpan identitas karyawan, status employment, department, kontak, foto, dan relasi ke user login.

### Clients

Menyimpan data client, status client, kontak, company, website, notes, dan logo.

### Projects

Menyimpan project code, client, PIC, status, priority, billing type, budget, timeline, thumbnail, dan notes. PIC otomatis disinkronkan sebagai project member.

### Project Members

Mengelola employee yang terlibat dalam project. Membership aktif dipakai untuk membatasi akses project assigned.

### Milestones

Mengelola tahap delivery dalam project. Milestone punya status `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`, dan `CANCELLED`.

### Tasks

Mengelola pekerjaan delivery. Task terhubung ke project, milestone opsional, assignee, priority, order, tanggal, status, dan completion timestamp.

### Invoices

Mengelola tagihan client. Invoice menghitung subtotal, discount, tax, total, paid amount, dan remaining amount.

### Payments

Mencatat pembayaran invoice. Mutasi payment otomatis menjaga konsistensi invoice dalam transaction.

### Expenses

Mencatat pengeluaran internal/project. Expense memiliki status `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, dan `PAID`.

### Reports

Menampilkan ringkasan finance, project, task, client, dan HR. Untuk data besar, sebaiknya dikembangkan ke aggregate collection atau query pagination.

### Audit Logs

Mencatat perubahan penting di service layer: actor, action, module, entity, old value, new value, dan timestamp.

## Quality Check

Jalankan sebelum commit/deploy:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Catatan Pengembangan

- Semua server action harus melakukan authentication dan authorization sendiri.
- Jangan mengandalkan UI untuk security.
- Service yang memakai Firebase Admin SDK harus menerapkan scope data sendiri karena Admin SDK bypass Firestore Rules.
- Mutasi lintas dokumen penting harus memakai Firestore transaction.
- Permission baru harus didaftarkan di constants, di-seed, lalu disambungkan ke page guard dan action guard.
- Jangan mengubah `super_admin` menjadi role terbatas.

