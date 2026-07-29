# Contribution Guide

## Boundary

- `app/`: composition dan routing saja.
- `features/*/actions`: validasi request, permission guard, dan response mapping.
- `features/*/services`: use case dan orchestration bisnis.
- `modules/*`: pure domain rule dan mapper.
- `lib/*`: infrastructure/shared helper yang dipakai lintas domain.
- Komponen React tidak boleh melakukan mutation Firestore langsung.

## Mutation kritis

Mutation finance, project identity, user access, dan approval wajib:

1. Memvalidasi state terbaru di dalam transaction.
2. Menulis audit dalam transaction/batch yang sama.
3. Mempunyai idempotency atau uniqueness lock bila request dapat diulang.
4. Tidak hard-delete ledger finansial.
5. Menambahkan regression test untuk rule domain.

## Permission

- Tambahkan permission di `constants/permissions/permissions.ts`.
- Hubungkan ke role di `constants/permissions/roles.ts`.
- Guard page dan action secara terpisah.
- Jangan menggunakan `permissionsCache` sebagai authorization source.

## Quality gate

```bash
npm run check
```

Pull request tidak boleh digabung bila lint, typecheck, test, atau build gagal.
