import type { PermissionSlug } from "@/constants/permissions";

export type GuideWorkflow = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  requiredPermissions?: PermissionSlug[];
  steps: string[];
};

export type RoleGuide = {
  slug: string;
  label: string;
  eyebrow: string;
  summary: string;
  capabilities: string[];
  workflows: GuideWorkflow[];
  reminders: string[];
};

const attendanceWorkflow: GuideWorkflow = {
  title: "Mencatat kehadiran harian",
  description:
    "Gunakan halaman Kehadiran saat mulai dan selesai bekerja agar riwayat kerja tercatat dengan benar.",
  href: "/hr/attendance",
  actionLabel: "Buka Kehadiran",
  requiredPermissions: [
    "attendance.read_own",
    "attendance.clock_in",
    "attendance.clock_out",
  ],
  steps: [
    "Buka menu Kehadiran dari sidebar.",
    "Pada awal kerja, periksa tanggal dan status lalu klik Clock In.",
    "Tambahkan catatan hanya bila ada informasi penting, misalnya bekerja dari rumah atau datang terlambat.",
    "Saat pekerjaan selesai, isi catatan bila diperlukan lalu klik Clock Out.",
    "Periksa bagian Riwayat Kehadiran untuk memastikan jam masuk dan jam keluar sudah tercatat.",
  ],
};

const leaveWorkflow: GuideWorkflow = {
  title: "Mengajukan izin atau cuti",
  description:
    "Buat pengajuan, simpan sebagai draf bila belum final, lalu kirim agar dapat ditinjau HR.",
  href: "/hr/leave-requests",
  actionLabel: "Buka Izin dan Cuti",
  requiredPermissions: ["leave.create", "leave.read_own"],
  steps: [
    "Buka menu Izin dan Cuti lalu klik Buat Pengajuan.",
    "Pilih jenis cuti, tanggal mulai, tanggal selesai, dan tulis alasan yang jelas.",
    "Klik Simpan Draf bila data masih ingin diperiksa kembali.",
    "Pada daftar pengajuan, klik Submit untuk mengirim draf kepada HR.",
    "Pantau status pengajuan. Pengajuan yang masih dapat dibatalkan akan menampilkan tombol Batal.",
  ],
};

const assignedTaskWorkflow: GuideWorkflow = {
  title: "Mengerjakan tugas yang diberikan",
  description:
    "Gunakan daftar tugas sebagai sumber utama untuk melihat pekerjaan, tenggat, prioritas, dan konteks proyek.",
  href: "/projects/tasks",
  actionLabel: "Buka Tugas",
  requiredPermissions: ["task.read_assigned", "task.read", "task.read_all"],
  steps: [
    "Buka menu Tugas dan cari pekerjaan berdasarkan proyek, status, atau kata kunci.",
    "Baca deskripsi, prioritas, tenggat, serta penanggung jawab sebelum mulai bekerja.",
    "Perbarui data yang memang dapat Anda ubah sesuai hak akses akun.",
    "Gunakan komentar tugas untuk menulis progres, pertanyaan, kendala, atau hasil pekerjaan.",
    "Pastikan informasi terakhir pada tugas cukup jelas untuk dipahami anggota tim lain.",
  ],
};

