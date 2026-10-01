# Berkontribusi

Terima kasih atas usulan perbaikan. Cakupan v1 adalah enam indikator Kota Pontianak. Untuk perbaikan data, mulai dari publikasi atau tabel resmi BPS dan catat judul, penerbit, penulis bila tercantum, tanggal akses, URL langsung, rujukan tabel/halaman, serta periode, satuan, dan cakupan geografis.

## Pembaruan data dua lintasan

1. Lintasan pertama: baca sumber asli dan ekstrak nilai ke `data/pontianak/` tanpa transformasi selain normalisasi yang didokumentasikan. Catat perubahan metode, dasar indeks, keterbandingan, dan status revisi.
2. Lintasan kedua: baca ulang sumber secara independen dan cocokkan **setiap** nilai, periode, satuan, kode/cakupan geografis, rujukan, serta keterbandingannya. Perbarui catatan verifikasi hanya setelah kedua lintasan tuntas.
3. Ajukan perubahan terfokus dengan checklist di bawah. Publikasi menunggu tinjauan serta validasi berhasil.

## Checklist pull request perubahan data

- [ ] Lintasan pertama mengekstrak nilai dan mendokumentasikan normalisasi, metode, revisi, serta keterbandingan.
- [ ] Lintasan kedua membaca sumber secara independen dan mencocokkan setiap nilai, periode, satuan, kode/cakupan Kota Pontianak, rujukan, serta keterbandingan. Catatan verifikasi menyatakan dua lintasan yang benar-benar selesai.
- [ ] Katalog memuat judul, penerbit, penulis bila tercantum, tanggal akses, URL langsung, dan rujukan tabel/halaman yang tepat.
- [ ] Checksum SHA-256 dicatat bila berkas sumber dapat diunduh dan direproduksi; jelaskan keterbatasan bila checksum tidak tersedia atau unduhan berubah pada tingkat byte. Jangan mengarang checksum atau tanggal akses baru.
- [ ] Diff data dapat dibaca manusia dan terbatas pada perubahan yang diajukan; tidak ada interpolasi atau penggantian dengan angka provinsi.
- [ ] Dengan Node 24.20.0 dan clean install `npm ci`, jalankan `npm run data:validate`, `npm run check`, `npm test`, `npm run build`, `npm run test:e2e`, `npm audit --omit=dev`, dan `git diff --check`; lampirkan hasil serta keterbatasan. Instal browser pengujian bila perlu dengan `npx playwright install --with-deps chromium`.
- [ ] Cocokkan tampilan nilai, periode, satuan, sumber, unduhan, dan tabel/grafik dengan snapshot; periksa kedua tema, desktop/seluler, keyboard, serta halaman tanpa JavaScript.
- [ ] Nilai baru tidak dipublikasikan otomatis. Tinjauan data dan kode selesai sebelum persetujuan publikasi oleh pemilik.

Jangan memublikasikan secara otomatis nilai baru yang baru di-scrape. Pemeriksaan ketersediaan sumber bersifat baca saja; gangguan jaringan atau rate limit ditinjau manual. Bila sumber ditarik, ikuti proses tinjauan dan penarikan di `DATA_USE.md`.

Usulan kode dan tulisan juga harus menjaga navigasi keyboard, aksesibilitas, atribusi sumber, serta batas privasi situs statis. MIT berlaku hanya pada kode asli proyek; data BPS tunduk pada ketentuan BPS yang ditautkan di `DATA_USE.md`.

Lihat [README.md](README.md) untuk pengembangan lokal dan pemeliharaan toolchain. Perubahan pin Action dilakukan bersama pengujian kebijakan workflow melalui tinjauan. Sampaikan keterbatasan pemeriksaan manual atau runtime dengan jelas; hasil lokal tidak membuktikan deployment publik berhasil.
