# 📜 CHANGELOG — UangKu

> **Untuk siapa:** Bapak. Dibaca kalau ingin tahu **apa yang berubah** tanpa membuka kode.
> **Cara baca:** terbaru di **paling atas**. Tanda: ✅ selesai · 🔴 bug diperbaiki · 🆕 hal baru.
> **Dokumen pasangan:** `agents.md` (aturan kerja) · `rencanakerja.md` (papan order) · `prompt.md` (cetak biru)

---

## 13 Oktober 2026 — 🎉 UangKu SIAP DIPAKAI SETIAP HARI

> **Alamat:** https://suwandhih.github.io/uangku/uangku-cloud.html
> **PIN:** ada di berkas **`PIN-UangKu.txt`** di komputer — **sengaja tidak ditulis di dokumen ini**,
> karena dokumen ini ikut ke GitHub yang **publik**.
> Bisa dibuka dari **PC maupun HP**. Yang dicatat di situ **langsung tersimpan di server**.

### ✅ Data sudah pindah — dan sudah dibuktikan sama

- ✅ Seluruh isi `c:\data\keuangan` dipindah ke server: **1.889 transaksi · 21 fund · 20 tag · 225 snapshot · 63 rutin · 1.817 riwayat**
- ✅ Dibuktikan **IDENTIK 100%** dengan alat baru [cek-sama-cloud.cjs](c:/data/UangKu/tools/cek-sama-cloud.cjs) — membandingkan **setiap baris & setiap kolom** 15 tabel antara `keuangan.db` ↔ `uangku.db` ↔ server, plus 18 saldo fund
- ✅ Total Oktober 2026: **Rp 293.720.428,64** — sama persis di ketiga tempat
- 🔴 `keuangan.db` tetap **hanya dibaca** — tidak pernah diubah

### 🆕 Halaman baru: `uangku-cloud.html`

- 🆕 Dibuka dari GitHub, **tanpa memasang apa pun**. Semua fitur UangKu yang sudah Bapak pakai **dipakai apa adanya** — yang berganti hanya dari mana angkanya datang
- 🔐 **Gerbang PIN** — tanpa PIN yang benar, data tidak bisa dibaca
- ✅ Dashboard · Transaksi (4 urutan + pencarian + penyaring) · Catat · Pengaturan (Bulan · Daftar Fund · Daftar Tag · Pajak & Bunga · Bahasa · Daftar Istilah · Tentang) · **Riwayat**
- ✅ **Bahasa Indonesia ↔ English** tetap jalan
- ✅ Tampilan **sama persis** dengan versi lama — diuji di 360/390/430/560/960 px: jumlah kolom, lebar kartu, dan angka **identik**

### 🆕 Bisa MENCATAT dari HP (sebelumnya hanya melihat)

- 🆕 Tombol **＋** di Transaksi → isi tanggal, keterangan, fund, tag, jumlah → **Simpan** → langsung masuk server
- 🆕 Satu tindakan boleh berisi **beberapa jurnal** (mis. transfer = 2 baris)
- 🆕 **Batalkan** per transaksi — saldo langsung kembali
- 🆕 Layar **Riwayat** — semua catat/ubah/batalkan tercatat, dan bisa **dipulihkan**
- ✅ Uji nyata: catat → jumlah naik · batalkan → kembali · pulihkan → naik lagi · **tanpa galat**

### 🆕 Buka Bulan Baru — supaya bisa mencatat mulai 1 November

- 🔴 **Masalah nyata yang ditemukan:** saldo awal tiap bulan disimpan di tabel `monthly_snapshots`. Isinya **berhenti di Oktober 2026** — jadi mulai **1 November Bapak tidak bisa mencatat sama sekali**
- 🆕 Menu **Pengaturan → 📅 Bulan Baru** → tombol **Buka bulan baru**
- ✅ Cara kerjanya: saldo awal bulan baru = saldo akhir bulan terakhir, lalu bulan lama **dikunci**
- ✅ Diuji: November dibuat dari Oktober → **18 dari 18 fund cocok** · Oktober terkunci
- 🆕 **Pita peringatan di Dashboard** muncul sendiri kalau bulan berjalan belum dibuka, lengkap dengan tombol **Buka sekarang**

