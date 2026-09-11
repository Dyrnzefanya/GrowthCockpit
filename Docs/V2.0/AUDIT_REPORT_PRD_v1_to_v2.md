# Audit Report — Du Anyam Performance Marketing OS PRD

**Dokumen yang diaudit:** PRD & Technical Blueprint v1.0 (September 2026, 24 bagian)
**Hasil:** PRD v2.0 — `Du_Anyam_PM_OS_Master_PRD_v2.0.md`
**Tanggal audit:** 11 September 2026

---

## 1. Ringkasan penilaian

v1.0 adalah **outline strategis yang kuat** tetapi **belum bisa diimplementasikan tanpa menebak**. Arah produknya benar: manual-first, HubSpot sebagai source of truth, rule-based sebelum AI. Yang belum ada adalah lapisan yang membuat dokumen bisa dieksekusi coding agent: requirement ID yang testable, semantik data yang tegas, dan definisi konkret dari logika bisnis yang justru menjadi inti produk.

| Aspek | v1.0 | v2.0 |
|---|---|---|
| Requirement ID yang testable | 0 | 138 (FR) + 12 NFR global |
| Acceptance criteria per phase | 8 milestone umum | Checklist per phase, 13 phase |
| Test ID | — | ~90, terpetakan di traceability matrix |
| Definisi rule MQL | disebut, tidak didefinisikan | 9 rule konkret + versi + test |
| Decision rules | 6 contoh naratif | 11 rule bernomor + gate rule + evidence trail |
| Tabel yang ambigu semantiknya | 4 (leads, funnel_daily, campaign_daily, lead_attributions) | 0 |
| Timezone / currency | tidak disebut | didefinisikan, jadi NFR |
| Phase dengan dependency benar | 11 phase, 3 dependency salah | 13 phase, dependency eksplisit |

**Temuan paling mahal kalau tidak diperbaiki:** `leads.hubspot_contact_id unique` (v1.0 §8). Constraint ini membuat pembeli korporat yang inquiry dua kali hanya terhitung satu lead — CPL dan CPQL per campaign salah secara permanen, dan baru ketahuan berbulan-bulan kemudian saat angkanya tidak masuk akal.

---

## 2. A. Strengths (yang sudah benar dan dipertahankan)

1. **Batas kepemilikan sistem sudah tepat** — HubSpot = CRM SoT, Supabase = operational + analytics, n8n = orkestrasi, Slack = notifikasi. Ini fondasi yang benar dan dipertahankan utuh di v2.0.
2. **Manual-first sequencing** (§17, §24). Membangun Workflow + Playbook sebelum integrasi adalah keputusan yang menyelamatkan proyek dari 3 bulan debugging API sebelum produknya terbukti berguna. Dipertahankan dan diperkuat.
3. **Diagnostic-first decision rule** — "CPL naik tapi CPQL turun → jangan pause". Ini persis prinsip yang benar untuk B2B lead gen dan jadi rule `R-03` di v2.0.
4. **Tabel domain eksplisit**, bukan satu tabel JSON generik. Menghindari kesalahan arsitektur yang paling umum di internal tool.
5. **Risk & guardrail table** (§22) — jujur soal failure mode, termasuk risiko Codex mengubah arsitektur.
6. **Prinsip "setiap integrasi harus bisa gagal tanpa mematikan aplikasi"** (§2). Dinaikkan jadi NFR-G3 yang diuji.
7. **KPI formula layer terpusat** (§12.1) — niatnya benar, tinggal ditegakkan sebagai aturan arsitektur.

---

## 3. B. Missing Requirements

