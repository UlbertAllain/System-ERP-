# Nexty Labs ERP

Nexty Labs ERP adalah aplikasi operasional perusahaan berbasis proyek dengan modul proyek, tugas, pelanggan, keuangan, karyawan, kehadiran, cuti, laporan, pengguna, role, dan audit aktivitas.

Versi ini merupakan revisi P0–P2 yang memprioritaskan integritas transaksi, otorisasi server, alur kerja yang mudah dipahami, dan struktur kode yang lebih terjaga.

## Stack

- Next.js 16 App Router
- React 19 dan TypeScript strict
- Firebase Authentication
- Firestore melalui Firebase Admin SDK
- Cloudinary signed server upload
- Tailwind CSS dan Radix UI
- Zod untuk validasi input

## Prinsip keamanan

- Browser tidak diberi akses langsung ke Firestore. Seluruh data bisnis dibaca dan diubah melalui Server Actions/API yang memakai Firebase Admin SDK.
- Permission runtime dihitung dari role aktif di Firestore, bukan mempercayai cache permission pada user.
- Payment adalah satu-satunya sumber perubahan `paidAmount` invoice.
- Invoice, payment, expense, proyek, dan perubahan user kritis memakai transaction/batch bersama audit log.
- Pembayaran tidak dihapus. Koreksi dilakukan melalui reversal agar riwayat tetap utuh.
- Upload gambar harus melalui endpoint server yang memeriksa session, permission, folder allowlist, ukuran, MIME type, dan file signature.
- Error internal tidak dikirim mentah ke browser.

## Struktur utama

```text
app/                    Route, layout, dan API
components/             UI bersama dan dashboard shell
features/               Use case, action, service, schema, dan UI per fitur
modules/finance/         Domain rule dan mapper keuangan
lib/                    Auth, Firebase, audit, error, money, permission
constants/              Konfigurasi, permission, dan role bawaan
scripts/                 Seed dan migration v2
tests/                   Domain regression tests
docs/                    Migration, changelog, dan checklist release
```

Struktur sengaja dibuat dangkal. Business rule tidak boleh ditempatkan di route atau komponen React.

## Persiapan lokal

```bash
npm install
cp .env.example .env.local
```

Isi `.env.local`, lalu jalankan:

```bash
npm run seed
npm run dev
```

Aplikasi tersedia di `http://localhost:3000`.

Password super admin minimal 10 karakter dan wajib memiliki huruf besar, huruf kecil, serta angka. Akun hasil seed wajib mengganti password saat login pertama.

## Navigasi pengguna

Navigasi utama disusun berdasarkan pekerjaan pengguna:

- **Ringkasan** — dashboard dan laporan manajemen.
- **Operasional** — proyek, tugas, dan pelanggan.
- **Keuangan** — ringkasan, tagihan, pembayaran, dan pengeluaran.
- **Sumber Daya** — ringkasan SDM, karyawan, kehadiran, serta izin/cuti.
- **Sistem** — pengguna, peran, profil perusahaan, dan riwayat aktivitas.

Alur kerja proyek ditampilkan sebagai Proyek → Anggota → Tahapan → Tugas.

## Panduan Penggunaan

Sistem menyediakan halaman **Panduan Penggunaan** yang menyesuaikan isi berdasarkan role pengguna.

Setiap role memperoleh penjelasan mengenai:

- menu yang dapat diakses;
- aktivitas yang dapat dilakukan;
- urutan penggunaan setiap fitur;
- batasan akses dan tanggung jawab pengguna.

Apabila pengguna mempunyai beberapa role, panduan akan ditampilkan dalam tab terpisah. Sebagai contoh, pengguna dengan role HR dan Project Manager akan memperoleh panduan HR serta panduan Project Manager dalam halaman yang sama.

## Alur keuangan

### Invoice

1. Buat invoice sebagai `DRAFT`.
2. Periksa pelanggan, proyek, item, tanggal, diskon, dan pajak.
3. Terbitkan menjadi `ISSUED`.
4. Invoice yang telah diterbitkan tidak dapat diedit seperti draft.
5. Status `PARTIALLY_PAID` dan `PAID` dihasilkan oleh payment ledger.

### Payment

1. Pilih invoice berstatus `ISSUED`, `OVERDUE`, atau `PARTIALLY_PAID`.
2. Catat pembayaran menggunakan idempotency key.
3. Transaction mengubah payment, projection invoice, dan audit log secara atomik.
4. Koreksi dilakukan dengan reversal, bukan delete.

### Expense

```text
DRAFT -> SUBMITTED -> APPROVED -> PAID
                   -> REJECTED
```

Pemohon tidak boleh menyetujui pengeluarannya sendiri. `PAID` menjadi state final untuk perubahan biasa.

## Role bawaan

- `super_admin`
- `admin`
- `project_manager`
- `developer`
- `designer`
- `qa`
- `finance`
- `finance_manager`
- `hr`
- `employee`

`finance_manager` mempunyai hak approval/rejection expense. Role `finance` berfokus pada pencatatan dan operasi keuangan, sehingga pemisahan maker–checker dapat diterapkan.

## Migration dari versi lama

Jangan langsung menjalankan seed atau deploy rules di production. Ikuti urutan pada [`docs/MIGRATION-V2.md`](docs/MIGRATION-V2.md).

Ringkasnya:

```bash
npm run migrate:finance-v2
npm run migrate:project-locks-v2
npm run migrate:expense-locks-v2

npm run migrate:finance-v2 -- --apply
npm run migrate:project-locks-v2 -- --apply
npm run migrate:expense-locks-v2 -- --apply

npm run seed
firebase deploy --only firestore:rules,firestore:indexes
npm run check
```

Semua migration melakukan dry run secara default. Backup Firestore dan Firebase Auth wajib dibuat sebelum mode `--apply`.

## Pemeriksaan kualitas

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Atau sekaligus:

```bash
npm run check
```

Checklist manual sebelum release tersedia di [`docs/TEST-CHECKLIST.md`](docs/TEST-CHECKLIST.md).

## Aturan kontribusi

Lihat [`CONTRIBUTING.md`](CONTRIBUTING.md). Jangan menambah mutation finansial tanpa transaction, audit, idempotency, dan regression test.
