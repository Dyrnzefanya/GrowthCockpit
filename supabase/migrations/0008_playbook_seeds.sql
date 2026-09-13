insert into public.playbook_articles(slug,title,category,article_type,summary,body_md,tags,status,version,published_at) values
('sop-peluncuran-kampanye','SOP peluncuran kampanye','Campaign Operations','sop','Urutan pemeriksaan sebelum, saat, dan setelah kampanye iklan diluncurkan.', $md$
# SOP peluncuran kampanye

Gunakan prosedur ini setiap kali kampanye baru akan aktif.

## Sebelum peluncuran

- [ ] Tujuan bisnis dan sasaran kampanye tertulis jelas.
- [ ] Audiens, lokasi, jadwal, dan anggaran sudah mendapat persetujuan.
- [ ] Nama kampanye dan UTM mengikuti referensi yang berlaku.
- [ ] Halaman tujuan, formulir, dan pelacakan sudah melalui QA.

## Saat peluncuran

1. Periksa kembali status iklan dan batas anggaran.
2. Simpan waktu peluncuran dan pemilik pemeriksaan.
3. Pastikan tidak ada perubahan otomatis pada kampanye.

## Setelah peluncuran

Periksa delivery dan pelacakan pada kesempatan operasional berikutnya. Jika data belum tersedia, catat **belum tersedia**; jangan membuat angka pengganti.
$md$, array['campaign','launch','qa'],'published',1,now()),
('checklist-qa-pelacakan','Checklist QA pelacakan','Measurement','checklist','Pemeriksaan teknis untuk memastikan tautan, formulir, dan event dapat dilacak sebelum trafik dikirim.', $md$
# Checklist QA pelacakan

## Tautan dan parameter

- [ ] URL tujuan dapat dibuka tanpa pengalihan yang tidak diharapkan.
- [ ] Parameter UTM lengkap dan mengikuti konvensi penamaan.
- [ ] Tidak ada informasi pribadi di URL.

## Formulir dan event

- [ ] Formulir menampilkan status berhasil dan gagal dengan jelas.
- [ ] Event hanya tercatat sekali untuk satu tindakan.
- [ ] Nama event dan sumber dapat dibaca oleh operator.

## Bukti

Simpan waktu pengujian, lingkungan, hasil, dan siapa yang melakukan QA. Jangan mencatat token, kredensial, atau data pribadi ke artikel.
$md$, array['tracking','qa','utm'],'published',1,now()),
('checklist-review-mingguan','Checklist review mingguan','Operating Rhythm','checklist','Rangka kerja mingguan untuk membaca kinerja, konteks, kualitas data, dan tindakan berikutnya.', $md$
# Checklist review mingguan

## Kualitas data

- [ ] Periksa kesehatan sumber dan waktu pembaruan terakhir.
- [ ] Tandai metrik yang tidak tersedia atau cakupannya belum memadai.
- [ ] Pastikan periode laporan menggunakan tanggal bisnis Asia/Jakarta.

## Baca kinerja

- [ ] Bandingkan hasil dengan periode yang relevan.
- [ ] Pisahkan fakta, konteks, dan hipotesis.
- [ ] Catat perubahan yang terjadi di luar media berbayar.

## Tentukan tindak lanjut

- [ ] Tuliskan keputusan dan bukti yang mendukungnya.
- [ ] Tetapkan pemilik dan waktu pemeriksaan berikutnya.
- [ ] Jangan mengubah kampanye secara otomatis.
$md$, array['weekly-review','data-quality','decision'],'published',1,now()),
('diagnosis-cpl-meningkat','Pohon diagnosis ketika CPL meningkat','Diagnostics','decision_tree','Urutan diagnosis deterministik untuk mencari penyebab CPL yang meningkat tanpa langsung mengubah kampanye.', $md$
# Pohon diagnosis ketika CPL meningkat

## 1. Apakah datanya sehat?

- **Tidak:** periksa koneksi, freshness, event, dan cakupan. Tunda keputusan kinerja sampai data layak.
- **Ya:** lanjut ke kualitas dan volume lead.

## 2. Apakah perubahan berasal dari biaya atau konversi?

- Biaya naik: periksa CPM, kompetisi, audiens, dan perubahan delivery.
- Konversi turun: periksa CTR, halaman tujuan, formulir, dan pelacakan.

## 3. Apakah kualitas lead ikut berubah?

- Kualitas turun: periksa pesan, audiens, dan kesesuaian penawaran.
- Kualitas stabil: dokumentasikan hipotesis dan jalankan eksperimen terkontrol.

Keputusan akhir harus menyertakan bukti, keterbatasan data, dan waktu evaluasi berikutnya.
$md$, array['cpl','diagnostic','lead-quality'],'published',1,now()),
('referensi-utm-dan-penamaan','Referensi UTM dan penamaan kampanye','Measurement','reference','Konvensi ringkas agar sumber, medium, kampanye, konten, dan istilah dapat dibandingkan secara konsisten.', $md$
# Referensi UTM dan penamaan kampanye

## Parameter wajib

| Parameter | Isi | Contoh pola |
| --- | --- | --- |
| `utm_source` | Platform sumber | `meta` |
| `utm_medium` | Jenis kanal | `paid_social` |
| `utm_campaign` | Kampanye yang disepakati | `objective-market-period` |
| `utm_content` | Pembeda materi | `concept-format-variant` |

## Aturan penamaan

1. Gunakan huruf kecil dan tanda hubung.
2. Hindari nama pribadi, nomor telepon, atau informasi sensitif.
3. Jangan mengubah istilah setelah kampanye aktif tanpa mencatat pemetaan.
4. Uji URL lengkap sebelum dipakai.

```text
source-medium-objective-market-period
```
$md$, array['utm','naming','reference'],'published',1,now());