| # | Yang hilang | Dampak | Perbaikan di v2.0 |
|---|---|---|---|
| B1 | **Timezone** tidak disebut sama sekali | Semua tabel harian (`campaign_daily`, `funnel_daily`, `workflow_runs.run_date`) ambigu. Lead jam 23:50 WIB masuk hari yang salah. | NFR-G10, `domain/dates`, semua business date di Asia/Jakarta |
| B2 | **Currency** tidak disebut | Ad account USD + deal IDR = agregat yang diam-diam salah | Kolom `currency` wajib, agregat lintas-currency ditolak + alert |
| B3 | **Rule kualifikasi MQL tidak pernah didefinisikan** — §9.4 langkah 8 bilang "jika memenuhi deterministic qualification rules" | Ini inti produk. Coding agent akan mengarang. | §26.3: 5 rule disqualify + 4 rule qualify, versi `q1`, semua ber-test |
| B4 | **WhatsApp/CTWA hampir tidak dibahas** padahal channel aktif | Ingest contract tidak punya `ctwa_clid`; lead WA jadi warga kelas dua | §23.4 dua mode (deterministic + degraded), jadi first-class di Phase 6 |
| B5 | **Dokumen Meta-centric**, padahal Google Search & LinkedIn memikul intent utama | `campaign_daily` tanpa kolom `platform` → migrasi paksa saat Google Ads masuk | `ad_metrics_daily` platform-agnostic sejak awal (AD-03) |
| B6 | Tidak ada **audit trail** perubahan stage | Janji "decision history" tidak punya tabelnya | `lead_stage_events` append-only |
| B7 | Tidak ada **watermark / cursor** untuk incremental sync | Reconcile hanya bisa full-scan atau tidak reliable | `sync_state` |
| B8 | Tidak ada **staging payload mentah** | Webhook gagal = bukti hilang, tidak bisa replay | `webhook_events` + retensi 90 hari |
| B9 | Tidak ada **attribution rule** untuk revenue, padahal §9.5 menyebut "selected attribution rule" | Revenue per campaign tidak terdefinisi | §23.3, default `lead_last_touch`, berversi |
| B10 | Tidak ada **seed/demo data strategy** padahal Phase 2–4 bergantung pada "seeded/manual data" | Phase 4 selesai tapi funnel kosong → produk mati sebelum Phase 5 | Manual entry + CSV import wajib di Phase 5 |
| B11 | Tidak ada **PII policy, retensi, backup restore** | Data pribadi lead disimpan tanpa aturan | §32 lengkap + restore drill di Phase 12 |
| B12 | Tidak ada **API surface definition** (server action vs route handler) | Codex akan membuat dua pola sekaligus | §14.1 |
| B13 | Tidak ada **tooling migration & data access decision** | Codex bisa memilih Drizzle di tengah jalan | AD-09: Supabase CLI + supabase-js di repository layer |
| B14 | Tidak ada **rate limit & backoff policy** | HubSpot 429 di tengah batch = data hilang diam-diam | §14.4 |
| B15 | Tidak ada **accessibility requirement** meski §5.1 melarang color-only | NFR-G8 |
| B16 | **Ketergantungan organisasi** (tidak ada Sales role; Closed Won/Lost tak berpemilik) tidak muncul sebagai requirement | Sistem akan menampilkan ROAS dari data yang tidak pernah diisi | Rule `R-09` + metrik `outcome completeness` + Appendix A3 |

---

## 4. C. Ambiguities (yang akan ditebak coding agent)

| # | Ambiguitas | Resolusi v2.0 |
|---|---|---|
| C1 | **Lead itu orang atau inquiry?** `leads.hubspot_contact_id unique` mengimplikasikan 1 lead = 1 orang | AD-01: lead = **inquiry event**; `contacts` tabel terpisah |
| C2 | `funnel_daily` diagregasi berdasarkan **tanggal apa** — tanggal lead masuk atau tanggal perubahan stage? | AD-05: dua view eksplisit, cohort vs activity, wajib disebutkan di UI |
| C3 | `campaign_daily.leads` — dari platform atau dari CRM? | Kolom dihapus. Dua fakta berbeda tidak boleh satu kolom |
| C4 | "Priority Actions top 3–5 berdasarkan rules/alerts" — tanpa fungsi scoring | §29.3 formula scoring eksplisit + transparan ke user |
| C5 | `alerts.entity_ref` polimorfik tanpa disiplin tipe | `entity_type` + `entity_id` + `alert_key` deterministik |
| C6 | "Checklist berbeda sesuai weekday" — tidak ada spesifikasi | `cadence` + `weekdays int[]` + 3 template seed |
| C7 | "Experiment linked to campaigns by optional external IDs" — tidak ada tabel/kolom | `experiments.external_refs jsonb` + validasi bentuk |
| C8 | `deals` tidak punya FK ke `leads`/`companies` — join funnel mustahil | FK ditambahkan + aturan linkage + fallback |
| C9 | `lead_attributions` tanpa `touch_type` | Tabel dihapus; first-touch di contact, last-touch di lead |
| C10 | `playbook_articles.version` ada tapi perilaku versioning tidak didefinisikan | Increment saat publish; revision history **sengaja ditunda** |
| C11 | Tidak ada mapping owner HubSpot → user | `hubspot.mapping.owner_map` |
| C12 | "PM OS may write fields when there is a clear operational need" — pintu terbuka tanpa aturan | §19.3: daftar tertutup 3 jenis write, sisanya dilarang |