### 🔒 Keamanan

- ✅ PIN salah / kosong → **ditolak** (401). Sudah diuji
- ✅ Repo GitHub **publik** tapi **tidak memuat data keuangan**: `uangku.html`, `lab-uang2.html`, `data/`, dan `.env` dikecualikan
- ✅ Diperiksa: tidak ada kunci API yang bocor, tidak ada angka saldo asli di berkas yang di-upload

### 🔴 Bug yang diperbaiki hari ini

- 🔴 Angka pembanding uji September 2026 sudah basi (keuangan bertambah 234 → 307 transaksi). UangKu sendiri **sudah benar** — yang salah hanya angka ujinya. Sekarang **99 uji lolos, 0 gagal**
- 🔴 Tombol "Buka bulan baru" sempat membuat galat karena dipasang sebelum tombolnya ada. Sekarang memakai satu pendengar klik di seluruh halaman
- 🔴 Layar **Tentang** masih berbunyi *"tidak butuh server dan tidak butuh internet"* — sekarang jujur: *"angkanya diambil dari server setiap kali dibuka"*
- 🔴 `wrangler.jsonc` sampah (dibuat otomatis) menutupi konfigurasi yang benar → dihapus

### ⚠️ Yang perlu Bapak tahu

- ⚠️ **Setiap awal bulan**, buka **Pengaturan → 📅 Bulan Baru → Buka bulan baru** sebelum mencatat. Kalau lupa, Dashboard akan mengingatkan
- ⚠️ Kalau Bapak masih mencatat di `c:\data\keuangan`, jalankan `node tools\salinan-kerja.cjs` lalu `node tools\siapkan-cloud.cjs --ulang` supaya server ikut terbarui
- ⚠️ Belum ada batas percobaan PIN (kalau PIN salah berkali-kali, tidak ada penguncian)

---

## 8 Oktober 2026

### 🗓️ Status akhir hari (8 Okt 2026)

- ✅ Hari ini: transaksi Oktober di HP, Layerbase (PostgreSQL + Worker baca saja), cadangan PC, konsep penghitungan Masuk (K30), layar Catat (TES)
- ⏳ Besok (K31): tes data Oktober — bandingkan angka dengan keuangan, lalu catat tes di layar Catat
- ⚠️ Belum siap untuk data sungguhan (K32): input resmi ke `uangku.db`, rollback resmi, peringatan penerimaan vs Transfer, tag bermasalah, Hutang/Reimburse
- 🔴 Keuangan tetap sumber utama sampai UangKu siap

### 🧪 Layar Catat (TES) di uangku.html

- 🔴 **Perbaikan:** Total masuk sebelumnya menjumlahkan **semua** baris D, termasuk Transfer (uang numpang lewat). Sekarang **Total masuk / keluar hanya dari tag yang dihitung** (Transfer, Koreksi, Pinjam, Hutang, Reimburse tidak dihitung). Contoh Bapak: 10jt masuk, bukan 20jt
- ✅ Angka `10.000.000,00` (titik ribuan dan koma desimal) terbaca benar
- 🔴 Lab (`lab-uang2.html`) memakai logika ringkasan yang sama dan ikut diperbaiki

- 🆕 Tombol ＋ di Transaksi membuka layar **Catat (tes)** — satu transaksi bisa 1–6 jurnal, tiap jurnal punya fund, tag, dan D/K (tag tetap mengunci arah)
- 💾 Data tes disimpan **di browser ini saja** (`localStorage`), **bukan** di `uangku.db`
- 🔁 Data tes ikut tampil di daftar Transaksi dan saldo fund. Ringkasan Dashboard belum ikut
- ↩️ Setiap data tes bisa dibatalkan, dan saldo kembali seperti semula
- ✅ Uji: simpan 3 jurnal → Superbank +1.000.000 · Oktober 83 → 86 transaksi · batalkan → kembali identik · tanpa galat · 360 px tanpa geser
- ⚠️ Ini hanya tes. Penyimpanan resmi tetap di `uangku.db` lewat aplikasi PC

