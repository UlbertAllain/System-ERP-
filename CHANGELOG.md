# Changelog V2 Clean

## Breaking changes

- Direct browser access ke Firestore ditolak.
- Manual `mark invoice paid` dihapus.
- Create/update invoice tidak menerima `paidAmount`.
- Payment tidak dapat diedit atau dihapus; gunakan reversal.
- Invoice menambahkan status `PARTIALLY_PAID`.
- Password minimal menjadi 10 karakter dengan huruf besar, kecil, dan angka.
- Permission runtime membaca role aktif, bukan user permission cache.
- Migration lock diperlukan untuk nomor invoice, kode proyek, dan nomor expense.

## File utama baru

- `lib/domain/money.ts`
- `lib/domain/firestore-value.ts`
- `lib/auth/password-policy.ts`
- `modules/finance/domain/invoice-payment-state.ts`
- `modules/finance/invoices/*`
- `modules/finance/payments/*`
- `modules/finance/expenses/*`
- `components/dashboard/navigation.ts`
- `app/api/uploads/images/route.ts`
- `scripts/migrate-finance-v2.ts`
- `scripts/migrate-project-locks-v2.ts`
- `scripts/migrate-expense-locks-v2.ts`
- `firestore.indexes.json`

## File yang dihapus

- API logout duplikat.
- Action current-user/permission duplikat.
- Placeholder module component.
- `next.config.ts` kosong.
- `AGENTS.md` dan `CLAUDE.md` duplikat.
- Stock SVG bawaan Next/Vercel yang tidak digunakan.

## Hardening final setelah audit regresi

- Task create/update/delete dipindahkan ke transaction atomik bersama audit log.
- Task memvalidasi keterkaitan project, milestone, assignee, dan membership pada server.
- State machine project, milestone, dan task ditambahkan untuk mencegah lompatan status ilegal.
- Project terminal diblokir apabila masih mempunyai task, milestone, atau invoice aktif.
- Task comment create/update/delete dibuat transaksional dan ownership diperiksa di service layer.
- PIC utama tidak dapat dilepas dari membership sebelum PIC project diganti.
- Query pengarsipan project mengabaikan relasi yang sudah soft-delete secara eksplisit.
- Payment date dinormalisasi dan divalidasi sebelum transaction dimulai.
- Logout menyelesaikan server logout dan Firebase client sign-out sekaligus.
- Cloudinary configuration dibuat lazy serta CDN invalidation diaktifkan pada overwrite/delete.
- Firestore indexes untuk pemeriksaan terminal-state project ditambahkan.
- Dropdown status project, milestone, dan task hanya menampilkan transisi yang diizinkan oleh server.
- Seluruh source orphan yang terdeteksi telah dihapus.