---

## 5. D. Contradictions

| # | Kontradiksi | Putusan |
|---|---|---|
| D1 | §7.1 bilang Next.js memegang "server-side business logic", tapi §11 memberi n8n `lead-ingest` yang melakukan "qualify" | **AD-04**: logika bisnis hanya di app. n8n = transport. Kalau tidak diputuskan, aturan MQL akan hidup di dua tempat dan berbeda dalam 3 bulan |
| D2 | §19.1 mendefinisikan `POST /api/integrations/lead` (app menerima), §9.4 bilang form → n8n → HubSpot → mirror | **AD-06**: satu jalur. n8n relay → PM OS validate+qualify+persist → PM OS upsert HubSpot |
| D3 | Phase 2 "Today checklist using manual data", tapi §5.2 menspesifikasi Today lengkap dengan Priority Actions & Data Health (butuh Phase 7–8) | Today dibangun **progresif**; §25.2 menyatakan section mana muncul di phase mana |
| D4 | §5.3 menaruh Revenue & ROAS di Performance page MVP, padahal revenue baru ada di Phase 5 dan spend di Phase 7 | Metrik yang butuh spend render `—` sampai Phase 9 (FR-5.15) |
| D5 | Tiga sistem sekuensing yang tumpang tindih: Phase 0–10, Milestone M1–M8, Backlog P0–P2 | Satu sistem: 13 phase. Milestone dan backlog dihapus |
| D6 | §7.1 memasukkan "Codex + GPT-6 Astra" ke dalam **tabel tanggung jawab runtime** | Dipindah keluar arsitektur (§10.2). Tool development bukan komponen sistem |
| D7 | §1.2 menyatakan "full bidirectional CRM replacement" out of scope, tapi §9 membuka write ke HubSpot tanpa batas | Daftar write tertutup + feature flag `write_lifecycle_stage` default **off** |
| D8 | §23 mencantumkan klaim versi model/API vendor di dalam PRD | Dikeluarkan. Versi API di-pin di config dengan tanggal verifikasi, bukan di PRD yang akan basi |

---

## 6. E. Overengineering (dipangkas)

| Yang dipangkas | Alasan |
|---|---|
| `experiment_variants` (tabel terpisah) | Operator tunggal menjalankan A/B, bukan multivariate. Jadi dua field deskripsi + `external_refs` |
| `lead_attributions` (tabel terpisah) | Multi-touch belum dibangun; satu tabel untuk data first/last touch adalah abstraksi tanpa pemakai |
| `funnel_daily` (tabel agregat tersimpan) | Sumber drift. Jadi view — funnel tidak akan pernah berbeda dari baris penyusunnya |
| GA4 di MVP | Tidak mengubah keputusan harian sebelum tracking LP terbukti. Jadi post-MVP dengan precondition |
| `playbook_article_revisions` | Ditunda sampai ada kebutuhan nyata |
| `notification_log` | Digabung jadi `alerts.last_notified_at` + `notification_count` |
| TanStack Query & Zustand sebagai default | RSC + URL state cukup. Keduanya butuh entri `DECISIONS.md` |
| Interactive Slack app di MVP | Sudah ditunda di v1.0, dipertegas: tidak ada Events API, tidak ada block action |

Bersih: v1.0 punya 17 tabel dengan 4 yang semantiknya bermasalah; v2.0 punya ~21 tabel yang semuanya punya alasan tertulis, dengan 4 tabel v1.0 dihapus dan 8 ditambahkan karena memang dibutuhkan (audit trail, idempotency, sync cursor, decision history).

---

## 7. F. Underengineering (diperdalam)

