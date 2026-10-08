# Atlas Ekonomi Pontianak

**Situs aktif: [Buka Atlas Ekonomi Pontianak](https://whizher.github.io/kalbar-economic-atlas/)**

Atlas v1 telah dipublikasikan melalui GitHub Pages. Jelajahi enam indikator Kota Pontianak, tren 2021–2025, penjelasan, sumber resmi, dan unduhan JSON tanpa perlu memasang proyek secara lokal.

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

Mockup desain adalah referensi pengerjaan dan tidak dikirim sebagai bagian situs. Tampilan memakai CSS lokal, HTML semantik, dan grafik SVG dengan tabel setara. [Situs aktif](https://whizher.github.io/kalbar-economic-atlas/) menampilkan implementasi yang telah dipublikasikan, termasuk tema terang dan gelap.

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

Proyek menargetkan WCAG 2.2 AA: navigasi keyboard dengan fokus terlihat, tautan lewati konten, gerakan berkurang, dua tema, serta grafik dengan ringkasan teks dan tabel setara. Informasi inti tetap terbaca tanpa JavaScript. Pengujian otomatis membantu menemukan masalah, tetapi tidak menggantikan pemeriksaan pembaca layar nyata, zoom UI browser asli, dan perangkat seluler fisik. Hasil dan keterbatasan pemeriksaan dicatat dalam bukti penerimaan rilis; publikasi situs bukan klaim sertifikasi WCAG.

## Privasi

Situs tidak memakai analitik, pelacak, cookie, font eksternal, atau permintaan runtime ke pihak ketiga. Hanya pilihan tema `light`/`dark` yang sengaja disimpan dengan kunci `atlas-theme` di localStorage. Tautan sumber membuka situs BPS jika pembaca memilihnya; layanan hosting dan situs tujuan memiliki kebijakan masing-masing.

## Atribusi sumber

Katalog `data/pontianak/sources.json` dan unduhan situs menyimpan judul, penerbit, penulis bila tercantum, tanggal akses, URL asli langsung, serta rujukan tabel/halaman. Setiap indikator menautkan sumber dan mencatat periode, satuan, serta cakupan Kota Pontianak. Pertahankan atribusi ini saat memakai ulang ekstrak; tinjau [Ketentuan Penggunaan BPS Kota Pontianak](https://pontianakkota.bps.go.id/id/term-of-use) dan sumber aslinya.

## Pembagian lisensi

[LICENSE](LICENSE) (MIT) berlaku untuk kode asli proyek. Data turunan dan materi sumber BPS tidak dilisensikan ulang dengan MIT; penggunaan ulang mengikuti ketentuan BPS dan [DATA_USE.md](DATA_USE.md).

## Independensi

Proyek ini independen, tidak berafiliasi dengan, disponsori, dioperasikan, atau didukung oleh BPS maupun Pemerintah Kota Pontianak. Atribusi sumber tidak menyatakan dukungan lembaga.

## Status publikasi

Atlas v1 telah dirilis di **[https://whizher.github.io/kalbar-economic-atlas/](https://whizher.github.io/kalbar-economic-atlas/)**. [PR #1](https://github.com/whizher/kalbar-economic-atlas/pull/1) telah digabungkan ke `main` pada 9 Oktober 2026 (WIB) dengan commit rilis `de619f7b92ecaad7854f94a2df384e539417dbbc`.

[Validasi GitHub-hosted untuk commit rilis](https://github.com/whizher/kalbar-economic-atlas/actions/runs/37822110488) dan [workflow Pages beserta smoke test hosting](https://github.com/whizher/kalbar-economic-atlas/actions/runs/37822110643) selesai dengan sukses. Jalur verifikasi menggunakan Node 24.20.0, Chromium bawaan Playwright, dan konfigurasi proyek yang normal. Pemeriksaan langsung situs aktif juga mengonfirmasi keenam halaman, respons 404 untuk route yang tidak ada, serta kedua unduhan JSON dengan header `application/json`.

**Audit dependensi tidak bersih:** audit produksi terakhir masih melaporkan satu temuan **HIGH** pada `http-cache-semantics`. Pemilik menerima disposisi risiko terbatas untuk arsitektur situs statis ini; penerimaan tersebut bukan pernyataan bahwa paket aman atau sudah ditambal. Disposisi hanya berlaku tanpa SSR, sesi, cache respons bersama atau terautentikasi, penggunaan gambar jarak jauh Astro, maupun input build yang tidak tepercaya. Nilai ulang jika kondisi tersebut berubah; tinjauan rilis perbaikan upstream tetap menjadi pekerjaan pemeliharaan.

Perubahan berikutnya diajukan melalui pull request dan verifikasi. Workflow Pages membangun dari `main` serta memisahkan kredensial deployment; penggabungan perubahan ke `main` akan memicu publikasi ulang. Bukti historis verifikasi dan keterbatasan penerimaan rilis tetap dipertahankan.
