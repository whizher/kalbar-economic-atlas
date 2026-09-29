# Berkontribusi

Terima kasih atas usulan perbaikan. Cakupan v1 adalah enam indikator Kota Pontianak. Untuk perbaikan data, mulai dari publikasi atau tabel resmi BPS dan catat judul, penerbit, penulis bila tercantum, tanggal akses, URL langsung, rujukan tabel/halaman, serta periode, satuan, dan cakupan geografis.

## Pembaruan data dua lintasan

1. Lintasan pertama: baca sumber asli dan ekstrak nilai ke `data/pontianak/` tanpa transformasi selain normalisasi yang didokumentasikan. Catat perubahan metode, dasar indeks, keterbandingan, dan status revisi.
2. Lintasan kedua: baca ulang sumber secara independen dan cocokkan **setiap** nilai, periode, satuan, kode/cakupan geografis, rujukan, serta keterbandingannya. Perbarui catatan verifikasi hanya setelah kedua lintasan tuntas.
3. Jalankan `npm run data:validate`, `npm run check`, `npm test`, dan `npm run build`. Ajukan pull request berisi diff data yang dapat dibaca manusia, tautan resmi, dan penjelasan perubahan. Publikasi menunggu tinjauan serta validasi berhasil.

Jangan memublikasikan secara otomatis nilai baru yang baru di-scrape. Pemeriksaan ketersediaan sumber bersifat baca saja; gangguan jaringan atau rate limit ditinjau manual. Bila sumber ditarik, ikuti proses tinjauan dan penarikan di `DATA_USE.md`.

Usulan kode dan tulisan juga harus menjaga navigasi keyboard, aksesibilitas, atribusi sumber, serta batas privasi situs statis. MIT berlaku hanya pada kode asli proyek; data BPS tunduk pada ketentuan BPS yang ditautkan di `DATA_USE.md`.
