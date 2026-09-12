-- Real editable procedures, not fabricated activity or performance data.
insert into public.workflow_templates(key,name,cadence,weekdays,steps) values
('daily-ops','Daily Ops','daily',array[1,2,3,4,5], '[
 {"key":"spend","label":"Periksa pacing belanja iklan","help":"Periksa sumber yang tersedia secara manual. Jika belum tersedia, catat keterbatasannya; jangan mengarang angka.","required":true},
 {"key":"inquiries","label":"Tinjau inquiry baru","help":"Periksa sumber inquiry yang tersedia. Registri lead PM OS aktif di Phase 6.","required":true},
 {"key":"follow-up","label":"Periksa tindak lanjut MQL yang tertunda","help":"Periksa catatan tindak lanjut secara manual; tandai bila data belum tersedia.","required":true},
 {"key":"health","label":"Periksa kesehatan data","help":"Periksa akses dan kelengkapan sumber secara manual. Pemantauan integrasi belum aktif.","required":true},
 {"key":"note","label":"Catat satu observasi hari ini","help":"Simpan konteks di Catatan cepat. Jangan masukkan kredensial atau data pribadi pelanggan.","required":true}
]'),
('weekly-review','Weekly Review','weekly',array[1], '[
 {"key":"review","label":"Tinjau checklist dan catatan minggu lalu","help":"Buka riwayat Workflows dan identifikasi pekerjaan yang belum dituntaskan.","required":true},
 {"key":"learning","label":"Catat pembelajaran dan kendala","help":"Pisahkan fakta yang tersedia dari interpretasi; pelaporan otomatis belum aktif.","required":true},
 {"key":"plan","label":"Tentukan fokus kerja minggu ini","help":"Simpan prioritas manual sebagai catatan. Rekomendasi otomatis belum aktif.","required":true}
]'),
('monthly-review','Monthly Review','monthly',null, '[
 {"key":"review","label":"Tinjau pelaksanaan rutinitas bulan lalu","help":"Tinjau pekerjaan dan catatan yang benar-benar tersimpan.","required":true},
 {"key":"procedure","label":"Evaluasi checklist dan prosedur kerja","help":"Perbarui template bila diperlukan; checklist lama tetap mempertahankan isinya.","required":true},
 {"key":"plan","label":"Catat fokus dan kebutuhan bulan ini","help":"Catat keputusan manual dan keterbatasan data yang perlu ditindaklanjuti.","required":true}
]');