| Area | Masalah | Perbaikan |
|---|---|---|
| Auth | Tidak disebutkan cara user dibuat. Supabase default = **signup terbuka** | Signup **dimatikan**, invite-only, trigger `handle_new_user`. Ini security requirement, bukan preferensi |
| RLS | "policy dapat membatasi ke authenticated project user" — terlalu kabur | Matriks policy per grup tabel; mirror hanya service role; audit script di CI |
| Webhook verification | "shared secret where supported" | HMAC-SHA256 + timestamp + replay window 300 detik + constant-time compare + idempotency key |
| Error handling | Hanya disebut "separate business failure from system failure" | Taksonomi 9 kode error dengan properti retryable/terminal (§14.2) |
| Testing | Daftar jenis tes tanpa tools dan tanpa bar | Vitest + Playwright, ~90 test ID, 100% branch untuk `domain/` metrics/qualification/rules |
| Observability | Hanya `integration_runs` | Health model 4 status, data-health checks per jam, self-check untuk checker yang tidak jalan |
| Idempotency | Disebut sebagai prinsip, tanpa mekanisme | `webhook_events.idempotency_key` unique + natural key upsert di semua mirror |

---

## 8. G. Dependency Problems

| # | Masalah di v1.0 | Perbaikan |
|---|---|---|
| G1 | **n8n tidak punya phase sendiri**, padahal Phase 5 (HubSpot) dan 6 (Slack) bergantung padanya | Phase 6 = Ingest API + n8n Foundation, **sebelum** HubSpot |
| G2 | Phase 6 (Slack) dibangun sebagai transport tanpa domain alert | Phase 8 memisahkan alert domain (dedupe, severity, lifecycle) dari Slack sebagai transport |
| G3 | Today page (Phase 2) menampilkan data dari Phase 7–8 | Section progresif dengan label phase |
| G4 | Phase 4 (Lead & Funnel) sebelum Phase 5 (HubSpot) — ini benar, tapi tanpa jalur data manual yang nyata | CSV import + manual entry jadi requirement wajib, bukan opsional |
| G5 | Landing page / GTM / WhatsApp API diasumsikan ada, tidak pernah disebut sebagai dependency eksternal | Appendix A: 11 precondition eksternal dengan owner dan phase yang diblokir |
| G6 | Phase 7 (Performance Data) sebelum Phase 8 (Decision Rules) — benar, tapi rule butuh threshold yang belum pernah ditetapkan | Target CPQL jadi Open Question yang memblokir Phase 10 |

---

## 9. H. Security Risks

| # | Risiko | Tingkat | Mitigasi v2.0 |
|---|---|---|---|
| H1 | Supabase signup terbuka secara default | **Kritis** | Signup dimatikan + dicatat di `DECISIONS.md` |
| H2 | `/api/integrations/lead` tanpa autentikasi yang dispesifikasi | **Kritis** | HMAC + timestamp + idempotency + size cap + content-type allowlist |
| H3 | PII lead (nama, email, telepon, pesan) tanpa aturan logging | Tinggi | NFR-G5: tidak pernah di log, Slack, node name n8n, atau error tracker. Slack payload pakai allowlist field yang di-test |
| H4 | Service role key tanpa batas lokasi pemakaian | Tinggi | Hanya di `lib/supabase/server-admin.ts` dengan `import 'server-only'`; scan bundle di CI |
| H5 | Tidak ada rotasi secret | Sedang | `INGEST_HMAC_SECRET_PREVIOUS` untuk rotation window + runbook |
| H6 | n8n self-hosted tanpa checklist hardening konkret | Sedang | §32 + Appendix A10 |
| H7 | Backup disebut, restore tidak pernah diuji | Sedang | Restore drill wajib di Phase 12 — backup yang belum pernah direstore itu hipotesis |
| H8 | Tidak ada aturan retensi data | Sedang | `webhook_events.payload` di-null setelah 90 hari; retensi lead jadi Open Question |
| H9 | Tidak ada threat case yang diuji | Sedang | 7 threat case dengan test ID di Phase 12 |

---

## 10. I. Data Architecture Problems