### 🏦 Transaksi: fund awal = Superbank

- ✅ Layar Transaksi sekarang dibuka dengan **Superbank** (bukan semua fund), sesuai rekomendasi Bapak
- ✅ Ganti bulan dan geser bulan juga kembali ke Superbank. Pilihan "Semua Fund" tetap ada
- ✅ Uji: Oktober 44 baris · September 161 baris · tanpa galat · tanpa geser

### ☁️ Worker UangKu (perantara Layerbase, baca saja)

- 🆕 Cloudflare Worker `uangku-api` (kode: [worker.js](c:/data/UangKu/cloudflare/worker.js), [wrangler.toml](c:/data/UangKu/cloudflare/wrangler.toml)). Browser tidak memegang kunci Layerbase
- 🔐 Kunci Layerbase dan PIN disimpan sebagai **secret** Cloudflare. PIN juga ada di `.env` (`LB_PIN`) di PC
- 🔒 Hanya perintah tetap (fund, tag, snapshot, transaksi per bulan). Tidak ada SQL dari luar
- ✅ Uji 5/5: PIN salah → 401 · PIN benar → 200 · bulan tidak valid → 400 · Oktober 83 transaksi · CORS untuk berkas lokal
- ⚠️ Belum ada pembatas percobaan PIN. Perlu aturan rate-limit di Cloudflare
- ⚠️ Pengecualian aturan C18 (tanpa server) disetujui Bapak untuk jalur cloud ini

### ☁️ Jembatan Layerbase — keputusan

- ✅ Uji CORS (8 Okt): SQLite via API query **diblokir** untuk browser HP · Neon SQL (PostgreSQL) **diizinkan** (ACAO: *)
- ✅ **Keputusan Bapak: PostgreSQL di Layerbase, HP baca langsung.** PC tetap sumber utama; HP hanya membaca dan menulis ke kotak masuk
- ✅ Database PostgreSQL `uangku` dibuat di Layerbase (8 Okt, akun Bapak)
- ⚠️ Peran buatan SQL (`uangku_pc`, `uangku_baca`, `uangku_kirim`) belum bisa login lewat pooler Layerbase. Owner `postgres` bisa login. Menunggu keputusan cara membuat pengguna database
- ✅ **Cadangan PC → Layerbase** (`tools/cadangan-layerbase.cjs`, skema `cadangan_202610081330`): 15 tabel, jumlah baris dan total transaksi serta saldo awal **cocok**. Tiap jalan membuat skema baru, skema lama tidak dihapus
- 📦 Paket `pg` ditambahkan ke proyek (untuk cadangan). Kredensial owner hanya di `.env` di PC

### 📜 Aturan kerja & papan order

- 🆕 Aturan umum dari proyek Peta Dunia disalin ke [agents.md](c:/data/UangKu/agents.md) (4 aturan utama · A–E · G · H). Bagian F & I khusus peta tidak disalin
- 🆕 Orderan hari ini dicatat di [rencanakerja.md](c:/data/UangKu/rencanakerja.md) **K19–K25**; yang sudah dikerjakan diberi ✅
- 🔁 B-16 (checkpoint pajak) direvisi menjadi semi-otomatis (K22). B-17 (baris vertikal) direvisi menjadi tabel (K19)
- ✅ **Aturan ANodes dihapus** dari `agents.md` UangKu (proyek lain, tidak berlaku di sini). Sekarang 3 aturan utama
- ✅ **Keputusan Bapak — dokumen:** diperbarui **sekali di akhir sesi** (D2), bukan tiap butir. Setiap perbaikan/penambahan **wajib menyebut perkiraan waktu sebelum mulai** (B5)

