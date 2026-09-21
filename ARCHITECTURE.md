# ARCHITECTURE.md

## Architecture

Nexty Labs ERP menggunakan modular monolith berbasis Next.js App Router, TypeScript, Firebase Authentication, Firestore melalui Firebase Admin SDK, Cloudinary, dan Zod.

Target dependency flow:

```text
UI / Page
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
Firestore / External Infrastructure
```

## Current Status

Repository sedang dalam migration incremental dari struktur campuran:

```text
app/
features/
modules/
types/
lib/
components/
```

menuju struktur domain-oriented yang lebih predictable.

Jangan melakukan big-bang move seluruh repository. Domain dipindahkan bertahap dan setiap phase wajib melewati quality gate.

## Target Structure

```text
src/
├── app/
├── modules/
│   ├── auth/
│   ├── audit-logs/
│   ├── clients/
│   ├── employees/
│   ├── finance/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── expenses/
│   │   └── dashboard/
│   ├── hr/
│   ├── projects/
│   ├── reports/
│   ├── roles/
│   ├── settings/
│   └── users/
├── components/
│   ├── ui/
│   └── shared/
├── lib/
│   ├── firebase/
│   └── cloudinary/
├── shared/
├── constants/
└── config/
```

Folder hanya dibuat ketika diperlukan.

## Module Convention

Contoh:

```text
modules/clients/
├── client.service.ts
├── client.repository.ts
├── client.schema.ts
├── client.types.ts
└── components/
```

- service: business logic/orchestration;
- repository: persistence/query;
- schema: runtime validation;
- types: module model;
- components: domain-specific UI.

## Current Transitional Rules

Sampai migration selesai:
- existing `features/*/actions` tetap menjadi server boundary;
- existing `features/*/services` boleh dipertahankan selama domain belum dimigrasikan;
- domain baru tidak boleh memperluas architecture leakage;
- repository layer diperkenalkan domain-by-domain;
- `types/` hanya dipindahkan ketika module pemiliknya dimigrasikan;
- `app/` tetap tipis dan tidak boleh mengakses Firestore langsung.

## Infrastructure

`lib/firebase/` adalah satu-satunya tempat bootstrap Firebase. Business data memakai Firebase Admin SDK di server. Firestore Security Rules menolak browser read/write untuk business collections.

`lib/cloudinary/` menangani integrasi Cloudinary. Upload protected melewati authenticated/authorized server route.

## Financial Domain

Invoice, payment, dan expense adalah critical domain. Refactor wajib mempertahankan:
- transaction/batch semantics;
- audit trail;
- payment idempotency;
- reversal workflow;
- state transition guard;
- money normalization;
- regression test.

## Read Models

Dashboard dan report tidak boleh berkembang menjadi full-collection scan. Untuk jalur read-heavy, prefer indexed query, dedicated repository/query object, atau maintained summary/read model bila volume membenarkan.

## Architecture Decision Rule

Developer baru harus dapat menebak:

```text
Business logic        → module service/domain
Firestore access      → repository
Validation            → schema
Firebase bootstrap    → lib/firebase
Cloudinary            → lib/cloudinary
Reusable global UI    → components
Cross-domain concern  → shared
```

Jika satu capability memerlukan pencarian di terlalu banyak root folder, boundary tersebut menjadi kandidat migration.

## Status

Architecture: Modular Monolith  
Migration: Incremental  
Persistence: Firestore server-side  
Image Handling: Cloudinary  
Status: STABLE WITH ACTIVE STRUCTURAL CLEANUP