| # | Masalah | Perbaikan |
|---|---|---|
| I1 | `leads(hubspot_contact_id) unique` → inquiry berulang hilang | AD-01, lead = inquiry, contact terpisah |
| I2 | `deals` tanpa FK ke lead/company/contact | FK + aturan linkage + fallback + flag kalau tidak bisa di-link |
| I3 | `campaign_daily` tanpa `platform`, `currency`, `account_id` | `ad_metrics_daily` platform-agnostic dengan unique tuple 5 kolom |
| I4 | Grain mismatch: unique `(date, campaign_id)` tapi §5.3 minta diagnostik level ad | Grain campaign untuk MVP dengan kolom `adset_id`/`ad_id` = `''` — jalur ad-level terbuka tanpa migrasi |
| I5 | `funnel_daily` sebagai tabel = source of truth kedua | Jadi view |
| I6 | Tidak ada `sync_state`, `webhook_events`, `lead_stage_events` | Ditambahkan |
| I7 | `external_id/source_system/synced_at` hanya disebut di prosa §7.2, tidak ada di skema | Jadi konvensi wajib §15.1 poin 5 |
| I8 | Tidak ada strategi duplikat contact | Urutan resolusi eksplisit + penolakan `CONFLICT` saat ambigu. Auto-merge **dilarang permanen** |
| I9 | Tidak ada partial unique index untuk dedupe alert | `alerts(alert_key) where status <> 'resolved'` |
| I10 | Money type tidak ditentukan | `numeric(18,2)` + currency, `float` dilarang |

---

## 11. J. Development Risks

| Risiko | Guardrail v2.0 |
|---|---|
| Scope creep (11 route untuk 1 user) | Scope guard §7.5: masuk MVP hanya kalau tanpanya pekerjaan **harian** mustahil |
| Codex mengubah arsitektur diam-diam | 16 standing rule + phase gate + completion report wajib + `DECISIONS.md` |
| Codex mengerjakan phase berikutnya duluan | "Do not begin phase N+1 until explicitly instructed" |
| Debugging sulit karena logika tersebar | Layering rule: `components → services → repositories/integrations`; `domain/` tanpa I/O |
| Integrasi tidak stabil | Kontrak 7 langkah seragam untuk semua integrasi |
| Otomasi prematur | Manual-first: setiap modul harus bisa dipakai dengan data tangan dulu |
| Data manual tidak pernah diisi → funnel kosong → produk mati | CSV import dari export HubSpot jadi requirement Phase 5 |
| Threshold ditebak | Target CPQL jadi blocker eksplisit untuk Phase 10, bukan default diam-diam |

---

## 12. Key Architectural Decisions

| ID | Keputusan | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| **AD-01** | `leads` = inquiry event, `contacts` = orang | B2B gifting punya pembeli berulang dan musiman. Tanpa ini CPL/CPQL per campaign salah permanen | 1 lead = 1 contact (v1.0): under-count setiap repeat inquiry |
| **AD-02** | First touch di `contacts` (write-once), last touch di `leads` | Menghapus satu tabel, membuat semantik attribution tidak bisa disalahartikan | Tabel `lead_attributions` tanpa `touch_type` |
| **AD-03** | `ad_metrics_daily` platform-agnostic menggantikan `campaign_daily` | Google Ads/LinkedIn masuk tanpa migrasi tabel fakta | Satu tabel per platform; atau Meta-only lalu migrasi |
| **AD-04** | Logika bisnis **hanya** di Next.js domain layer; n8n = transport | Satu implementasi rule MQL/KPI. Dua implementasi akan divergen dan tidak ada yang tahu kapan | n8n melakukan qualify (v1.0 §11) |
| **AD-05** | Cohort basis vs activity basis dipisah eksplisit; `funnel_daily` jadi view | Mencampur keduanya adalah cara paling umum dashboard funnel berbohong | Satu tabel agregat harian |
| **AD-06** | Satu jalur ingest: sumber → n8n relay → `POST /api/ingest/lead` → PM OS persist + qualify + upsert HubSpot | Idempotency, validasi, dan versioning di satu tempat | n8n menulis ke HubSpot dan Supabase langsung |
| **AD-07** | Semua timestamp `timestamptz` UTC; semua business date di Asia/Jakarta | Menghilangkan seluruh kelas bug tanggal | Membiarkan implisit (v1.0) |
| **AD-08** | Currency disimpan per baris; agregat lintas-currency **ditolak** + alert | Lebih baik menolak daripada menjumlahkan USD dan IDR diam-diam | Konversi FX otomatis (overengineering untuk MVP) |
| **AD-09** | Supabase CLI migrations + supabase-js di repository layer, tanpa ORM | Satu abstraksi lebih sedikit untuk di-debug oleh solo developer | Drizzle/Prisma |
| **AD-10** | Signup dimatikan, invite-only, RLS di 100% tabel, mirror hanya service role | Internal tool dengan signup terbuka = database terbuka | Default Supabase |
| **AD-11** | SQL dan seterusnya dimiliki HubSpot; PM OS hanya mirror | Mencegah dua definisi pipeline yang bersaing | PM OS ikut menentukan SQL |
| **AD-12** | Rule engine deterministik berversi dengan gate rule yang **menolak memberi rekomendasi** saat data tidak layak | Rekomendasi di atas data busuk lebih berbahaya daripada tidak ada rekomendasi | Selalu memberi verdict |
| **AD-13** | Phase resequencing: n8n foundation sebelum HubSpot; alert dipisah dari Slack | Dependency nyata, bukan urutan naratif | Urutan v1.0 / urutan saran (n8n di Phase 11) |
| **AD-14** | CTWA jadi first-class source dengan **degraded mode** | Status WhatsApp API di luar kendali. Produk tidak boleh menunggu keputusan vendor | Menunggu `ctwa_clid` tersedia |

