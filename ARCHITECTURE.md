# ARCHITECTURE.md

## Architecture

Nexty Labs ERP menggunakan modular monolith berbasis Next.js App Router, TypeScript, Firebase Authentication, Firestore melalui Firebase Admin SDK, Cloudinary, dan Zod.

Dependency flow utama:

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

## Active Structure

```text
src/
├── app/                  framework routing, layouts, pages, route handlers
├── components/           reusable global UI and dashboard shell
├── modules/              business/domain capabilities
├── lib/                  infrastructure and cross-cutting implementation
├── constants/            app configuration, permission, role constants
└── types/                shared contracts used across modules

tests/                    business/domain regression tests
scripts/                  seed and migration utilities
docs/                     migration and release documentation
```

Source code tidak ditempatkan di root repository. Root dipakai untuk project configuration, documentation, scripts, dan tests.

## Module Convention

Setiap capability berada di `src/modules/<domain>/`.

Contoh:

```text
src/modules/projects/
├── actions/
├── components/
├── repositories/
├── schemas/
├── services/
├── milestones/
├── projects/
└── tasks/
```

Tidak semua subfolder wajib ada.

- `actions/`: server boundary dan request-facing orchestration.
- `components/`: domain-specific UI.
- `repositories/`: Firestore query/persistence boundary.
- `schemas/`: runtime validation.
- `services/`: business use case dan orchestration.
- pure domain folders: state transition, calculation, mapper, dan invariant tanpa I/O.

Pure domain logic tetap dekat dengan capability-nya; tidak dibuat root abstraction baru hanya demi simetri.

## Shared Types

`src/types/` dipakai untuk contract yang benar-benar digunakan lintas module/page.

Type yang hanya digunakan satu module sebaiknya tetap dekat dengan module tersebut jika pemindahan memberi manfaat nyata. Hindari duplikasi type hanya demi mengikuti pola folder.

## Infrastructure

`src/lib/firebase/` adalah bootstrap Firebase. Business data memakai Firebase Admin SDK di server.

`src/lib/cloudinary/` menangani Cloudinary.

Cross-cutting auth, permission, error, audit, money, UI helper, dan utility lain tetap berada di `src/lib/` selama responsibility-nya jelas dan lintas domain.

## Financial Domain

Invoice, payment, dan expense adalah critical domain. Refactor wajib mempertahankan:
- transaction/batch semantics;
- audit trail;
- payment idempotency;
- reversal workflow;
- state transition guard;
- money normalization;
- regression test.

Mutation transaction tidak dipindahkan secara mekanis bila perubahan tersebut membuat business rule atau atomicity menjadi kurang jelas.

## Read Models

Dashboard dan report tidak boleh berkembang menjadi full-collection scan.

Untuk jalur read-heavy:
1. gunakan indexed query bila cukup;
2. gunakan dedicated repository/read model;
3. gunakan maintained summary/materialized read model bila volume membenarkan.

Optimization tidak boleh mengubah business semantics hanya demi mengurangi document read.

## UI Composition

Client component besar dipecah berdasarkan responsibility, bukan sekadar jumlah baris.

Boundary yang valid:
- filter/search panel;
- table/list presentation;
- dialog workflow;
- form section yang kompleks.

Parent component mempertahankan orchestration dan state yang memang menghubungkan beberapa child.

## Architecture Decision Rule

Developer baru harus dapat menebak:

```text
Server boundary        → src/modules/*/actions
Business orchestration → src/modules/*/services
Firestore access       → src/modules/*/repositories
Validation             → src/modules/*/schemas
Domain-specific UI     → src/modules/*/components
Pure domain rules      → src/modules/<domain>/*
Firebase bootstrap     → src/lib/firebase
Cloudinary             → src/lib/cloudinary
Reusable global UI     → src/components
Shared contracts       → src/types
Permission constants   → src/constants
```

Jangan menambah root source folder baru tanpa alasan arsitektural yang jelas.

## Status

Architecture: Modular Monolith  
Structure: Source under `src/`, Domain-Oriented Modules  
Persistence: Firestore server-side through repositories  
Image Handling: Cloudinary  
Migration Strategy: Incremental, benefit-driven  
Status: STABLE