### 🧪 LAB multi-jurnal (berkas terpisah, belum dipasang ke UangKu)

- 🆕 [lab-uang2.html](c:/data/UangKu/lab-uang2.html) — satu transaksi bisa berisi **1–6 jurnal** (sesuai catatan bank)
- Tiap jurnal = fund · D/K · jumlah. Total D, total K, dan saldo per fund ditampilkan **untuk dilacak**, tidak diblokir
- Daftar menampilkan satu transaksi dengan semua jurnalnya, dan contoh data asli Oktober
- 🔴 Tidak tersambung ke `uangku.html`, tidak menyimpan apa pun. Data = salinan UangKu Oktober (8 Okt)
- ✅ Uji (layar 288 px): tambah, hapus, ganti D/K, batas 6 baris, pratinjau, pindah layar · tanpa galat · tanpa geser ke samping
- 🆕 **Tag per jurnal** (bukan per transaksi): tiap baris punya tag sendiri, sesuai database (1 baris = 1 catatan)
- 🔒 Tag tetap (RMH, PRB, PET, MBL, BNG, PDP, BNS, …) **mengunci** arah D/K. Tag dua arah (TRF, PNJ, HTG, RMB) arah dipilih manual
- 🏷️ **Singkatan tag** untuk layar sempit (RMH, PRB, TRF, PDP, …)
- ↩️ Ringkasan dikembalikan sederhana: Total masuk (D) · Total keluar (K) · saldo per fund · Selisih D − K
- ✅ **Keputusan Bapak:** Hutang & Reimburse = **dua arah, dipilih manual** (ikut `agents.md`). Tabel tag di database (K/D tetap) perlu disesuaikan nanti
- ✅ **Keputusan Bapak — bunga & pajak (semi-otomatis):** bunga tabungan 5% p.a, deposito 7,5% p.a (rate wajib diisi). Bunga (D, tag Bunga) → usulan pajak 20% (K, tag Pajak). Bapak memeriksa, boleh ubah, lalu konfirmasi → satu aksi, ada riwayat, bisa dibatalkan
- ✅ **Keputusan Bapak — urutan:** Transaksi dulu (semua input di Transaksi), baru plugin **Reimburse** (bayar hutang) dan plugin **Belanja**. Plugin hanya membuat transaksi lewat inti

### ✅ Data Oktober 2026 masuk ke UangKu (salin ulang dari keuangan)

- 🆕 Oktober 2026: **83 transaksi aktif** (2 yang dihapus tidak ikut) · saldo awal 18 fund dari snapshot produksi
- 🔁 September ikut diperbarui: **234 → 307** transaksi (keuangan masih dipakai, sudah bertambah sejak 25 Sep)
- ✅ Juli & Agustus sudah cocok dan tidak berubah
- ✅ **Cocok 100% dengan keuangan:** transaksi, jurnal, fund, tag, snapshot, rutin (baris per baris, hash sama)
- ✅ Rantai saldo: saldo akhir September = saldo awal Oktober di **18 dari 18 fund**
- 🔁 HP menampilkan **4 bulan**: Okt (83) · Sep (307) · Agu (323) · Jul (345) — `BULAN_MAKS = 4` di [siapkan-data.cjs](c:/data/UangKu/tools/siapkan-data.cjs)
- ✅ Uji di HP file: keempat bulan dibuka, jumlah baris sesuai, tanpa geser ke samping, tanpa galat
- 💾 Cadangan: `data\backups\uangku-20261008-*-sebelum-salin-ulang.db` dan `uangku-lama-*.db` (salinan 25 Sep)

### ✅ Daftar transaksi jadi TABEL (meniru Transaksi di keuangan)