---

## 13. Major Changes (v1.0 → v2.0)

1. **138 functional requirement ber-ID** menggantikan bullet naratif; setiap FR testable dan terpetakan ke test ID di traceability matrix.
2. **13 phase** (0–12) menggantikan 11 phase + 8 milestone + backlog P0–P2. Setiap phase punya 22 bagian tetap: Overview → Objective → User Value → Scope → Out of Scope → Dependencies → FR → NFR → Tools → Data Model → BE/FE/INT/AUT tasks → Routes → User Flow → Edge Cases → Error Handling → Security → Testing → Acceptance Criteria → DoD → Deliverables → Codex Implementation Order.
3. **Data model diperbaiki** — 4 tabel bermasalah dihapus/diubah, 8 tabel esensial ditambahkan, konvensi skema jadi aturan mengikat, index plan lengkap, RLS per grup tabel.
4. **Logika bisnis didefinisikan, bukan disebut** — 9 rule kualifikasi, 11 decision rule, 19 formula KPI, formula priority scoring, semuanya berversi dan ber-test.
5. **Semantik pengukuran ditegakkan** — cohort vs activity, timezone, currency, B2B lag, sample minimum, freshness SLA, attribution coverage, outcome completeness.
6. **Keamanan naik dari prosa jadi requirement yang diuji** — 7 threat case, RLS audit di CI, secret scan di CI, restore drill.
7. **Ketergantungan eksternal dipisahkan** — Appendix A dengan 11 precondition dan pemiliknya. Ini bukan pekerjaan repo ini, dan menyembunyikannya di dalam phase plan akan membuat phase gagal karena alasan yang bukan kesalahan kodenya.
8. **Codex protocol operasional** — 16 standing rule, template task, template completion report, dan phase gate dengan 10 kondisi PASS.
9. **Yang dihapus:** klaim versi model vendor, tabel milestone, backlog prioritas, `experiment_variants`, `lead_attributions`, `funnel_daily`, GA4 dari MVP, Slack interaktif.

---

## 14. Development Phase Summary

| Phase | Nama | Depends | Output utama | Nilai harian? |
|---|---|---|---|---|
| 0 | Project Foundation | — | Repo, CI, env validation, control docs | Enabler |
| 1 | Auth & App Shell | 0 | Login, shell, `profiles`, `app_settings`, RLS baseline | Enabler |
| 2 | Daily Workflow OS | 1 | Checklist harian, notes, Today v1 | **Ya** |
| 3 | Playbook & SOP | 1 | Knowledge base + 5 artikel seed | **Ya** |
| 4 | Experiment OS | 1 | Lifecycle eksperimen + learning library | **Ya** |
| 5 | Lead & Funnel Core | 1 | CRM model, qualification engine, CSV import, funnel | **Ya** |
| 6 | Ingest API & n8n Foundation | 5 | HMAC ingest, idempotency, cron, 3 workflow n8n | Ya |
| 7 | HubSpot Integration | 5, 6 | Mapping layer, sync dua arah terbatas, reconcile | **Ya** |
| 8 | Alerts & Slack | 5, 6 | Alert domain + dedupe + Slack + digest | **Ya** |
| 9 | Paid Media & Performance | 5, 6 | Meta ingest, `/performance`, rekonsiliasi spend↔lead | **Ya** |
| 10 | Decision Engine & Today v2 | 5, 8, 9 | 11 rule, priority actions, threshold settings | **Ya** |
| 11 | Reporting | 2,4,5,9,10 | Weekly report + snapshot immutable + export | **Ya** |
| 12 | Observability & Production | semua | RLS audit, security suite, E2E, restore drill, runbook | Enabler |

