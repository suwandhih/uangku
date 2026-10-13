# 📖 PANDUAN — UangKu (versi HP)

> **Untuk siapa:** Bapak. Bahasa awam, tanpa istilah teknis.
> **Berlaku untuk:** `uangku.html` — aplikasi versi HP (Android), dibuka lewat **Chrome**.
> **Sifatnya:** **HANYA MELIHAT** (baca saja). Mencatat transaksi tetap di komputer.
> **Dokumen pasangan:** `agents.md` (aturan kerja AI) · `rencanakerja.md` (rencana) · `prompt.md` (cetak biru)

---

## 1. 🚀 Cara menjalankan (3 langkah)

```
① Di komputer :  node tools\siapkan-data.cjs
② Kirim uangku.html ke HP   (WhatsApp / Telegram / kabel)
③ Di HP       :  buka dengan Chrome   →   UangKu langsung jalan
```

> 💡 **Tidak butuh internet, tidak butuh server.** Semua angka sudah "tertanam" di dalam berkas itu.
> Jadi bisa dibuka di mana saja — bahkan tanpa sinyal.

**Kalau angkanya ingin diperbarui:** ulangi langkah ① dan ② (jalankan alat, kirim ulang berkasnya).

---

## 2. 🧭 Pindah halaman — pakai TAB BAWAH

Selalu ada 3 tab di paling bawah layar:

| Tab | Isinya |
|---|---|
| **📊 Dashboard** | Halaman pertama. Daftar semua kotak uang + saldo, total, ringkasan, bunga & pajak, transaksi terbaru |
| **🧾 Transaksi** | Semua catatan uang — bisa disaring & diurut |
| **⚙️ Pengaturan** | Daftar Fund · Daftar Tag · Pajak & Bunga · Bahasa · Daftar Istilah · Tentang |

> ⬅️ **Pindah halaman cukup tekan tab bawah.** Tidak ada tombol pintas di dalam halaman
> (supaya tidak dobel dan membingungkan).

---

## 3. 📊 Dashboard (halaman pertama)

Begitu dibuka, yang terlihat berurutan:

| Urutan | Isi |
|---|---|
| **①** | **SUMBER FUND · SALDO AKHIR** — semua kotak uang + saldo akhirnya (mis. 🏦 Superbank **22.057.864,95**) |
| ② | ⚠️ Peringatan kalau ada kotak uang **di bawah saldo minimum** (muncul hanya kalau ada) |
| ③ | **Total semua fund** + Tersedia / Diblokir 🔒 / Titipan 👥 |
| ④ | **Ringkasan bulan ini** — Masuk · Keluar · Selisih |
| ⑤ | **Bunga & pajak bulan ini** — bunga, pajak, bunga neto (cocok mutasi bank) |
| ⑥ | **Transaksi terbaru** (4 catatan terakhir) |

**Arti tanda di kartu kotak uang:**

| Tanda | Arti |
|---|---|
| 🔒 | **Diblokir** — uangnya ada, tapi tidak untuk dipakai sehari-hari |
| 👥 | **Titipan** — uang orang lain yang numpang lewat (bukan milik Bapak) |
| **awal …** | Saldo awal bulan itu |
| **· 126 tx** | Jumlah catatan di kotak uang itu bulan ini |

> 📌 **Nama kotak uang boleh terpotong** dengan tanda `…` supaya semua muat dalam satu layar.
> Nama lengkap tetap bisa dibaca: **tekan lama** kartunya (muncul tulisan kecil).

---

## 4. 🧾 Transaksi (semua catatan uang)

### a. Pilih kotak uang dulu

Yang tampak hanya **satu baris** — nama kotak uang yang sedang dipilih (atau **"Semua Fund"**).

```
Klik baris itu            →  daftar kotak uang TERBUKA
Pilih "🏦 Superbank"      →  daftar MENUTUP lagi, barisnya berganti jadi Superbank
```

Setelah satu kotak uang dipilih, yang tampil **hanya transaksi kotak uang itu** —
uang masuk **dan** uang keluar sekaligus.

Di bawah baris itu muncul **kotak saldo**:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Saldo awal   │ Masuk        │ Keluar       │ Saldo akhir  │
│ 16,31 jt     │ +16,56 jt    │ −10,82 jt    │ 22,06 jt     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### b. Empat cara mengurutkan

| Tombol | Hasil |
|---|---|
| **📅 Tanggal** | Dikelompokkan **per hari** (Kamis, 24 September 2026) — seperti biasa |
| **🏷️ Tag** | Dikelompokkan **per tag** (Transfer, Bunga, Rumah, …), yang paling banyak di atas. Tiap kelompok ada **totalnya** |
| **＋ Masuk** | Satu daftar lurus — **jumlah terbesar di atas** |
| **− Keluar** | Sama, untuk uang keluar |

