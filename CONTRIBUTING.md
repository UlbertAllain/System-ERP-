# Contribution Guide

## Boundary

- `src/app/`: composition dan routing saja.
- `src/modules/*/actions`: validasi request, permission guard, dan response mapping.
- `src/modules/*/services`: use case dan orchestration bisnis.
- `src/modules/*/repositories`: persistence/query Firestore.
- `src/modules/*/schemas`: runtime validation.
- `src/modules/*/components`: domain-specific UI.
- `src/lib/*`: infrastructure dan cross-cutting helper.
- `src/components/*`: reusable global UI.
- Komponen React tidak boleh melakukan mutation Firestore langsung.

## Mutation kritis

Mutation finance, project identity, user access, dan approval wajib:

1. Memvalidasi state terbaru di dalam transaction.
2. Menulis audit dalam transaction/batch yang sama.
3. Mempunyai idempotency atau uniqueness lock bila request dapat diulang.
4. Tidak hard-delete ledger finansial.
5. Menambahkan regression test untuk rule domain.

## Permission

- Tambahkan permission di `src/constants/permissions/permissions.ts`.
- Hubungkan ke role di `src/constants/permissions/roles.ts`.
- Guard page dan action secara terpisah.
- Jangan menggunakan `permissionsCache` sebagai authorization source.

## Quality gate

```bash
npm run check
```

Pull request tidak boleh digabung bila lint, typecheck, test, build, atau dependency security threshold gagal.