**MVP = Phase 0–8.** Phase 2–5 sudah berguna tanpa satu integrasi pun — itu memang tujuannya.

---

## 15. Remaining Open Questions

Hanya yang butuh keputusan bisnis, bukan teknis. Detail di Appendix B PRD.

1. **Target CPQL dan target CPL** — dari average deal value, margin, dan MQL→won rate. **Memblokir Phase 10** (rule `R-02` dan `R-05` mati tanpa angka ini).
2. **Connector pertama: Meta atau Google Ads?** Rekomendasi: Meta dulu (jalur lebih pendek, CTWA sudah jalan), Google Ads jadi item post-MVP pertama — kecuali spend Google > 2× Meta, maka ditukar.
3. **Kepemilikan SQL** — dikonfirmasi bahwa SQL ke bawah ditentukan sales di HubSpot? Kalau praktiknya kamu yang set, matriks kepemilikan data berubah.
4. **SLA stale lead** — default 2 hari kerja (MQL) dan 3 hari kerja (SQL). Sudah disepakati dengan yang memegang WhatsApp?
5. **Write-back lifecycle stage ke HubSpot** — otomatis atau hanya catat alasan? Default: **off**.
6. **Format laporan untuk VP Marketing** — Markdown + print view cukup, atau perlu Google Docs/Slides?
7. **User kedua dalam 6 bulan?** Kalau ya, role enforcement naik dari Future ke Phase 12.
8. **Retensi PII lead** setelah deal lost — berapa lama?

---

## 16. Final Readiness Score

| Kategori | Skor | Catatan |
|---|---|---|
| Product clarity | **9,5** | Vision, non-goals, JTBD, anti-metric, scope guard semuanya eksplisit |
| Architecture clarity | **9,5** | Batas kepemilikan tegas, layering rule bisa ditegakkan di review |
| Requirements completeness | **9** | 138 FR + 12 NFR global. Yang tersisa: FR untuk GA4 dan Google Ads sengaja belum ditulis karena keduanya post-MVP |
| Database clarity | **9,5** | Skema, index, RLS, konvensi, view semantics lengkap. Tersisa: tuning index untuk volume nyata baru bisa di Phase 12 |
| Integration clarity | **9** | Kontrak 7 langkah, mapping layer, idempotency lengkap. **Tersisa:** bentuk payload persis dari WhatsApp gateway belum bisa difinalkan sampai Open Question #A9 terjawab — kontraknya sudah didefinisikan, adapternya belum |
| Security readiness | **9** | Auth, RLS, HMAC, PII, retensi, threat case, audit CI. **Tersisa:** hardening n8n dan restore drill hanya bisa diverifikasi saat dieksekusi (Phase 12), jadi statusnya "terspesifikasi" bukan "terbukti" |
| Testing readiness | **9** | ~90 test ID, bar 100% branch untuk domain kritis. **Tersisa:** fixture HubSpot dan Meta baru bisa direkam dari response asli saat Phase 7 dan 9 — sampai itu, transform test berjalan di atas fixture buatan |
| Codex implementation readiness | **9,5** | Standing rules, phase gate, completion report, implementation order per phase |
| MVP scope discipline | **10** | 4 tabel dihapus, GA4 keluar, Slack interaktif keluar, Phase 2–5 berguna tanpa integrasi |
| Future extensibility | **9,5** | Platform-agnostic metrics, `profiles.role`, facts JSON siap untuk AI narrative, `external_refs` siap untuk overlay eksperimen |

**Rata-rata: 9,35 / 10**

Tiga kategori di bawah 9,5 punya sebab yang sama dan sehat: **ketiganya membutuhkan kontak dengan sistem nyata untuk naik**. Fixture integrasi butuh response HubSpot/Meta asli; bukti keamanan butuh drill yang dieksekusi; adapter WhatsApp butuh keputusan vendor. Menaikkan skor itu di atas kertas hanya akan menghasilkan spesifikasi yang lebih percaya diri daripada kenyataannya — dan itu persis kesalahan yang dokumen ini dirancang untuk dicegah.
