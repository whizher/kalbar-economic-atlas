# Atlas Ekonomi Pontianak

## Tujuan proyek

Atlas ini menjelaskan harga, pekerjaan, dan kesejahteraan **Kota Pontianak** dalam Bahasa Indonesia dari ekstrak data resmi BPS yang telah diverifikasi. Beranda, tiga halaman topik, Data & Metodologi, serta Tentang menyediakan definisi, perubahan, tabel, grafik, sumber, dan unduhan JSON. Nama repositori `kalbar-economic-atlas` tidak memperluas cakupan v1 ke seluruh Kalimantan Barat.

## Indikator v1

| Topik | Indikator | Periode terbaru dalam snapshot | Acuan tren 2021–2025 |
| --- | --- | --- | --- |
| Harga | Inflasi umum | Desember 2025 | Inflasi year-on-year Desember |
| Harga | Inflasi makanan, minuman, dan tembakau | Desember 2025 | Inflasi year-on-year Desember |
| Pekerjaan | Tingkat Pengangguran Terbuka (TPT) | Agustus 2025 | Sakernas Agustus |
| Pekerjaan | Tingkat Partisipasi Angkatan Kerja (TPAK) | Agustus 2025 | Sakernas Agustus |
| Kesejahteraan | Persentase penduduk miskin (P0) | Maret 2025 | Susenas Maret |
| Kesejahteraan | Pengeluaran per kapita yang disesuaikan | Tahun 2025 | Tahunan |

Setiap indikator memiliki satu nilai terbaru dan tepat lima pengamatan tahunan yang ditinjau keterbandingannya: enam nilai terbaru dan 30 pengamatan tren. Pengeluaran yang disesuaikan memakai satuan ribu rupiah PPP per orang per tahun; ukuran daya beli dalam IPM ini bukan pendapatan atau gaji. Atlas tidak membuat ramalan, peringkat, skor gabungan, atau kesimpulan sebab-akibat.

## Kesegaran data dan perbedaan periode

“Terbaru” berarti terbaru dalam snapshot yang diperiksa, bukan jaminan nilai resmi paling baru saat situs dibaca. Rekaman `data/pontianak/verification.json` mencatat dua lintasan pemeriksaan pada 27 Agustus 2026. Periode, tanggal akses sumber, revisi, metode, dan catatan keterbandingan tampil per indikator; bulan pengamatan antarindikator berbeda dan tidak disamakan. Perubahan kerangka IHK dan pembobotan Sakernas dicatat. Tidak ada interpolasi, pengisian tahun kosong, atau penggantian dengan data provinsi.

## Referensi desain

Mockup desain adalah referensi pengerjaan dan tidak dikirim sebagai bagian situs. Tampilan memakai CSS lokal, HTML semantik, dan grafik SVG dengan tabel setara. README ini belum memuat tangkapan layar produksi karena belum ada deployment publik yang diverifikasi.

## Pengembangan lokal

Gunakan Node **24.20.0**, sesuai `.nvmrc` dan `package.json`, serta dependensi terkunci di `package-lock.json`.

```bash
nvm use
npm ci
npm run dev
```

Buka alamat lokal yang dicetak Astro dengan base path `/kalbar-economic-atlas/`. `npm run build` menghasilkan `dist/`; `npm run preview` melayani hasilnya secara lokal. Pratinjau lokal tidak menyatakan situs telah dipublikasikan.

**Toolchain maintenance:** runtime proyek adalah Node 24.20.0, tetapi CI mempertahankan `actions/setup-node` v4 pada pin immutable `49933ea5288caeca8642d1e84afbd3f7d6820020` sampai lini Action Node 24 yang telah ditambal diverifikasi. Peningkatan Action harus mengubah workflow dan pengujian kebijakan terkait bersama-sama melalui tinjauan. Runtime Action dan versi Node yang dipasang untuk proyek adalah dua hal terpisah.

## Perintah verifikasi

```bash
npm ci
npm run check
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm audit --omit=dev
git diff --check
```

`npm run data:validate` memeriksa snapshot tanpa membangun situs. Build memvalidasi skema data serta allowlist artefak, sumber daya lokal, kode tema yang disetujui, batas 500 KiB per berkas dan 2 MiB total. Pengujian unit mencakup data, format, grafik, batas artefak, pemeriksaan sumber, dan kebijakan workflow. Pengujian browser mencakup route dan 404, unduhan, dua tema, desktop/seluler, keyboard, serta halaman tanpa JavaScript. `npm run verify` menggabungkan check, unit, build, dan browser; clean install, audit, dan pemeriksaan diff tetap dijalankan terpisah.

