# Audit Report — Revisi PRD v2.0 → v3.0

**Dokumen:** `Du_Anyam_PM_OS_Master_PRD_v3.0.md` (2.840 baris, 40 bagian + 3 appendix)
**Tanggal:** 11 September 2026

---

## PRD REVISION STATUS

**PASS**

Seluruh instruksi revisi terpenuhi: n8n keluar dari runtime, frontend foundation jadi Phase 1, 14 phase dengan struktur 25 heading, 154 requirement ber-ID, traceability matrix di-regenerate, tidak ada referensi usang ke penomoran lama, tidak ada dependency aktif ke n8n.

---

## Major Changes

1. **n8n dihapus dari runtime (AD-15).** Semua tanggung jawab lamanya sekarang milik aplikasi: route handler menerima, `webhook_events` jadi retry queue (AD-16), `/api/jobs/[job]` + advisory lock menjalankan job terjadwal, integration layer mengirim keluar. n8n tinggal di §21.5 sebagai *Future / Optional Orchestration Layer* yang, kalau pun dipakai, berdiri **di depan** endpoint yang sama — bukan di dalamnya.
2. **§21 ditulis ulang total** — dari "n8n Architecture" jadi "Background Jobs, Scheduling & Retry Architecture": katalog 9 job (`JOB-*`), execution contract, retry queue dengan backoff dan `SKIP LOCKED`, outbound delivery, dan bagian kompatibilitas n8n masa depan.
3. **Phase 1 = UI/UX Foundation** — design tokens, ~20 komponen operasional, 5 state component, shell, dan skeleton 12 route dengan *unactivated state* yang jujur. Auth pindah ke Phase 2 dan membungkus shell yang sudah ada. §13.4 (inventaris design system) dan §13.5 (progressive activation map) ditambahkan sebagai aturan mengikat.
4. **Aturan "tidak ada data palsu"** jadi requirement eksplisit (FR-1.8, standing rule #15, phase gate). Data ilustratif hanya boleh ada di `/dev/gallery` yang env-gated.
5. **Skema diperluas seperlunya:** `webhook_events` + `attempts/next_retry_at/locked_at`; `integration_runs` + `job_key` (satu log untuk sync dan job — bukan dua tabel kembar); `alerts` + `notification_status/attempts`; `reports` dengan trigger immutability di level database. Tidak ada tabel baru.
6. **Penandatanganan request dipindah ke sisi server sumber** (Apps Script backend), bukan browser — ini konsekuensi hilangnya n8n sebagai relay yang sebelumnya menyembunyikan secret. Jalur alternatif per-source token didokumentasikan untuk gateway yang tidak bisa menandatangani.
7. **Scheduler = Vercel Cron** sebagai trigger tipis yang bisa diganti (GitHub Actions / `pg_cron` / n8n) tanpa perubahan kode. Kecukupan cadence plan hosting jadi precondition A10 dan Open Question #9.
8. **Job hanya jalan di production** (`JOBS_ENABLED`) — mencegah dua environment menarik akun Meta yang sama atau menjawab webhook HubSpot yang sama.

---

## Final Architecture (runtime saat ini)

```
Landing page (GAS) · WhatsApp gateway · HubSpot webhook · Meta API · Vercel Cron
        ▼ signed HTTPS / bearer
Next.js Route Handlers   /api/ingest/lead · /api/ingest/hubspot · /api/jobs/[job]
        ▼
Integration layer        hubspot/ · meta/ · slack/  (satu-satunya yang bicara ke luar)
        ▼
Service layer            leads · crm-sync · alerts · reports · jobs
        ▼
Domain layer             qualification · metrics · rules · attribution · dates  (tanpa I/O)
        ▼
Repository layer         satu-satunya yang bicara ke Supabase
        ▼
Supabase Postgres + Auth
```

Dua managed service, tiga endpoint publik, nol komponen self-hosted. Semua business logic di `domain/`, di repo ini, di bawah test.

---

## New Phase Structure

| Phase | Nama | Mengaktifkan | Kategori |
|---|---|---|---|
| 0 | Project Foundation & Architecture | — | MVP Core |
| 1 | UI/UX Foundation & Application Shell | semua route (visual) | MVP Core |
| 2 | Authentication & Security Foundation | `/login`, `/settings` | MVP Core |
| 3 | Today / Daily Workflow OS | `/today`, `/workflows` | MVP Core |
| 4 | Playbook & SOP | `/playbook` | MVP Core |
| 5 | Experiment OS | `/experiments` | MVP Core |
| 6 | Lead & Funnel Core | `/leads`, `/leads/[id]`, `/funnel` | MVP Core |
| 7 | Integration & Background Job Foundation | `/integrations` | MVP Integration |
| 8 | HubSpot CRM Integration | `/integrations/hubspot` | MVP Integration |
| 9 | Alerts & Slack | `/today` alerts | MVP Integration |
| 10 | Meta Ads & Performance | `/performance` | MVP Integration |
| 11 | Decision Engine & Today v2 | `/today` priority actions | Post-MVP |
| 12 | Reporting | `/reports` | Post-MVP |
| 13 | Production Hardening | `/integrations` lengkap | Post-MVP |

Setiap phase punya 25 heading tetap; kategori yang tidak relevan ditulis "Not applicable in this phase" (contoh: Data Model Changes di Phase 1, Integration Tasks di Phase 6 — sengaja, domain harus benar sebelum transport ada).

---

## Frontend Strategy

**Frontend Foundation First → Full-Stack Vertical Slices Later.**

Phase 1 membangun *sistem* frontend: token, komponen, state, shell, dan skeleton semua route. Setiap phase berikutnya mengaktifkan satu route sebagai slice utuh — migration → domain → repository → service → UI → test — di dalam shell yang sudah ada. Fitur tidak boleh bikin card/table/badge sendiri; kalau pola belum ada, pola ditambahkan ke design system dulu (standing rule #14).

Route yang belum aktif menampilkan `EmptyState` / `NotConnectedState` yang menyebut phase mana yang mengisinya — tidak pernah angka yang terlihat masuk akal. Peta aktivasi lengkap ada di §13.5.

---

## n8n Strategy

- **Bukan bagian MVP runtime.** Tidak ada satu pun phase, FR, task, test, atau acceptance criteria yang bergantung padanya.
- **Tidak ada dependency aktif.** Pencarian "n8n" di dokumen final: 16 kemuncul, semuanya di konteks historis (changelog, §1.1), §21.5 (Future/Optional), roadmap, atau NFR-G11 (portabilitas scheduler).
- **Optional future orchestration layer** — §21.5 mendefinisikan kapan n8n layak dipakai, di mana posisinya (di depan `/api/ingest/*` dan `/api/jobs/*`), dan 5 constraint mengikat kalau diadopsi.
- **Business logic tetap milik PM OS** — AD-04 diperkuat: menghapus semua sistem eksternal kecuali Supabase harus meninggalkan semua rule utuh dan semua test lulus.
- Tidak ada platform automasi lain yang menggantikan n8n di MVP.

---

## Dependency Audit

Sebelas aturan diverifikasi (§35.3). Koreksi terhadap v2.0:

| Koreksi | Alasan |
|---|---|
| UI foundation dipisah jadi Phase 1 sendiri, sebelum auth | v2.0 menumpuk shell ke dalam phase auth; tanpa design system yang mapan, tiap fitur mengarang komponennya sendiri |
| Auth di Phase 2 membungkus shell yang sudah ada | Menghindari membangun shell dua kali |
| Phase 6 (Lead & Funnel) tetap sebelum Phase 8 (HubSpot) | Sync ke skema yang belum terbukti = rewrite terselubung |
| Phase 7 (Integration & Job Foundation) sebelum HubSpot dan Meta | Kalau tidak, HubSpot dan Meta masing-masing bikin signature/retry/logging sendiri dan pasti berbeda |
| Alert domain dibangun sebelum Slack transport (dalam Phase 9) | Mencegah model alert berbentuk Slack yang tidak bisa ditampilkan in-app |
| Phase 10 (data spend) sebelum Phase 11 (rules) | Rule tanpa spend tidak punya apa-apa untuk dievaluasi |
| Reporting (12) setelah 3, 5, 6, 10, 11 | Report adalah assembly, tidak boleh menghitung apa pun yang baru |
| Self-check scheduler ditambahkan di Phase 9 | Tanpa n8n error trigger, scheduler yang diam-diam berhenti harus dideteksi dari dalam |

---

## MVP Boundary

**MVP Core (Phase 0–6)** — berguna setiap hari tanpa satu integrasi pun: foundation, design system + skeleton, auth + RLS, checklist harian, playbook, eksperimen, model lead/contact/company/deal dengan entry manual + CSV import, qualification engine, funnel cohort/activity.

**MVP Integration (Phase 7–10)** — rilis terintegrasi pertama: ingest bertanda tangan + retry queue + scheduled jobs + integration health, HubSpot sync, alert domain + Slack, Meta Ads + performance.

**Post-MVP (Phase 11–13)** — decision engine + priority actions, weekly reporting, production hardening.

Yang **tidak** masuk MVP: AI copilot, multi-touch attribution, Google/TikTok/LinkedIn Ads, Slack interaktif, predictive analytics, autonomous optimization, creative intelligence, n8n.

---

## Traceability

- **154 FR** (naik dari 138 — Phase 1 menyumbang 12 FR baru, Phase 7 bertambah 3 untuk retry/job, Phase 9 dan 12 masing-masing +1).
- Semua ID FR, NFR, BE, FE, INT, JOB, TEST di-renumber mengikuti phase baru. Prefix `JOB-` menggantikan `AUT-`.
- Matrix §36 di-regenerate dari nol; 154 baris, setiap FR terpetakan ke komponen dan test.
- Verifikasi otomatis: 0 referensi `/api/cron`, 0 referensi `WF-*`, 0 referensi penomoran phase lama di luar bagian phase; jumlah baris `| FR-` = 308 = 154 × 2 (tabel phase + matrix).

---

## Remaining Open Questions

Sembilan, hanya yang butuh keputusan bisnis (Appendix B). Tiga yang memblokir:

1. **Target CPQL** — memblokir Phase 11.
2. **Kepemilikan Closed Won/Lost** — precondition A3; tanpanya revenue/ROAS disupresi oleh `R-09`.
3. **Kecukupan plan scheduler** untuk job 5 dan 10 menit (baru, #9) — memblokir Phase 7; pertanyaan biaya, bukan desain, karena fallback sudah didokumentasikan.

Sisanya: connector pertama Meta vs Google, kepemilikan SQL, SLA stale lead, write-back lifecycle, format laporan, horizon user kedua, retensi PII.

---

## Readiness Score

| Kategori | Skor | Catatan |
|---|---|---|
| Product clarity | **9,5** | — |
| Architecture clarity | **9,5** | Satu repo, satu domain layer, tiga endpoint publik |
| Frontend readiness | **9,5** | Inventaris komponen, status vocabulary, activation map, aturan no-fake-data |
| Backend readiness | **9,5** | Job contract, retry queue, error taxonomy, layering rule yang bisa ditegakkan |
| Database design | **9,5** | Tanpa tabel baru di v3; ekstensi kolom minimal; immutability di DB |
| Integration readiness | **9** | Kontrak lengkap. **Tersisa:** bentuk payload gateway WhatsApp dan apakah ia bisa menandatangani (A9) belum bisa difinalkan sampai vendor diputuskan |
| Security | **9** | **Tersisa:** hardening hanya "terspesifikasi" sampai drill Phase 13 dieksekusi; penandatanganan di Apps Script adalah pekerjaan pihak lain (A8) |
| Testing | **9** | **Tersisa:** fixture HubSpot/Meta hanya bisa direkam dari response asli di Phase 8 dan 10 |
| Phase clarity | **9,5** | 25 heading seragam, "Not applicable" eksplisit, gate per phase |
| MVP discipline | **10** | Core 0–6 tanpa integrasi; tidak ada item terlarang yang masuk |
| Future extensibility | **9,5** | Scheduler bisa ditukar, n8n bisa masuk tanpa rewrite, connector = adapter + satu job |
| Claude Code / Codex readiness | **9,5** | "Implement Phase X only" bisa dijalankan tanpa menebak |

**Rata-rata: 9,4 / 10.** Tiga kategori di angka 9 turun karena alasan yang sama dan tidak bisa dinaikkan di atas kertas: butuh kontak dengan sistem nyata dan keputusan pihak eksternal.