- 🔴 **Halaman "Rincian" dihapus** — ketuk baris tidak lagi membuka daftar label & nilai
- 🆕 Daftar transaksi berbentuk **tabel**: `Tgl · Keterangan · Tipe (D/K) · Jumlah`
- 🆕 **Fund & Tag** ada di **baris kedua** di bawah Keterangan (ukuran HP tidak muat jadi kolom sendiri)
- 🆕 Keterangan panjang dipotong 2 baris — nama lengkap ada di **tahan lama** (tooltip)
- 🆕 Transfer berpasangan ⇄ ditandai, dan baris pasangannya **berdampingan**
- 🔁 Empat cara urut tetap: **Tanggal · Tag · Masuk ＋ · Keluar −**
- 🔁 **Transaksi terbaru** di Dashboard memakai tabel yang sama
- 🧹 Kode lama dihapus: halaman Rincian, tampilan baris vertikal, teks "Rincian/Arah"
- ✅ **Uji (layar 312 px):** 234 transaksi September utuh · Tanggal 234 · Tag 234 · Masuk 118 + Keluar 116 · tanpa galat JS · tanpa geser ke samping · 234 angka utuh
- 💾 **Cadangan sebelum perubahan:** `data\backups\uangku-20261008-1751-sebelum-tabel-tx.html` (+ `.db`) — kembalikan dengan menyalin berkas `.html` itu kembali ke `uangku.html`

---

## 25 September 2026

### ✅ T1 — FONDASI SELESAI (kode pertama UangKu)

- 🆕 `server/core/` **5 berkas** — satu-satunya tempat aturan:
  | Berkas | Isi |
  |---|---|
  | `uang.ts` | pembulatan & format Rupiah |
  | `periode.ts` | aturan tanggal & bulan (batas **awal DAN akhir**) |
  | `saldo.ts` | rumus saldo (Saldo Awal + Debit − Kredit) |
  | `bunga.ts` | bunga, pajak, pembulatan **sen** |
  | `aturan.ts` | validasi (saldo minimum, tanggal, transfer ke diri sendiri) |
- 🆕 `server/db/index.ts` + `server/uji/` **5 berkas uji**
- ✅ **99 uji LOLOS, 0 gagal** (`npm run uji`) · `npm run cek` (TypeScript) bersih
- ✅ **Bukti:** 18/18 saldo fund **cocok 100%** dengan sistem keuangan · total **288.175.713** · awal **280.941.750**
- 🔴 **Rate kosong DITOLAK** — mencegah bug lama (tabungan diam-diam pakai rate deposito 7,5% → bunga 1,5× lebih besar)
- 🆕 `tools/salinan-kerja.cjs` — salinan `keuangan.db` → `uangku.db` lewat **API backup SQLite** (bukan copy file mentah, supaya WAL ikut terbawa)
- 🧹 **2 skrip mati DIHAPUS** (`baca-keuangan.cjs` · `hitung-saldo.cjs`) + hasilnya — duplikat, bisa bikin perhitungan kacau

### ✅ Versi HP `uangku.html` SELESAI

- 🆕 Berkas **MANDIRI** — tanpa server, tanpa internet, tanpa `node_modules`. Buka lewat Chrome di HP
- Isi **3 bulan**: September 2026 (234 tx) · Agustus (323 tx) · Juli (345 tx) · 18 fund · 15 tag
- 🆕 `tools/siapkan-data.cjs` — pengisi data: `uangku.db` → suntik ke dalam `uangku.html`
- **Sifat: BACA SAJA** (hanya melihat) — mencatat tetap di komputer
- 🔴 **3 bug diperbaiki saat uji:**
  1. Tab bawah tidak bisa ditekan (`100dvh` tak dikenali) → ditambah fallback `100vh`
  2. Pasangan transfer tidak menyatu (`transfer_pair_id` menunjuk **id pasangan**, bukan nomor grup)
  3. Nama fund terpotong di layar sempit → `flex-wrap`

### ✅ 5× revisi tampilan (permintaan Bapak)