### c. Mencari

Kotak **🔎 Cari keterangan…** — bisa mencari dari **keterangan**, **tag**, atau **nama kotak uang**.

### d. Membaca satu baris

```
🏠  BATERAI PANASONIC CR2 3V              −42.650
    Rumah · SeaBank · 24 Sep 2026          keluar
```

| Bagian | Arti |
|---|---|
| Emoji kiri | Ikon **tag** (🏠 Rumah, 👤 Pribadi, 🐕 Pet, 🚗 Mobil, 🌸 Bunga, …) |
| Baris atas | Keterangan transaksi |
| Baris kecil | **Tag · kotak uang · tanggal** |
| Kanan atas | Jumlah — `+` masuk · `−` keluar |
| Kanan bawah | `masuk` / `keluar` |

**Tanda tambahan yang mungkin muncul:**

| Tanda | Arti |
|---|---|
| **⇄** | Transaksi ini punya **pasangan** (mis. transfer: keluar dari satu kotak, masuk ke kotak lain) |
| **pajak** | Transaksi ini kena pajak |
| **2 catatan** | Kartu yang menyatukan pasangan (bunga + pajak, atau transfer) |

> **Tekan satu baris** → masuk halaman **Rincian** (semua keterangan lengkap: tag, fund, tanggal, nomor).

---

## 5. ⚙️ Pengaturan

| Menu | Isi |
|---|---|
| 💰 **Daftar Fund** | Semua kotak uang + saldo akhirnya, dalam **kartu grid** |
| 🏷️ **Daftar Tag** | 15 tag + arahnya (masuk/keluar) + jumlah catatan |
| 🧾 **Pajak & Bunga** | Rate pajak & bunga bank |
| 🌐 **Bahasa** | Indonesia ↔ English |
| 📖 **Daftar Istilah** | Padanan istilah keuangan Indonesia–Inggris |
| ℹ️ **Tentang** | Keterangan berkas ini |

**Tombol pilih jumlah kolom** (di Daftar Fund & Daftar Tag): **Otomatis (n) · 3 · 4 · 5**.
Jumlah kolom itu berlaku **di tiga tempat sekaligus** — Dashboard, Daftar Fund, dan daftar kotak uang di Transaksi.

---

## 6. 🌐 Mengganti bahasa (Indonesia ↔ English)

**Pengaturan → 🌐 Bahasa → pilih English.**

Yang ikut berganti: judul halaman, tab bawah, ringkasan Dashboard, tombol, dan kalimat.
Yang **TIDAK** berganti: **nama kotak uang** & **nama tag** (supaya laporan tetap sama) dan **angka**.

---

## 7. 💡 Hal penting yang perlu diketahui

| Hal | Keterangan |
|---|---|
| **Hanya melihat** | Versi HP ini **baca saja**. Tombol **＋** akan bilang: mencatat dilakukan di komputer |
| **Angka pasti sama dengan PC** | Angka HP memakai aturan yang sama dengan `core/saldo.ts`. Kalau berbeda → itu **bug**, bukan beda tampilan |
| **3 bulan** | Berisi 3 bulan terakhir (September, Agustus, Juli 2026) |
| **Bulan lain** | Bisa dipilih di **Pengaturan → Bulan** |
| **Terang / gelap** | Bisa dipilih di Pengaturan |
| **Simpan ke layar utama** | Bisa — supaya seperti aplikasi biasa (ada di Pengaturan) |

---

## 8. 🔴 Kalau ada yang aneh

| Gejala | Yang dicek |
|---|---|
| Angka tidak muncul / kosong | Berkas belum diisi data → jalankan `node tools\siapkan-data.cjs`, kirim ulang |
| Angka beda dengan komputer | **Laporkan** — itu bug (aturan C18) |
| Tampilan terpotong | Putar HP / kecilkan huruf di Chrome, lalu laporkan |

---

## 9. 📌 Yang BELUM ada (jangan heran)

| Hal | Keadaan |
|---|---|
| **Mencatat / mengedit transaksi dari HP** | ⬜ Belum — sengaja, supaya angka HP & PC tidak bentrok |
| **Aplikasi versi komputer (PC)** | ⬜ Belum dibuat (berikutnya **T2 — Transaksi Sederhana**) |
| **Sinkronisasi otomatis** | ⬜ Belum — cukup **1× salinan akhir** setelah UangKu benar |
| **Jembatan cloud Layerbase** | ⬜ Akun sudah ada, database belum dibuat |

---

*Panduan ini dibuat 25 September 2026. Kalau ada tampilan yang berubah,
panduan ini ikut diperbarui (aturan D1 di `agents.md`).*
