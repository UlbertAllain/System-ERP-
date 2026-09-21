# ENGINEERING_STANDARD.md

## Core Principles

Gunakan Clean Code, Separation of Concerns, Single Responsibility, DRY, KISS, YAGNI, modular architecture, consistent naming, validation, error handling, security, dan testing.

Hindari overengineering.

## Code Structure

Satu file harus memiliki responsibility yang jelas. Business logic tidak bercampur dengan UI dan persistence tidak tersebar.

## TypeScript

- strict TypeScript tetap aktif.
- Prefer `unknown` daripada `any`.
- Gunakan narrowing dan explicit domain types.
- Letakkan type dekat module jika tidak benar-benar global.
- Jangan memakai `any` hanya untuk menghilangkan error.

## Naming

- variable/function: camelCase
- type/class: PascalCase
- constant: UPPER_SNAKE_CASE
- file: kebab-case sesuai convention repository

Nama harus menjelaskan intent.

## Service

Service menangani business rule dan orchestration. Service tidak seharusnya berisi detail query Firestore yang dapat dipisahkan ke repository.

## Repository

Repository menangani persistence:
- query;
- create/update;
- lookup;
- pagination;
- mapping persistence bila diperlukan.

Repository tidak menentukan business decision.

## Validation

Semua external input wajib runtime validation: form, request body, route/query param, upload, environment variable, dan external response jika relevan.

## Authentication & Authorization

Authentication menjawab siapa user. Authorization menjawab tindakan apa yang boleh dilakukan. Backend authoritative.

## Firestore

Review:
- query count dan read cost;
- indexes;
- transaction/batch;
- ownership;
- concurrent update;
- delete strategy;
- denormalization.

Hindari membaca seluruh collection lalu memfilter di memory untuk jalur yang akan tumbuh besar apabila query server-side yang terindeks dapat digunakan.

## Cloudinary

Upload harus memvalidasi intent, folder, MIME, size, format, dan authorization. Jangan simpan binary image di Firestore.

## Error Handling

Jangan expose stack trace, raw Firebase error, credential, atau detail infrastructure ke client. Gunakan application error yang meaningful.

## Security Baseline

Review authentication, authorization, Security Rules, validation, XSS, CSRF jika relevan, CORS, rate limiting, file upload, secret management, dan dependency vulnerabilities.

## Environment Variables

Pisahkan client-safe env dan server-only env. Jangan commit Firebase Admin credential, Cloudinary API secret, private key, password, atau token.

## Testing Priority

1. business rule;
2. authorization;
3. financial transaction;
4. idempotency/reversal;
5. critical service/repository;
6. edge case;
7. regression-prone logic.

Coverage 100% bukan tujuan.

## Quality Gate

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run check` harus merepresentasikan quality gate repository.

## Refactoring

Refactor hanya jika memperjelas responsibility, mengurangi dangerous duplication, meningkatkan testability/security, mengurangi architecture leakage, atau memperbaiki query/cost.

Jangan mengubah code hanya agar terlihat berbeda.
