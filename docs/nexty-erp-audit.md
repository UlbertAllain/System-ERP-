# NEXTY ERP Audit

Tanggal audit: 2026-07-04

## Ringkasan

NEXTY ERP sudah punya fondasi MVP yang cukup lengkap: Next.js App Router, Firebase Auth, session cookie HTTP-only, role/permission matrix, service layer, audit log, dan modul utama untuk finance, HR, project delivery, client, user, role, report, serta company setting.

Target berikutnya bukan menambah halaman sebanyak mungkin, tetapi menaikkan kualitas menjadi ERP operasional yang aman, konsisten, dan siap dipakai harian.

## Hal Yang Sudah Bagus

- Server Actions sudah memakai authentication dan authorization ulang.
- Firebase Admin SDK dipisahkan di server-only modules.
- Finance payment memakai Firestore transaction untuk menjaga invoice paid/remaining amount.
- Role `super_admin` punya semua permission dan role matrix sudah cukup detail.
- Service layer menulis audit log untuk mutasi penting.
- Soft delete dipakai di modul utama sehingga data historis tidak langsung hilang.
- TypeScript strict, lint, dan typecheck baseline bersih.

## Temuan Kritis

- Scoped project authorization belum konsisten. Role seperti Project Manager dan QA punya akses assigned, tetapi create task/milestone/member sebelumnya belum selalu memvalidasi target project assigned.
- Permission project member tidak sinkron dengan role matrix. Role Project Manager punya `project_member.assign` dan `project_member.remove`, sedangkan action sebelumnya hanya menerima `project_member.create` dan `project_member.delete`.
- Project member read sebelumnya berpotensi membuka daftar member semua project untuk user dengan `project_member.read`, walaupun user hanya punya akses project assigned.
- Dashboard utama masih menampilkan narasi MVP/session/permission, belum KPI operasional nyata.
- Beberapa permission belum punya implementasi fitur penuh: task comment, reset password, client blacklist, payment refund/confirm eksplisit, export finance/report/audit.

## Temuan Arsitektur

- Banyak service melakukan full collection scan lalu filter di memory. Ini masih oke untuk skripsi/MVP, tetapi tidak premium untuk data besar. Perlu pagination, query indexed, dan aggregate collection.
- Normalisasi tanggal memakai `new Date("YYYY-MM-DD")` di beberapa service. Perlu util tanggal terpusat agar timezone konsisten.
- Pola `timestampToDate`, `normalizeNullableString`, dan snapshot normalizer diduplikasi di banyak service. Perlu shared utility kecil agar bug tidak menyebar.
- Banyak revalidate memakai `revalidatePath` luas. Untuk Next.js 16, nanti lebih baik gunakan cache tags atau `refresh()` sesuai workflow.
- Firestore security rules ada, tetapi Admin SDK bypass rules. Karena itu scope data harus tetap hidup di service/action, bukan hanya UI.

## Temuan Produk

- ERP belum punya purchase/procurement, inventory, asset, payroll, approval workflow umum, notification, document attachment, dan export resmi.
- Client portal masih reserved tanpa fitur aktif. Lebih baik disembunyikan dari komunikasi MVP sampai benar-benar dibangun.
- Dashboard perlu dibagi menurut role: executive, finance, PM, HR, employee self-service.
- Report masih ringkasan, belum drill-down dan belum export.
- Audit log perlu filter kuat berdasarkan module, actor, entity, action, dan tanggal.

## Temuan UX/UI

- Visual masih terlalu editorial/hero-like untuk ERP. ERP premium sebaiknya lebih dense, utilitarian, dan mudah discan.
- Radius komponen dan dekorasi background terlalu besar/ramai untuk aplikasi operasional.
- Beberapa copy masih campur "Command OS", "MVP", dan teks internal developer. Ini perlu diganti dengan bahasa produk yang stabil.
- Tabel butuh standar enterprise: search, filter, pagination, sortable columns, empty state, loading state, dan bulk action.
- Form perlu standar validasi field-level yang lebih konsisten, bukan hanya message global.