| # | Revisi | Hasil |
|---|---|---|
| 1 | Chip source fund di Transaksi → **grid hemat ruang** | Tertutup **32 px** (dulu ±295 px) = **hemat 263 px** |
| 2 | Daftar Fund & Tag → **kartu grid** | **Semua fund terlihat sekaligus** walau bertambah banyak |
| 3 | Tombol Transaksi **dobel** di Dashboard dihapus | Tinggal 1 tombol |
| 4 | Kartu saldo fund → **4 kolom sejajar** | `Saldo awal · Masuk · Keluar · Saldo akhir` · 🔒 **disetujui → BEKU** |
| 5 | Layar Transaksi → **4 cara urut** | **📅 Tanggal · 🏷️ Tag · ＋ Masuk · − Keluar** |
| 6 | Tombol **"Lihat semua transaksi"** dihapus | Pindah halaman cukup **tab bawah** |
| 7 | **Daftar fund di PALING ATAS Dashboard** | 18 fund + saldo akhir, tanpa di-hide |

- 🔴 **Bug nyata diperbaiki:** mode **Tag** menampilkan **240 baris padahal total 234** — pasangan **Bunga + Pajak** (tag berbeda) tergambar dua kali
- 🔴 **Bug nyata diperbaiki:** **Dashboard 3 kolom vs Daftar Fund 4 kolom** padahal lebar layar sama — sebab `hitungKolom()` punya cadangan lebar yang rapuh
- 🔴 **Regresi diperbaiki:** kartu terlalu sempit → angka `22.057.864,95` turun baris & "Superbank" terpotong `Superba/nk` → batas lebar aman **72 → 96 px**

### ✅ Dokumen dirapikan

- 🆕 `prompt.md` **selesai** — cetak biru 17 bagian (untuk AI mana pun)
- 🆕 `CHANGELOG.md` (berkas ini) + `panduan.md` — sesuai standar dokumentasi
- 🧹 **11 dokumen lama dihapus** dari folder ini (isinya dipindah ke 3 dokumen induk). Salinan asli tetap aman di `c:\data\keuangan`
- 🔴 **Angka SALAH di `prompt.md` dikoreksi:** keluar ~~7.009.382~~ → **7.340.614,86** · selisih ~~+7.182.479~~ → **+6.851.246,51** (angka lama menganggap Pajak dikecualikan — padahal **tidak**)

### ✅ Aturan kerja baru (di `agents.md`)

| Kode | Isi |
|---|---|
| **A2** | 🔍 **WAJIB DEBUG DULU** sebelum Bapak menguji — debug **fokus** (setiap revisi, cepat) vs **menyeluruh** (sesekali, minta izin) |
| **A3** | 📢 **Jangan biarkan chat seperti freeze** — tulis kalimat pendek sebelum tiap langkah |
| **C19** | 🔗 **Satu tampilan = satu fungsi, dipakai bersama** (dilarang dua versi → itulah bug kolom beda) |
| **C20** | ⬅️ **Pindah halaman = tab bawah saja** |

---

## 24 September 2026

- ✅ `agents.md` + `rencanakerja.md` ditulis ulang jadi dokumen induk (konsep tag, bunga, tampilan, panduan lama dipindah ke sini)
- ✅ Bug saldo Dashboard (filter tanggal tanpa batas akhir) — **11 titik** diperbaiki, 18/18 fund cocok
- ✅ Bug rutin "kopi kapal api" jadwal lompat ke 2027 + transaksi tercatat 8 Desember
- ✅ Pencegahan: validasi tanggal bayar + hitung ulang jadwal
- ✅ Ditemukan: tag `Bunga` dikenali **lewat nama** → Report Bunga Rp 0 padahal nyata Rp 6.466.857 → perlu kolom `code`

---

*Catatan: perubahan sebelum 24 Sep 2026 ada di sistem lama `c:\data\keuangan`
(lihat `changelog.json` di sana).*