## Protokol pembaruan data

Data berasal dari snapshot yang masuk Git, divalidasi saat build, lalu diterbitkan sebagai HTML dan JSON statis. Browser tidak mengambil nilai langsung dari BPS. Ikuti [CONTRIBUTING.md](CONTRIBUTING.md): ekstraksi lintasan pertama, pembacaan independen lintasan kedua atas setiap nilai dan metadatanya, rujukan sumber tepat, checksum bila dapat direproduksi, diff terfokus, serta validasi skema/build/browser. Nilai baru tidak diterbitkan otomatis; pembaruan memerlukan tinjauan. Pemantauan sumber bulanan hanya memeriksa ketersediaan dan tidak mengubah data. Kegagalan akses ditinjau manual mengikuti [DATA_USE.md](DATA_USE.md).

## Aksesibilitas

Proyek menargetkan WCAG 2.2 AA: navigasi keyboard dengan fokus terlihat, tautan lewati konten, gerakan berkurang, dua tema, serta grafik dengan ringkasan teks dan tabel setara. Informasi inti tetap terbaca tanpa JavaScript. Pengujian otomatis membantu menemukan masalah; pemeriksaan pembaca layar nyata, zoom UI browser asli, dan perangkat seluler fisik masih menjadi gerbang manual sebelum rilis publik.

## Privasi

Situs tidak memakai analitik, pelacak, cookie, font eksternal, atau permintaan runtime ke pihak ketiga. Hanya pilihan tema `light`/`dark` yang sengaja disimpan dengan kunci `atlas-theme` di localStorage. Tautan sumber membuka situs BPS jika pembaca memilihnya; layanan hosting dan situs tujuan memiliki kebijakan masing-masing.

## Atribusi sumber

Katalog `data/pontianak/sources.json` dan unduhan situs menyimpan judul, penerbit, penulis bila tercantum, tanggal akses, URL asli langsung, serta rujukan tabel/halaman. Setiap indikator menautkan sumber dan mencatat periode, satuan, serta cakupan Kota Pontianak. Pertahankan atribusi ini saat memakai ulang ekstrak; tinjau [Ketentuan Penggunaan BPS Kota Pontianak](https://pontianakkota.bps.go.id/id/term-of-use) dan sumber aslinya.

## Pembagian lisensi

[LICENSE](LICENSE) (MIT) berlaku untuk kode asli proyek. Data turunan dan materi sumber BPS tidak dilisensikan ulang dengan MIT; penggunaan ulang mengikuti ketentuan BPS dan [DATA_USE.md](DATA_USE.md).

## Independensi

Proyek ini independen, tidak berafiliasi dengan, disponsori, dioperasikan, atau didukung oleh BPS maupun Pemerintah Kota Pontianak. Atribusi sumber tidak menyatakan dukungan lembaga.

## Status publikasi

Cabang ini adalah kandidat rilis lokal; belum ada publikasi atau deployment publik yang diverifikasi. Verifikasi lokal kandidat ini menggunakan Node 24.20.0; pengujian browser memakai Chromium 153 dan server statis lokal di lingkungan verifikasi. Jalur perintah browser standar dan CI jarak jauh masih belum terverifikasi. Audit produksi lokal setelah pembaruan dependensi transitif `undici` ke 8.10.2 melaporkan nol kerentanan pada 1 Oktober 2026; audit perlu dijalankan kembali untuk kandidat rilis berikutnya. Pemeriksaan manual aksesibilitas di atas serta perilaku 404, header JSON, dan smoke test pada hosting sebenarnya masih belum diverifikasi.

Pembuatan repositori publik `whizher/kalbar-economic-atlas`, push, pull request, merge, pengaturan Pages, dan deployment memerlukan instruksi pemilik tersendiri. Setelah keputusan publikasi, validasi PR bersifat baca saja; workflow Pages membangun dari `main` dan memisahkan kredensial deployment. Rilis publik menunggu tinjauan seluruh cabang, gerbang runtime/manual, dan verifikasi situs yang benar-benar di-host.