## Perubahan Yang Sudah Dilakukan Pada Audit Ini

- Menambah helper project/member access scope.
- Mengunci create task agar user scoped hanya bisa membuat task di project yang assigned.
- Mengunci create milestone agar user scoped hanya bisa membuat milestone di project yang assigned.
- Memperbaiki permission action project member agar `project_member.assign/remove` digunakan sesuai role matrix.
- Memfilter list/get/update/remove project member berdasarkan akses project user.
- Menghapus debug panel permission dari halaman Roles.
- Mengganti dashboard utama dari hero MVP menjadi dashboard KPI role-aware yang hanya mengambil data sesuai permission user.
- Mengurangi styling editorial: radius default diperkecil, background radial dihapus, negative letter spacing utama dinetralkan, dan shell copy diganti menjadi bahasa operasional.
- Mengimplementasikan Task Comments: type, schema, service, Server Actions, audit log, permission guard, task access scope, dan dialog komentar di Task Management.
- Menambahkan fondasi paginated table untuk Clients: action paginated terpisah, service dengan page/pageSize/status/search, URL-driven filters, dan pagination controls.
- Menambahkan paginated table untuk Projects: action paginated terpisah, service dengan page/pageSize/status/priority/search, assigned-project scoping, URL-driven filters, dan pagination controls.
- Menambahkan paginated table untuk Tasks: action paginated terpisah, service dengan page/pageSize/project/status/priority/search, assigned-task scoping, URL-driven filters, dan pagination controls.
- Menambahkan paginated table untuk Invoices: action paginated terpisah, service dengan page/pageSize/client/project/status/search, `invoice.read_project` scoping tanpa membocorkan total global, URL-driven filters, dan pagination controls.
- Menambahkan paginated table untuk Payments: action paginated terpisah, service dengan page/pageSize/client/project/status/method/search, URL-driven filters, dan pagination controls.
- Menambahkan paginated table untuk Expenses: action paginated terpisah, service dengan page/pageSize/project/status/category/search, `expense.read_own` scoping tanpa membocorkan total global, URL-driven filters, dan pagination controls.
- Menambahkan paginated table untuk Audit Logs: action paginated terpisah, service dengan page/pageSize/module/action/user/search, URL-driven filters, pagination controls, dan audit log baru menyimpan `userEmail` serta `searchText`.
- Menambahkan paginated table untuk Users: action paginated terpisah, service dengan page/pageSize/status/role/search, URL-driven filters, pagination controls, dan user baru/terupdate menyimpan `searchText`.

## Prioritas Berikutnya

1. Implement reset password admin flow dan audit trail-nya.
2. Tambahkan export CSV/PDF untuk finance, reports, dan audit logs.
3. Tambahkan notification center untuk approval, due date, invoice overdue, leave request, dan assigned task.
4. Buat approval workflow reusable untuk expense, leave, milestone, invoice issue/void, dan payment refund.
5. Tambahkan test minimal untuk authorization boundary dan finance transaction.
6. Audit Firestore indexes dan rules sesuai query final.

## Catatan Teknis Terbuka

- Search paginated Clients/Projects/Tasks/Invoices/Payments/Expenses/Audit Logs/Users bergantung pada field `searchText`; data lama perlu backfill lewat update/migration agar searchable penuh.
- Query paginated baru memakai kombinasi `deletedAt`, `createdAt`, `paymentDate`, `expenseDate`, `status`, `method`, `category`, `module`, `action`, `userId`, `roleSlugs`, `clientId`, `projectId`, dan `searchText`; Firestore composite indexes perlu dibuat sesuai error runtime/index suggestion Firebase.
- Status invoice `OVERDUE` sudah ada di tipe dan filter, tetapi belum ada job/logic yang otomatis menandai overdue berdasarkan due date.