export const ROLE_GUIDES: Record<string, RoleGuide> = {
  super_admin: {
    slug: "super_admin",
    label: "Super Admin",
    eyebrow: "Kendali sistem",
    summary:
      "Anda memiliki akses penuh terhadap modul operasional, data perusahaan, pengguna, peran, dan konfigurasi sistem.",
    capabilities: [
      "Mengelola seluruh pengguna dan status aksesnya.",
      "Mengatur hak akses setiap peran kecuali hak Super Admin yang dikunci.",
      "Melihat seluruh modul operasional, keuangan, SDM, laporan, dan riwayat aktivitas.",
      "Menjaga konfigurasi perusahaan tetap benar dan aman.",
    ],
    workflows: [
      {
        title: "Membuat dan mengatur akun pengguna",
        description:
          "Buat akun internal, berikan peran yang tepat, lalu kelola status akses pengguna dari satu halaman.",
        href: "/settings/users",
        actionLabel: "Buka Pengguna",
        requiredPermissions: ["user.read"],
        steps: [
          "Buka menu Pengguna lalu klik Tambah Pengguna.",
          "Isi nama, email, kata sandi awal, dan pilih satu atau beberapa peran.",
          "Simpan akun dan sampaikan kredensial awal melalui jalur internal yang aman.",
          "Gunakan aksi pada tabel untuk memperbarui peran, menangguhkan, mengaktifkan, atau menghapus akses.",
          "Jangan memberikan peran Super Admin kecuali pengguna benar-benar bertanggung jawab atas sistem.",
        ],
      },
      {
        title: "Mengatur peran dan hak akses",
        description:
          "Tentukan menu dan tindakan yang boleh digunakan oleh setiap peran tanpa mengubah kode aplikasi.",
        href: "/settings/roles",
        actionLabel: "Buka Peran dan Hak Akses",
        requiredPermissions: ["role.read", "role.manage_permission"],
        steps: [
          "Buka menu Peran dan Hak Akses lalu pilih peran yang ingin diperiksa.",
          "Tinjau izin per modul agar akses tidak terlalu luas dan tidak menghambat pekerjaan.",
          "Aktifkan atau nonaktifkan hak yang diperlukan lalu klik Simpan Perubahan.",
          "Uji menggunakan akun dengan peran tersebut sebelum diberlakukan ke seluruh tim.",
          "Hak akses Super Admin dikunci untuk mencegah sistem kehilangan administrator utama.",
        ],
      },
      {
        title: "Meninjau aktivitas sensitif",
        description:
          "Gunakan riwayat aktivitas untuk menelusuri perubahan data dan tindakan penting pengguna.",
        href: "/audit-logs",
        actionLabel: "Buka Riwayat Aktivitas",
        requiredPermissions: ["audit_log.read"],
        steps: [
          "Buka menu Riwayat Aktivitas.",
          "Cari aktivitas berdasarkan pengguna, modul, atau tindakan yang sedang diperiksa.",
          "Cocokkan waktu, pelaku, dan objek data sebelum mengambil kesimpulan.",
          "Gunakan hasil pemeriksaan sebagai dasar koreksi akses atau prosedur kerja.",
        ],
      },
      {
        title: "Memelihara profil perusahaan",
        description:
          "Pastikan identitas perusahaan yang digunakan sistem selalu mutakhir.",
        href: "/settings/company",
        actionLabel: "Buka Profil Perusahaan",
        requiredPermissions: ["setting.company.read", "setting.system.read"],
        steps: [
          "Buka menu Profil Perusahaan.",
          "Periksa nama, kontak, alamat, dan informasi perusahaan lainnya.",
          "Perbarui data yang berubah lalu simpan.",
          "Lakukan pengecekan ulang setelah perubahan berhasil diproses.",
        ],
      },
    ],
    reminders: [
      "Gunakan prinsip akses minimum: berikan hak hanya sesuai kebutuhan kerja.",
      "Hindari memakai akun Super Admin untuk pekerjaan operasional harian.",
      "Periksa riwayat aktivitas setelah perubahan akses berskala besar.",
    ],
  },

  admin: {
    slug: "admin",
    label: "Admin Operasional",
    eyebrow: "Koordinasi operasional",
    summary:
      "Anda mengelola data utama operasional, mulai dari pelanggan dan proyek sampai tugas, tagihan, laporan, serta administrasi sistem non-sensitif.",
    capabilities: [
      "Mengelola pelanggan dan proyek perusahaan.",
      "Menyusun anggota proyek, tahapan kerja, dan tugas.",
      "Membuat serta memperbarui tagihan dan pengeluaran operasional.",
      "Melihat laporan manajemen dan riwayat aktivitas.",
    ],
    workflows: [
      {
        title: "Mendaftarkan pelanggan",
        description:
          "Pelanggan sebaiknya dibuat lebih dahulu sebelum proyek baru dimasukkan.",
        href: "/clients",
        actionLabel: "Buka Pelanggan",
        requiredPermissions: ["client.read", "client.read_all"],
        steps: [
          "Buka menu Pelanggan lalu klik tambah pelanggan.",
          "Isi identitas, kontak, alamat, dan informasi penting lainnya.",
          "Unggah logo bila tersedia agar data proyek lebih mudah dikenali.",
          "Simpan lalu periksa kembali data pada daftar pelanggan.",
          "Gunakan arsip atau pemulihan data sesuai kondisi, bukan membuat data ganda.",
        ],
      },
      {
        title: "Membuat proyek baru",
        description:
          "Hubungkan proyek dengan pelanggan dan penanggung jawab agar pekerjaan memiliki konteks yang lengkap.",
        href: "/projects",
        actionLabel: "Buka Proyek",
        requiredPermissions: ["project.create", "project.read"],
        steps: [
          "Pastikan pelanggan dan karyawan penanggung jawab sudah tersedia.",
          "Buka menu Proyek lalu klik Buat Proyek.",
          "Isi kode, nama, pelanggan, penanggung jawab, periode, status, dan nilai proyek bila diperlukan.",
          "Simpan proyek lalu lanjutkan ke Anggota, Tahapan, dan Tugas.",
          "Perbarui status proyek secara berkala agar dashboard tetap akurat.",
        ],
      },
      {
        title: "Menyusun pekerjaan proyek",
        description:
          "Pecah proyek menjadi tim, tahapan, dan tugas agar tanggung jawab mudah dipahami.",
        href: "/projects/members",
        actionLabel: "Atur Anggota Proyek",
        requiredPermissions: ["project_member.read"],
        steps: [
          "Tambahkan anggota yang benar-benar terlibat pada proyek.",
          "Buat tahapan kerja melalui halaman Tahapan Proyek.",
          "Buat tugas berdasarkan hasil yang harus diselesaikan, bukan aktivitas yang terlalu umum.",
          "Tetapkan penanggung jawab, prioritas, dan tenggat untuk setiap tugas.",
          "Tinjau progres dari dashboard dan daftar tugas.",
        ],
      },
      {
        title: "Menyiapkan tagihan pelanggan",
        description:
          "Buat tagihan berdasarkan proyek dan rincian pekerjaan yang telah disepakati.",
        href: "/invoices",
        actionLabel: "Buka Tagihan",
        requiredPermissions: ["invoice.create", "invoice.read"],
        steps: [
          "Buka menu Tagihan lalu buat tagihan baru.",
          "Pilih pelanggan dan proyek yang sesuai.",
          "Isi item, jumlah, harga, diskon, pajak, serta tanggal jatuh tempo.",
          "Simpan sebagai draf untuk pemeriksaan sebelum status diterbitkan.",
          "Perbarui status hanya sesuai proses pembayaran yang sebenarnya.",
        ],
      },
    ],
    reminders: [
      "Hindari membuat pelanggan, proyek, atau tagihan ganda.",
      "Pastikan penanggung jawab dan tenggat selalu terisi dengan jelas.",
      "Gunakan riwayat aktivitas saat perlu menelusuri perubahan data.",
    ],
  },

  project_manager: {
    slug: "project_manager",
    label: "Project Manager",
    eyebrow: "Pengendalian proyek",
    summary:
      "Anda mengatur proyek yang ditugaskan kepada Anda, membentuk tim, menyusun tahapan, membagi tugas, dan memantau penyelesaiannya.",
    capabilities: [
      "Melihat dan memperbarui proyek yang ditugaskan.",
      "Menambah atau menghapus anggota proyek.",
      "Membuat tahapan dan tugas proyek.",
      "Menetapkan penanggung jawab serta memantau progres pekerjaan.",
    ],
    workflows: [
      {
        title: "Memeriksa proyek yang menjadi tanggung jawab Anda",
        description:
          "Mulai pekerjaan dari daftar proyek untuk memahami target, pelanggan, periode, dan kondisi proyek.",
        href: "/projects",
        actionLabel: "Buka Proyek",
        requiredPermissions: ["project.read_assigned"],
        steps: [
          "Buka menu Proyek dan pilih proyek yang ditugaskan kepada Anda.",
          "Periksa tujuan, pelanggan, periode, status, dan informasi anggaran yang dapat diakses.",
          "Perbarui informasi proyek bila ada perubahan yang telah disetujui.",
          "Lanjutkan ke pengaturan anggota, tahapan, dan tugas.",
        ],
      },
      {
        title: "Membentuk tim proyek",
        description:
          "Tambahkan anggota sesuai kebutuhan proyek dan lepaskan anggota yang tidak lagi terlibat.",
        href: "/projects/members",
        actionLabel: "Buka Anggota Proyek",
        requiredPermissions: ["project_member.read", "project_member.assign"],
        steps: [
          "Pilih proyek pada halaman Anggota Proyek.",
          "Tambahkan karyawan dan tentukan perannya dalam proyek.",
          "Pastikan setiap fungsi penting memiliki penanggung jawab.",
          "Hapus anggota hanya setelah memastikan tidak ada pekerjaan aktif yang masih bergantung padanya.",
        ],
      },
      {
        title: "Menyusun tahapan pekerjaan",
        description:
          "Gunakan tahapan untuk membagi proyek menjadi bagian kerja yang mudah dipantau.",
        href: "/projects/milestones",
        actionLabel: "Buka Tahapan Proyek",
        requiredPermissions: ["milestone.create", "milestone.read_assigned"],
        steps: [
          "Pilih proyek lalu buat tahapan baru.",
          "Gunakan nama yang mudah dipahami, misalnya Analisis, Desain, Pengembangan, dan Serah Terima.",
          "Isi target tanggal dan deskripsi hasil yang harus tercapai.",
          "Perbarui progres tahapan berdasarkan pekerjaan yang benar-benar selesai.",
        ],
      },
      {
        title: "Membagi dan memantau tugas",
        description:
          "Setiap tugas harus memiliki hasil yang jelas, penanggung jawab, prioritas, dan tenggat.",
        href: "/projects/tasks",
        actionLabel: "Buka Tugas",
        requiredPermissions: ["task.create", "task.read_assigned"],
        steps: [
          "Buat tugas pada proyek dan tahapan yang sesuai.",
          "Tulis judul serta deskripsi yang menjelaskan hasil akhir yang diharapkan.",
          "Tetapkan penanggung jawab, prioritas, dan tenggat.",
          "Pantau komentar serta kendala dari anggota tim.",
          "Perbarui status berdasarkan kondisi nyata, bukan sekadar perkiraan.",
        ],
      },
      {
        title: "Memantau tagihan proyek",
        description:
          "Lihat tagihan yang terhubung ke proyek Anda untuk memahami status administrasi pelanggan.",
        href: "/invoices",
        actionLabel: "Lihat Tagihan Proyek",
        requiredPermissions: ["invoice.read_project"],
        steps: [
          "Buka menu Tagihan.",
          "Cari tagihan berdasarkan proyek atau pelanggan.",
          "Periksa nilai, jatuh tempo, dan status pembayaran.",
          "Koordinasikan ketidaksesuaian dengan tim keuangan tanpa mengubah data yang bukan kewenangan Anda.",
        ],
      },
    ],
    reminders: [
      "Project Manager hanya melihat proyek yang ditugaskan kepadanya.",
      "Jangan menugaskan pekerjaan tanpa konteks, hasil akhir, dan tenggat yang jelas.",
      "Catat keputusan penting pada tugas atau proyek agar tidak hanya tersimpan di percakapan pribadi.",
    ],
  },

  developer: {
    slug: "developer",
    label: "Developer",
    eyebrow: "Pelaksanaan teknis",
    summary:
      "Anda berfokus pada proyek dan tugas yang ditugaskan, melaporkan progres, mencatat kendala, serta menjalankan administrasi pribadi.",
    capabilities: [
      "Melihat proyek dan tahapan yang ditugaskan.",
      "Melihat tugas pribadi beserta prioritas dan tenggat.",
      "Menambahkan komentar progres atau kendala pada tugas.",
      "Mengelola profil pribadi, kehadiran, serta izin dan cuti.",
    ],
    workflows: [
      assignedTaskWorkflow,
      {
        title: "Memahami konteks proyek",
        description:
          "Gunakan halaman proyek dan tahapan untuk memahami hubungan tugas Anda dengan target tim.",
        href: "/projects",
        actionLabel: "Buka Proyek",
        requiredPermissions: ["project.read_assigned"],
        steps: [
          "Buka proyek yang ditugaskan kepada Anda.",
          "Baca informasi pelanggan, target, periode, dan status proyek.",
          "Periksa tahapan aktif sebelum mengerjakan tugas.",
          "Konfirmasikan kepada Project Manager bila konteks atau prioritas belum jelas.",
        ],
      },
      attendanceWorkflow,
      leaveWorkflow,
    ],
    reminders: [
      "Tuliskan progres yang dapat diverifikasi, bukan hanya 'sedang dikerjakan'.",
      "Laporkan hambatan lebih awal agar Project Manager dapat mengambil tindakan.",
      "Jangan mengubah data proyek di luar pekerjaan yang ditugaskan.",
    ],
  },

  designer: {
    slug: "designer",
    label: "Designer",
    eyebrow: "Pelaksanaan desain",
    summary:
      "Anda mengerjakan tugas desain pada proyek yang ditugaskan, menyampaikan progres dan revisi melalui komentar, serta mengelola administrasi pribadi.",
    capabilities: [
      "Melihat proyek, tahapan, dan tugas desain yang ditugaskan.",
      "Mencatat progres, versi desain, kebutuhan aset, dan hambatan.",
      "Menjaga informasi revisi tetap terhubung dengan tugas.",
      "Mengelola profil pribadi, kehadiran, serta izin dan cuti.",
    ],
    workflows: [
      assignedTaskWorkflow,
      {
        title: "Mengelola alur revisi desain",
        description:
          "Gunakan komentar tugas agar arahan, progres, dan hasil revisi dapat dilacak oleh tim.",
        href: "/projects/tasks",
        actionLabel: "Buka Tugas Desain",
        requiredPermissions: ["task.read_assigned", "task_comment.create"],
        steps: [
          "Buka tugas desain dan baca kebutuhan serta tenggatnya.",
          "Tulis pertanyaan bila brief, ukuran, konten, atau aset belum lengkap.",
          "Catat progres dan sertakan tautan hasil kerja pada komentar bila diperlukan.",
          "Jelaskan perubahan pada setiap revisi agar riwayat keputusan mudah ditelusuri.",
          "Konfirmasikan hasil akhir sebelum tugas dianggap selesai.",
        ],
      },
      attendanceWorkflow,
      leaveWorkflow,
    ],
    reminders: [
      "Jangan menyimpan keputusan revisi hanya di chat pribadi.",
      "Pastikan tautan atau referensi hasil kerja dapat dibuka anggota proyek.",
      "Laporkan kebutuhan aset sebelum mendekati tenggat.",
    ],
  },

  qa: {
    slug: "qa",
    label: "Quality Assurance",
    eyebrow: "Kontrol kualitas",
    summary:
      "Anda memeriksa hasil kerja pada proyek yang ditugaskan, membuat catatan bug atau tugas tindak lanjut, dan mendokumentasikan hasil pengujian.",
    capabilities: [
      "Melihat proyek, tahapan, dan tugas yang ditugaskan.",
      "Membuat tugas atau catatan bug untuk proyek terkait.",
      "Mendokumentasikan langkah reproduksi dan hasil pengujian.",
      "Mengelola kehadiran serta izin dan cuti pribadi.",
    ],
    workflows: [
      {
        title: "Membuat catatan bug yang dapat ditindaklanjuti",
        description:
          "Bug harus menjelaskan kondisi, langkah reproduksi, hasil aktual, dan hasil yang diharapkan.",
        href: "/projects/tasks",
        actionLabel: "Buka Tugas QA",
        requiredPermissions: ["task.create", "task.read_assigned"],
        steps: [
          "Pilih proyek dan tahapan yang sesuai.",
          "Buat tugas dengan judul yang menjelaskan masalah secara spesifik.",
          "Tuliskan langkah reproduksi, hasil aktual, hasil yang diharapkan, dan lingkungan pengujian.",
          "Tetapkan prioritas berdasarkan dampak masalah, bukan berdasarkan siapa yang melaporkan.",
          "Gunakan komentar untuk mencatat retest dan hasil verifikasi perbaikan.",
        ],
      },
      assignedTaskWorkflow,
      attendanceWorkflow,
      leaveWorkflow,
    ],
    reminders: [
      "Satu tugas sebaiknya mewakili satu masalah utama.",
      "Gunakan data dan langkah reproduksi yang konsisten.",
      "Jangan menutup masalah sebelum hasil perbaikan diverifikasi.",
    ],
  },

  finance: {
    slug: "finance",
    label: "Finance",
    eyebrow: "Operasional keuangan",
    summary:
      "Anda mengelola tagihan, pembayaran, pengeluaran, dashboard keuangan, dan laporan perusahaan berdasarkan transaksi yang valid.",
    capabilities: [
      "Membuat serta memperbarui tagihan pelanggan.",
      "Mencatat dan membatalkan pembayaran sesuai bukti transaksi.",
      "Membuat serta mengajukan pengeluaran.",
      "Melihat dashboard dan laporan keuangan.",
    ],
    workflows: [
      {
        title: "Membuat dan menerbitkan tagihan",
        description:
          "Tagihan harus terhubung dengan pelanggan, proyek, rincian biaya, dan jatuh tempo yang benar.",
        href: "/invoices",
        actionLabel: "Buka Tagihan",
        requiredPermissions: ["invoice.create", "invoice.read_all"],
        steps: [
          "Buka menu Tagihan lalu buat tagihan baru.",
          "Pilih pelanggan dan proyek yang sesuai.",
          "Isi item tagihan, jumlah, harga satuan, diskon, pajak, dan jatuh tempo.",
          "Simpan dan periksa total sebelum mengubah status menjadi diterbitkan.",
          "Pantau status dibayar sebagian, lunas, jatuh tempo, atau dibatalkan.",
        ],
      },
      {
        title: "Mencatat pembayaran pelanggan",
        description:
          "Setiap pembayaran harus mengacu pada tagihan dan bukti transaksi yang valid.",
        href: "/payments",
        actionLabel: "Buka Pembayaran",
        requiredPermissions: ["payment.create", "payment.read_all"],
        steps: [
          "Buka menu Pembayaran lalu klik catat pembayaran.",
          "Pilih tagihan yang dibayar.",
          "Isi nominal, tanggal, metode, nomor referensi, dan catatan bila diperlukan.",
          "Simpan lalu pastikan status tagihan ikut berubah dengan benar.",
          "Gunakan pembatalan hanya bila transaksi memang harus dikoreksi dan memiliki alasan yang jelas.",
        ],
      },
      {
        title: "Mengajukan pengeluaran",
        description:
          "Catat biaya operasional dengan kategori, pemasok, proyek, dan nominal yang dapat diverifikasi.",
        href: "/expenses",
        actionLabel: "Buka Pengeluaran",
        requiredPermissions: ["expense.create", "expense.read_all"],
        steps: [
          "Buka menu Pengeluaran lalu tambah pengeluaran.",
          "Isi nomor, tanggal, kategori, judul, pemasok, proyek bila ada, dan nominal.",
          "Simpan data dan periksa kembali bukti serta keterangannya.",
          "Ajukan pengeluaran agar dapat ditinjau Finance Manager.",
          "Pantau status sampai disetujui, ditolak, atau ditandai dibayar.",
        ],
      },
      {
        title: "Meninjau posisi keuangan",
        description:
          "Gunakan dashboard dan laporan untuk membaca kondisi, bukan untuk menggantikan verifikasi transaksi.",
        href: "/finance",
        actionLabel: "Buka Ringkasan Keuangan",
        requiredPermissions: ["finance.dashboard.read"],
        steps: [
          "Buka Ringkasan Keuangan untuk melihat tagihan, pembayaran, dan pengeluaran.",
          "Periksa transaksi yang belum selesai atau jatuh tempo.",
          "Buka Laporan Manajemen untuk ringkasan lintas modul.",
          "Telusuri data sumber sebelum menyampaikan angka kepada manajemen.",
        ],
      },
    ],
    reminders: [
      "Jangan mencatat pembayaran tanpa referensi transaksi yang dapat diperiksa.",
      "Hindari mengubah status transaksi hanya untuk merapikan laporan.",
      "Pisahkan proses pencatatan, persetujuan, dan pembayaran sesuai kewenangan.",
    ],
  },

  finance_manager: {
    slug: "finance_manager",
    label: "Finance Manager",
    eyebrow: "Pengawasan keuangan",
    summary:
      "Anda menjalankan seluruh fungsi Finance sekaligus meninjau, menyetujui, menolak, menghapus, dan memastikan penyelesaian pengeluaran.",
    capabilities: [
      "Menjalankan seluruh operasional tagihan, pembayaran, dan pengeluaran.",
      "Menyetujui atau menolak pengeluaran yang diajukan.",
      "Menandai pengeluaran yang telah dibayar.",
      "Mengawasi dashboard dan laporan keuangan.",
    ],
    workflows: [
      {
        title: "Membuat dan menerbitkan tagihan",
        description:
          "Tagihan harus terhubung dengan pelanggan, proyek, rincian biaya, dan jatuh tempo yang benar.",
        href: "/invoices",
        actionLabel: "Buka Tagihan",
        requiredPermissions: ["invoice.create", "invoice.read_all"],
        steps: [
          "Buka menu Tagihan lalu buat tagihan baru.",
          "Pilih pelanggan dan proyek yang sesuai.",
          "Isi item tagihan, jumlah, harga satuan, diskon, pajak, dan jatuh tempo.",
          "Simpan dan periksa total sebelum mengubah status menjadi diterbitkan.",
          "Pantau status dibayar sebagian, lunas, jatuh tempo, atau dibatalkan.",
        ],
      },
      {
        title: "Mencatat pembayaran pelanggan",
        description:
          "Setiap pembayaran harus mengacu pada tagihan dan bukti transaksi yang valid.",
        href: "/payments",
        actionLabel: "Buka Pembayaran",
        requiredPermissions: ["payment.create", "payment.read_all"],
        steps: [
          "Buka menu Pembayaran lalu klik catat pembayaran.",
          "Pilih tagihan yang dibayar.",
          "Isi nominal, tanggal, metode, nomor referensi, dan catatan bila diperlukan.",
          "Simpan lalu pastikan status tagihan ikut berubah dengan benar.",
          "Gunakan pembatalan hanya bila transaksi memang harus dikoreksi dan memiliki alasan yang jelas.",
        ],
      },
      {
        title: "Mencatat dan mengajukan pengeluaran",
        description:
          "Catat biaya operasional dengan kategori, pemasok, proyek, dan nominal yang dapat diverifikasi.",
        href: "/expenses",
        actionLabel: "Buka Pengeluaran",
        requiredPermissions: ["expense.create", "expense.read_all"],
        steps: [
          "Buka menu Pengeluaran lalu tambah pengeluaran.",
          "Isi nomor, tanggal, kategori, judul, pemasok, proyek bila ada, dan nominal.",
          "Simpan data dan periksa kembali bukti serta keterangannya.",
          "Ajukan pengeluaran agar masuk ke proses persetujuan.",
          "Pisahkan pencatatan, persetujuan, dan pembayaran bila prosedur perusahaan mewajibkannya.",
        ],
      },
      {
        title: "Meninjau dan memutuskan pengeluaran",
        description:
          "Persetujuan harus didasarkan pada kebutuhan, nominal, bukti, proyek, dan kewenangan anggaran.",
        href: "/expenses",
        actionLabel: "Tinjau Pengeluaran",
        requiredPermissions: ["expense.approve", "expense.reject"],
        steps: [
          "Buka menu Pengeluaran dan fokus pada data berstatus diajukan.",
          "Periksa kategori, deskripsi, pemasok, proyek, nominal, dan catatan.",
          "Setujui bila data valid dan sesuai kebijakan perusahaan.",
          "Tolak bila tidak sesuai dan sampaikan alasan melalui prosedur internal.",
          "Setelah pembayaran benar-benar dilakukan, gunakan aksi Tandai Dibayar.",
        ],
      },
      {
        title: "Mengendalikan transaksi yang perlu dikoreksi",
        description:
          "Pembatalan atau penghapusan hanya dilakukan untuk koreksi yang dapat dipertanggungjawabkan.",
        href: "/payments",
        actionLabel: "Periksa Pembayaran",
        requiredPermissions: ["payment.cancel", "payment.read_all"],
        steps: [
          "Cari transaksi yang perlu dikoreksi.",
          "Cocokkan dengan bukti pembayaran dan tagihan terkait.",
          "Pastikan koreksi tidak menyebabkan nilai tagihan menjadi tidak konsisten.",
          "Batalkan transaksi hanya setelah alasan dan penggantinya jelas.",
          "Periksa kembali ringkasan keuangan setelah koreksi.",
        ],
      },
      {
        title: "Membaca dashboard dan laporan keuangan",
        description:
          "Gunakan ringkasan untuk mendeteksi masalah, kemudian telusuri transaksi sumbernya.",
        href: "/finance",
        actionLabel: "Buka Ringkasan Keuangan",
        requiredPermissions: ["finance.dashboard.read", "report.dashboard.read"],
        steps: [
          "Periksa total tagihan, pembayaran, piutang, dan pengeluaran.",
          "Identifikasi tagihan jatuh tempo atau transaksi belum selesai.",
          "Bandingkan ringkasan dengan daftar transaksi pada modul terkait.",
          "Gunakan hasilnya untuk tindak lanjut, bukan sebagai satu-satunya bukti transaksi.",
        ],
      },
    ],
    reminders: [
      "Hindari menyetujui pengeluaran yang Anda buat sendiri tanpa pemeriksaan tambahan.",
      "Setiap koreksi transaksi harus memiliki alasan yang dapat ditelusuri.",
      "Pastikan status Dibayar hanya digunakan setelah pembayaran benar-benar terjadi.",
    ],
  },

  hr: {
    slug: "hr",
    label: "Human Resources",
    eyebrow: "Pengelolaan SDM",
    summary:
      "Anda mengelola data karyawan, status hubungan kerja, pengajuan izin dan cuti, serta catatan kehadiran seluruh tim.",
    capabilities: [
      "Menambah dan memperbarui profil karyawan.",
      "Menandai karyawan aktif, nonaktif, mengundurkan diri, atau diberhentikan.",
      "Menyetujui atau menolak izin dan cuti.",
      "Memeriksa serta mengoreksi catatan kehadiran.",
    ],
    workflows: [
      {
        title: "Menambah karyawan baru",
        description:
          "Profil karyawan menyimpan identitas kerja dan dapat dihubungkan dengan akun pengguna sistem.",
        href: "/employees",
        actionLabel: "Buka Karyawan",
        requiredPermissions: ["employee.create", "employee.read_all"],
        steps: [
          "Buka menu Karyawan lalu klik Tambah Karyawan.",
          "Isi kode, nama, email, posisi, departemen, jenis kerja, dan tanggal bergabung.",
          "Hubungkan dengan akun pengguna bila akun sudah tersedia.",
          "Lengkapi kontak darurat dan catatan bila diperlukan.",
          "Simpan lalu pastikan status awal dan akun tertaut sudah benar.",
        ],
      },
      {
        title: "Menangani karyawan yang berhenti atau diberhentikan",
        description:
          "Gunakan perubahan status untuk menjaga riwayat kerja; jangan langsung menghapus data tanpa alasan operasional yang valid.",
        href: "/employees",
        actionLabel: "Kelola Status Karyawan",
        requiredPermissions: ["employee.update", "employee.delete"],
        steps: [
          "Cari karyawan lalu buka formulir Ubah Karyawan.",
          "Pilih status Mengundurkan Diri atau Diberhentikan sesuai keputusan resmi.",
          "Isi tanggal berhenti dan catatan yang diperlukan.",
          "Simpan perubahan, lalu koordinasikan penonaktifan akun pengguna dengan administrator.",
          "Gunakan hapus data hanya untuk kebutuhan arsip sistem; data yang terhapus tetap bersifat soft delete dan dapat dipulihkan bila hak akses tersedia.",
        ],
      },
      {
        title: "Meninjau izin dan cuti",
        description:
          "Periksa tanggal, jenis, alasan, serta kondisi operasional sebelum mengambil keputusan.",
        href: "/hr/leave-requests",
        actionLabel: "Tinjau Izin dan Cuti",
        requiredPermissions: ["leave.read_all", "leave.approve", "leave.reject"],
        steps: [
          "Buka menu Izin dan Cuti dan cari pengajuan berstatus diajukan.",
          "Periksa identitas karyawan, jenis cuti, periode, jumlah hari, dan alasan.",
          "Klik Approve bila disetujui.",
          "Bila ditolak, klik Reject, tulis alasan minimal yang jelas, lalu konfirmasi.",
          "Pastikan keputusan disampaikan kepada karyawan melalui prosedur perusahaan.",
        ],
      },
      {
        title: "Memeriksa dan mengoreksi kehadiran",
        description:
          "HR dapat melihat kehadiran seluruh karyawan dan memperbaiki data yang terbukti keliru.",
        href: "/hr/attendance",
        actionLabel: "Buka Kehadiran",
        requiredPermissions: ["attendance.read_all", "attendance.update"],
        steps: [
          "Buka menu Kehadiran dan cari karyawan atau tanggal yang ingin diperiksa.",
          "Cocokkan jam masuk, jam keluar, status, dan catatan.",
          "Klik ubah hanya bila terdapat dasar koreksi yang jelas.",
          "Simpan perubahan dan dokumentasikan alasan koreksi melalui prosedur internal.",
          "Gunakan Ringkasan SDM untuk melihat kondisi kehadiran dan pengajuan secara umum.",
        ],
      },
    ],
    reminders: [
      "Status Diberhentikan pada profil karyawan tidak otomatis menggantikan proses resmi perusahaan.",
      "Penonaktifan profil karyawan dan penangguhan akun pengguna adalah dua tindakan berbeda.",
      "Perubahan data SDM harus berdasarkan dokumen atau keputusan yang dapat dipertanggungjawabkan.",
    ],
  },

  employee: {
    slug: "employee",
    label: "Karyawan",
    eyebrow: "Aktivitas pribadi",
    summary:
      "Anda dapat mengelola data pribadi yang diizinkan, mencatat kehadiran, mengajukan izin atau cuti, dan melihat tugas yang diberikan.",
    capabilities: [
      "Melihat serta memperbarui bagian tertentu dari profil pribadi.",
      "Melakukan Clock In dan Clock Out.",
      "Membuat, mengirim, memantau, dan membatalkan pengajuan izin atau cuti sesuai statusnya.",
      "Melihat tugas yang ditugaskan dan menambahkan komentar progres.",
    ],
    workflows: [
      attendanceWorkflow,
      leaveWorkflow,
      assignedTaskWorkflow,
      {
        title: "Memperbarui profil pribadi",
        description:
          "Perbarui hanya data pribadi yang memang dapat Anda ubah, seperti kontak dan alamat.",
        href: "/employees",
        actionLabel: "Buka Profil Karyawan",
        requiredPermissions: ["employee.read_own", "employee.update_own"],
        steps: [
          "Buka menu Karyawan. Akun karyawan hanya akan melihat profil sendiri.",
          "Buka aksi ubah pada profil Anda.",
          "Perbarui nomor telepon, alamat, kontak darurat, atau catatan yang diizinkan.",
          "Unggah foto baru bila diperlukan.",
          "Simpan dan periksa kembali hasil perubahan.",
        ],
      },
    ],
    reminders: [
      "Clock Out hanya dapat dilakukan setelah Clock In pada hari yang sama.",
      "Draf cuti belum masuk ke proses persetujuan sampai Anda menekan Submit.",
      "Hubungi atasan atau HR bila tombol yang dibutuhkan tidak tersedia pada akun Anda.",
    ],
  },
};

