# Migration P0–P2

Dokumen ini wajib diikuti saat memindahkan database versi lama ke ERP Workspace v2.

## 1. Backup dan staging

Sebelum perubahan apa pun:

1. Export Firestore production.
2. Simpan daftar user Firebase Authentication.
3. Salin environment production ke secret manager yang aman.
4. Jalankan seluruh proses pertama kali pada project Firebase staging.
5. Bekukan input invoice/payment selama migration production berlangsung.

Jangan mengandalkan rollback source code untuk mengembalikan projection keuangan yang sudah berubah.

## 2. Siapkan environment

```bash
cp .env.example .env.local
npm install
```

Pastikan service account hanya tersedia di server dan tidak memakai prefix `NEXT_PUBLIC_`.

## 3. Dry run migration

```bash
npm run migrate:finance-v2
npm run migrate:project-locks-v2
npm run migrate:expense-locks-v2
```

Dry run akan berhenti ketika menemukan kondisi yang tidak aman, termasuk:

- nomor invoice aktif duplikat;
- kode proyek aktif duplikat;
- nomor expense aktif duplikat;
- pembayaran confirmed melebihi total invoice;
- dokumen tanpa nomor/kode utama.

Perbaiki data sumber terlebih dahulu. Jangan mengubah script agar melewati error tersebut.

## 4. Terapkan migration

Setelah hasil dry run diperiksa:

```bash
npm run migrate:finance-v2 -- --apply
npm run migrate:project-locks-v2 -- --apply
npm run migrate:expense-locks-v2 -- --apply
```

Perubahan penting:

- `paidAmount`, `remainingAmount`, status, dan `paidAt` invoice dibangun ulang dari payment `CONFIRMED`.
- Invoice dapat mempunyai status `PARTIALLY_PAID`.
- Collection lock nomor dibuat untuk invoice, proyek, dan expense.
- Payment lama tetap dipertahankan sebagai ledger.

## 5. Seed permission dan role

```bash
npm run seed
```

Seed akan:

- membuat/memperbarui permission aktif;
- menghapus permission definition yang sudah tidak digunakan;
- membuat/memperbarui system role;
- menghapus system role lama yang tidak lagi terdaftar;
- mempertahankan custom role;
- membangun ulang `permissionsCache` user;
- membuat/memperbarui super admin dan company setting.

Otorisasi runtime tetap membaca role aktif secara langsung. `permissionsCache` hanya data turunan untuk kompatibilitas dan tampilan.

## 6. Deploy Firestore rules dan indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Rules v2 menolak seluruh read/write langsung dari browser. Pastikan semua halaman berjalan melalui Server Actions/API sebelum deployment production.

Index dapat membutuhkan waktu untuk selesai dibangun. Jangan membuka trafik production sebelum seluruh index berstatus ready.

## 7. Validasi aplikasi

```bash
npm run check
```

Kemudian jalankan checklist pada `docs/TEST-CHECKLIST.md` menggunakan akun terpisah untuk maker dan approver.

## 8. Urutan deployment production

1. Aktifkan maintenance window.
2. Backup ulang tepat sebelum migration.
3. Deploy source server baru, tetapi jangan buka trafik.
4. Jalankan dry run.
5. Jalankan migration `--apply`.
6. Jalankan seed.
7. Deploy rules dan indexes.
8. Tunggu index ready.
9. Jalankan smoke test.
10. Buka trafik.
11. Pantau error log, audit log, dan transaksi pertama.

## 9. Catatan kompatibilitas

- Flow `mark invoice paid` manual dihapus.
- Edit/delete payment dihapus; gunakan reversal.
- Invoice issued/paid tidak dapat diedit seperti draft.
- Browser Firestore SDK tidak dapat membaca data bisnis.
- Session lama dapat kehilangan akses saat role berubah; user harus login ulang bila diperlukan.
- Nominal uang dinormalisasi ke dua angka desimal dan dihitung melalui integer minor units.

## 10. Validasi data workflow project

Versi ini menegakkan state machine project, milestone, dan task pada mutation baru. Sebelum membuka trafik, audit data lama berikut:

- project `COMPLETED`/`CANCELLED` yang masih mempunyai task atau milestone aktif;
- project terminal yang masih mempunyai invoice `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, atau `OVERDUE`;
- task yang menunjuk milestone dari project berbeda;
- task dengan assignee yang bukan member aktif project;
- member PIC utama yang sudah soft-delete.

Data lama tidak dihapus otomatis. Perbaiki inkonsistensi tersebut pada staging berdasarkan konteks bisnis agar history tidak dimodifikasi secara spekulatif.
