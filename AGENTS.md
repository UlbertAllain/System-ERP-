# AGENTS.md

## Purpose

Aturan kerja wajib untuk developer dan AI yang mengubah repository Nexty Labs ERP.

Source of truth:
- `AGENTS.md`
- `ARCHITECTURE.md`
- `ENGINEERING_STANDARD.md`

Jangan memperkenalkan pola arsitektur baru tanpa alasan dan migration plan yang jelas.

## Mandatory Stack

- Next.js + TypeScript
- Firebase Authentication
- Cloud Firestore melalui trusted server boundary
- Firebase Admin SDK untuk business data
- Cloudinary untuk image handling
- Zod untuk runtime validation

## Engineering Goals

Code harus clean, structured, predictable, maintainable, secure, testable, modular, dan scalable seperlunya. Gunakan solusi paling sederhana yang tetap benar.

## Before Coding

Sebelum implementasi:
1. Pahami requirement dan business rule.
2. Baca `ARCHITECTURE.md`.
3. Tentukan data flow dan Firestore impact.
4. Tentukan authentication dan authorization.
5. Tentukan module/file yang terdampak.
6. Review edge case dan security concern.
7. List perubahan dengan `CREATE`, `UPDATE`, atau `DELETE`.
8. Baru implementasi.

## Request Flow

```text
Page / Client
↓
Server Action / Route Handler
↓
Authentication
↓
Authorization
↓
Validation
↓
Service
↓
Repository
↓
Firestore
```

Protected business operation tidak boleh langsung dari UI ke Firestore.

## Responsibilities

- `app/`: routing, page, layout, API/route handler, framework boundary.
- `features/`: struktur legacy/transitional. Jangan menambah domain baru di sini tanpa migration plan.
- `modules/`: target home untuk domain/business capability.
- `components/`: reusable UI lintas domain.
- `lib/`: infrastructure/external integration seperti Firebase dan Cloudinary.
- `shared/`: cross-domain concern seperti error, permission, validation, security.
- repository: persistence/query Firestore.
- service: business decision dan orchestration.
- schema: runtime validation.
- types: utamakan module-local type.

## ERP Safety Rules

- Financial mutation wajib mempertahankan transaction, audit trail, idempotency, dan regression test yang relevan.
- Permission backend authoritative; frontend permission hanya UX.
- Jangan membuka Firestore client access untuk business data.
- Jangan menghapus payment history untuk koreksi; gunakan reversal sesuai business rule existing.
- Jangan memindahkan logic antar layer sekaligus dengan mengubah behavior bisnis kecuali memang diperlukan.

## Refactoring Rules

Refactor harus incremental. Untuk migration struktur:
1. pindahkan satu domain/capability;
2. perbaiki import;
3. jalankan quality gate;
4. baru lanjut domain berikutnya.

Jangan membuat folder kosong atau abstraction yang belum diperlukan.

## Verification

Sebelum perubahan dianggap selesai:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Atau:

```bash
npm run check
```

## Definition of Done

- Requirement terpenuhi.
- Business rule tidak berubah tanpa alasan eksplisit.
- Runtime validation ada pada external input.
- Authentication dan authorization tetap authoritative.
- Firestore access terkontrol.
- Error handling konsisten.
- Tidak ada secret yang ter-commit.
- Test relevan pass.
- Typecheck, lint, dan build pass.
- Diff tidak membawa unrelated change.
