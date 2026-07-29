# Checklist Release

Gunakan Firebase staging dan akun berbeda untuk pembuat, approver, employee, project manager, finance, finance manager, HR, admin, dan super admin.

## Automated gate

```bash
npm run check
```

Semua command harus exit code 0.

## Authentication

- Login akun aktif berhasil.
- Akun suspended/deleted ditolak.
- User baru diarahkan ke ganti password.
- Password lemah ditolak.
- User tidak dapat menonaktifkan `mustChangePassword` dengan memanggil action secara manual.
- Setelah ganti password, session lama tidak dapat dipakai dan user harus login ulang.
- Perubahan role/status menyebabkan token lama kehilangan akses setelah refresh/login ulang.

## Authorization

- Employee hanya melihat data sendiri sesuai permission.
- Project manager hanya melihat project assigned.
- Finance tidak dapat mengubah role.
- Finance biasa tidak dapat self-approve expense.
- Finance manager dapat approve expense milik user lain.
- HR tidak dapat approve/reject cuti miliknya sendiri.
- Request langsung ke Firestore browser ditolak.

## Invoice

- Invoice baru selalu `DRAFT`, `paidAmount=0`, dan `remainingAmount=totalAmount`.
- Nomor invoice duplikat ditolak pada request bersamaan.
- Due date sebelum issue date ditolak.
- Diskon di atas subtotal ditolak.
- Invoice draft dapat diedit.
- Invoice issued tidak dapat diedit seperti draft.
- Invoice yang memiliki payment tidak dapat dihapus/void secara tidak sah.

## Payment

- Payment hanya dapat dicatat untuk invoice yang diterbitkan.
- Payment lebih besar dari sisa invoice ditolak.
- Double click/retry dengan idempotency key yang sama hanya membuat satu payment.
- Key yang sama dengan payload berbeda ditolak.
- Payment sebagian menghasilkan `PARTIALLY_PAID`.
- Payment penuh menghasilkan `PAID` dan sisa nol.
- Reversal mengembalikan projection invoice dengan benar.
- Payment history tetap ada setelah reversal.
- Audit payment dan perubahan invoice tercatat.

## Expense

- Nomor expense duplikat ditolak.
- State transition hanya mengikuti `DRAFT -> SUBMITTED -> APPROVED/REJECTED -> PAID`.
- Pemohon tidak dapat approve expense sendiri.
- Expense paid tidak dapat diedit atau dihapus biasa.

## Project

- Kode project duplikat ditolak.
- PIC otomatis menjadi member aktif dalam transaction yang sama.
- Pergantian PIC menyinkronkan membership.
- Project dengan task/milestone aktif atau invoice terbuka tidak dapat diarsipkan.
- Project tidak dapat masuk `COMPLETED` atau `CANCELLED` selama relasi aktif tersebut masih ada.
- Transisi status project yang melompati state yang diizinkan ditolak.
- Transisi status milestone yang tidak sah ditolak.
- Task menolak milestone dari project lain.
- Task menolak assignee yang bukan member aktif project.
- Task aktif tidak dapat dihapus; batalkan terlebih dahulu.
- PIC utama tidak dapat dikeluarkan dari membership sebelum PIC project diganti.
- User tidak dapat mengubah atau menghapus komentar task milik user lain tanpa permission khusus.
- Mutation task/comment yang gagal tidak meninggalkan data tanpa audit log.
- Dropdown status tidak menawarkan lompatan status yang akan ditolak server.
- Project terminal menolak penambahan/perubahan member, milestone, dan task.

## Upload

- JPG, PNG, dan WEBP valid dapat diunggah.
- File dengan ekstensi gambar tetapi signature palsu ditolak.
- File di atas batas ukuran ditolak.
- Folder di luar allowlist ditolak.
- User tanpa permission ditolak.
- Cloudinary secret tidak muncul di browser bundle atau response.

## UX

- Sidebar hanya menampilkan menu yang dapat diakses.
- Mobile sidebar dapat dibuka/ditutup dan tidak menutup konten secara permanen.
- Empty state menjelaskan kondisi, bukan istilah teknis.
- Tombol aksi utama dapat ditemukan tanpa berpindah ke menu database-related.
- Seluruh label kritis dapat dimengerti oleh client non-teknis.