export function getRoleGuide(roleSlug: string): RoleGuide {
  const knownGuide = ROLE_GUIDES[roleSlug];

  if (knownGuide) {
    return knownGuide;
  }

  const label = roleSlug
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    slug: roleSlug,
    label: label || "Peran Tambahan",
    eyebrow: "Akses khusus",
    summary:
      "Peran ini dibuat khusus oleh administrator. Menu dan tindakan yang tersedia mengikuti hak akses yang diberikan pada akun Anda.",
    capabilities: [
      "Melihat menu yang diizinkan oleh administrator.",
      "Menjalankan tindakan yang tersedia pada setiap halaman.",
      "Menggunakan dashboard sebagai titik awal untuk memahami pekerjaan.",
    ],
    workflows: [
      {
        title: "Memahami akses peran khusus",
        description:
          "Gunakan menu yang terlihat pada sidebar sebagai daftar fungsi yang tersedia untuk akun Anda.",
        href: "/dashboard",
        actionLabel: "Kembali ke Dashboard",
        steps: [
          "Buka Dashboard untuk melihat ringkasan yang tersedia.",
          "Periksa menu pada sidebar; menu yang tidak diizinkan tidak akan ditampilkan.",
          "Buka modul yang relevan dan ikuti tombol tindakan yang tersedia.",
          "Hubungi administrator bila tanggung jawab Anda tidak sesuai dengan akses yang diberikan.",
        ],
      },
    ],
    reminders: [
      "Peran khusus dapat berbeda dari peran standar pada panduan ini.",
      "Administrator dapat mengubah hak akses tanpa mengubah nama peran.",
    ],
  };
}
