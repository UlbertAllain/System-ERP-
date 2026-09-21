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

## Active Structure

Repository menggunakan pembagian tanggung jawab berikut:

```text
app/          framework routing, layouts, pages, route handlers
features/     use-case orchestration, actions, services, repositories, feature UI
modules/      pure domain rules and document/domain mappers
types/        shared domain contracts used across routes/features/modules
lib/          infrastructure and cross-cutting implementation
components/   reusable global UI
tests/        business/domain regression tests
```

Struktur ini dianggap valid dan stabil. Tidak ada target untuk memindahkan seluruh repository ke `src/` atau menyatukan `features/`, `modules/`, dan `types/` hanya demi keseragaman folder.

Perubahan struktur harus memberi manfaat konkret: boundary lebih jelas, coupling berkurang, security meningkat, atau maintainability membaik.

## Feature Convention

Feature yang memiliki persistence mengikuti pola:

```text
features/<domain>/
├── actions/
├── services/
├── repositories/
├── schemas/
└── components/
```

Tidak semua folder wajib ada.

- actions: server boundary dan transport-facing orchestration;
- services: business use case dan authorization-aware orchestration;
- repositories: Firestore/query/persistence detail;
- schemas: runtime validation;
- components: domain-specific UI.

## Domain Modules

`modules/` hanya dipakai untuk logic domain yang murni atau reusable dan tidak bergantung pada React, Next.js routing, request context, atau persistence bootstrap.

Contoh saat ini:

```text
modules/finance/
├── domain/
├── expenses/
├── invoices/
└── payments/

modules/projects/
├── milestones/
├── projects/
└── tasks/
```

Isi yang tepat untuk `modules/`:
- state transition rules;
- financial/domain invariants;
- pure calculation;
- mapper yang tidak melakukan I/O.

Jangan memindahkan service/repository ke `modules/` hanya supaya semua domain terlihat seragam.

## Shared Types

Root `types/` tetap dipakai untuk contract yang digunakan lintas feature/module/page.

Type hanya dipindahkan ke feature lokal bila benar-benar private terhadap feature tersebut. Hindari duplikasi type hanya untuk mengikuti folder convention.

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

Mutation transaction tidak boleh dipindahkan ke repository secara mekanis bila perubahan tersebut membuat business rule atau atomicity menjadi kurang jelas.

## Read Models

Dashboard dan report tidak boleh berkembang menjadi full-collection scan.

Untuk jalur read-heavy:
1. gunakan indexed query bila cukup;
2. gunakan dedicated repository/read model;
3. gunakan maintained summary/materialized read model bila volume membenarkan.

Read optimization tidak boleh mengubah business semantics hanya demi mengurangi document read.

## UI Composition

Client component besar harus dipecah berdasarkan responsibility, bukan sekadar jumlah baris.

Contoh boundary yang baik:
- filter/search panel;
- table/list presentation;
- dialog workflow;
- form section yang kompleks.

Parent component sebaiknya mempertahankan orchestration dan state yang memang menghubungkan beberapa child.

## Architecture Decision Rule

Developer baru harus dapat menebak:

```text
Server boundary        → features/*/actions
Business orchestration → features/*/services
Firestore access       → features/*/repositories
Pure domain rules      → modules/*
Validation             → features/*/schemas
Firebase bootstrap     → lib/firebase
Cloudinary             → lib/cloudinary
Reusable global UI     → components
Shared contracts       → types
```

Jika satu capability memerlukan pencarian di terlalu banyak root folder, boundary tersebut menjadi kandidat refactor. Refactor dilakukan incremental dan setiap phase wajib melewati quality gate.

## Status

Architecture: Modular Monolith  
Structure: Feature-Oriented + Pure Domain Modules  
Persistence: Firestore server-side through repositories  
Image Handling: Cloudinary  
Migration Strategy: Incremental, benefit-driven  
Status: STABLE
