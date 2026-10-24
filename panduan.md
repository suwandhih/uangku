# 📖 PANDUAN — UangKu

> **Untuk siapa:** Bapak. Bahasa awam, tanpa istilah teknis.
> **Berlaku untuk:** **`uangku-cloud.html`** — halaman yang Bapak pakai setiap hari (13 Okt 2026).
> **Sifatnya:** **BISA MELIHAT dan BISA MENCATAT.** Yang dicatat langsung tersimpan di server.
> **Dokumen pasangan:** `agents.md` (aturan kerja AI) · `rencanakerja.md` (rencana) · `prompt.md` (cetak biru)

---

## 1. 🚀 Cara membuka (2 langkah)

```
① Buka Chrome (di HP atau di komputer)
② Ketik / tekan simpanan:   https://suwandhih.github.io/uangku/uangku-cloud.html
③ Masukkan PIN: lihat berkas PIN-UangKu.txt   →  tekan "Simpan & sambung"
```

> 💡 **PIN hanya perlu dimasukkan sekali.** Sesudah itu HP mengingatnya sendiri.
> **PIN disimpan di perangkat Bapak saja** — tidak dikirim ke mana-mana.

**Supaya seperti aplikasi (tidak perlu ketik alamat lagi):**
di Chrome tekan menu **⋮** → **"Tambahkan ke layar utama"**. Nanti ada ikon UangKu di layar HP.

> 🔴 **Bisa dibuka dari komputer DAN HP, angkanya selalu sama** — karena datanya satu, di server.
> Yang Bapak catat di HP langsung terlihat di komputer, dan sebaliknya.

### ⚠️ Kalau PIN salah

Muncul tulisan **"PIN salah"**. Coba lagi. Kalau lupa PIN, buka berkas **`PIN-UangKu.txt`** di komputer —
PIN tertulis di situ. **PIN tidak berubah sendiri**, jadi yang tertulis di berkas itu selalu berlaku.

---

## 1b. 📅 SETIAP AWAL BULAN — jangan lupa!

> 🔴 **Ini penting.** Kalau bulan baru belum dibuka, Bapak **tidak bisa mencatat**.

```
Pengaturan  →  📅 Bulan Baru  →  tombol "Buka bulan baru"
```

Yang terjadi: saldo akhir bulan lalu **otomatis jadi saldo awal** bulan baru, lalu bulan lama **dikunci**
(tidak bisa diubah lagi). Selesai — tinggal mencatat seperti biasa.

> 💡 **Kalau lupa, Dashboard akan mengingatkan sendiri** — muncul pita kuning
> *"⚠️ Bulan ini belum dibuka"* lengkap dengan tombol **Buka sekarang**.
> Jadi Bapak tidak akan terjebak tidak bisa mencatat.

---

## 1c. ✍️ Cara MENCATAT transaksi

```
Transaksi  →  tekan tombol ＋ (kanan atas)  →  isi  →  Simpan
```

| Yang diisi | Keterangan |
|---|---|
| **Tanggal** | Sudah terisi hari ini. Bisa diganti |
| **Keterangan** | Mis. "makan siang", "biaya admin" |
| **Fund** | Kotak uangnya — ditulis **penuh** (`Superbank`, `SeaBank`, …) |
| **Tag** | Untuk apa — ini yang menentukan artinya. 🔴 **WAJIB diganti** — jangan dibiarkan |
| **Debit / Kredit** | Masuk (Debit) atau keluar (Kredit). **Untuk sebagian besar tag, ini terisi sendiri dan tidak bisa ditekan** |
| **Jumlah** | Angkanya saja, mis. `30000` — titik ribuan muncul sendiri saat mengetik, dan `,00` ditambahkan otomatis saat pindah kotak |

> 💰 **Angka selalu 2 desimal.** `30000` → **`30.000,00`** · `30000,5` → **`30.000,50`** ·
> `0,05` → `0,05`. Berlaku di semua tempat (kartu fund, ringkasan, daftar transaksi, riwayat).
> Saat **masih mengetik** tidak dipaksa `,00` supaya tidak mengganggu.

> 💡 **Satu tindakan boleh berisi beberapa baris.** Contoh: transfer Superbank → SeaBank
> = 2 baris (Superbank keluar, SeaBank masuk). Tekan **"＋ Tambah baris jurnal"**.

### 🧾 Satu baris saja — hemat ruang

Sejak 13 Okt 2026, **satu catatan bank = satu baris**:

```
[ Superbank ▾ ] [ 🏠Rumah ▾ ] [ Kredit ] [        30.000 ] [ ✕ ]
     fund            tag         arah          harga        hapus
```

| Bagian | Catatan |
|---|---|
| **Fund** | Nama **penuh**. Panah **▾** terlihat jelas — tekan untuk memilih fund lain. Nama kepanjangan dipotong `…` |
| **Tag** | emoji + nama penuh, panah **▾** terlihat |
| **Debit / Kredit** | **Satu tombol.** Tekan sekali → berganti. Kalau tag sudah pasti arahnya, tombol **abu-abu** (tidak bisa ditekan) |
| **Harga** | mengambil seluruh sisa lebar — cukup untuk **100.000.000,99** |
| **✕** | hapus baris ini |

> 💡 **Kenapa fund & tag dapat ruang lebih?** Karena Bapak perlu **melihat panah ▾** supaya tahu
> kotak itu bisa dibuka. Angka transaksi harian tidak pernah sebesar 100 juta, jadi sisanya
> cukup untuk harga.

> 🔑 **Nama penuh, bukan singkatan.** Sejak 19 Okt 2026 singkatan 3 huruf (`SPB`, `RMH`)
> **dihapus** karena mudah lupa artinya. Yang tersimpan di server tetap nama lengkap.

### 🔤 Nama fund ditulis PENUH

Sejak **19 Oktober 2026** nama fund di kotak pilihan ditulis **penuh** (`Superbank`, bukan `SPB`)
— karena singkatan mudah lupa artinya. Nama yang kepanjangan **dipotong dengan `…`**,
tapi nama utuhnya tetap terbaca saat daftar pilihan dibuka.

> Dulu ada daftar singkatan 3 huruf. Daftar itu **sudah dihapus** karena tidak dipakai lagi.

### 🔴 PENTING — jangan lupa ganti TAG

Tag bawaan form adalah **`Rumah`**. Itu **bukan** tag yang benar untuk semua hal.
**Selalu ganti tag** sesuai keperluan:

| Kalau belanjanya untuk… | Pilih tag |
|---|---|
| Perbaikan rumah, service AC, perabot | **🏠 Rumah** |
| Makan, jajan, pakaian, obat | **👤 Pribadi** |
| Hewan (ayam, kucing, pakan) | **🐕 Pet** |
| Mobil (bensin, servis) | **🚗 Mobil** |
| Biaya admin bank, transfer fee | **✂️ biaya** |
| Uang masuk (gaji, jual) | **💵 Pendapatan** |
| Bunga bank | **🌸 Bunga** |
| Pajak | **🧾 Pajak** |
| Uang pindah antar kotak sendiri | **🔄 Transfer** |

> ⚠️ **Kalau muncul tulisan kuning** *"Tag Transfer artinya uang PINDAH TEMPAT — tidak dihitung
> di Ringkasan bulan ini"* → berarti tagnya **belum diganti**. Ganti dulu sebelum menyimpan.

> 🔴 **Kenapa penting:** tag `Transfer` **sengaja tidak dihitung** di Ringkasan (karena uang
> pindah tempat, bukan belanja). Kalau belanja biasa diberi tag Transfer, pengeluaran itu
> **hilang dari Ringkasan** — dan saldo terlihat beda dengan catatan bank.

**Kalau salah?** Di daftar bawah ada tombol **↩️ Batalkan** pada tiap baris.
Saldo langsung kembali seperti sebelum transaksi itu.

**Mau mengembalikan yang sudah dibatalkan?**
```
Transaksi  →  Riwayat  →  cari barisnya  →  ↩️ Pulihkan
```

### 💵 Menerima penggantian hutang (Reimburse)

Dipakai saat Bapak sebelumnya mengeluarkan uang dengan tag **Hutang**, lalu menerima penggantinya.

```
Transaksi → ＋ → pilih tag Reimburse → arah Debit
           → pilih hutang di bagian "Bayar Hutang" → periksa → Simpan
```

| Hal | Cara kerjanya |
|---|---|
| **Daftar hutang** | Hanya hutang yang **belum lunas**. Terlihat keterangan, fund, dan sisa |
| **Isi otomatis** | Setelah dipilih, keterangan dan jumlah sisa terisi jika masih kosong. Boleh Bapak ubah |
| **Bayar sebagian** | Isi jumlah yang lebih kecil dari sisa → status **🟡 Dicicil** |
| **Bayar sampai habis** | Total pembayaran mencapai hutang → status **🟢 Lunas** dan hilang dari pilihan berikutnya |
| **Belum dibayar** | Pada daftar transaksi terlihat **🔴 Belum Diganti** |
| **Tautan** | Pada baris Reimburse terlihat **🔗 #nomor hutang** |

> 🔴 **Jumlah tidak boleh melebihi sisa hutang.** Server menolaknya.
> Kalau hutang tidak muncul, periksa apakah transaksi awal memang memakai tag **Hutang** dan arah **Kredit**.
>
> **Salah mencatat pembayaran?** Batalkan lewat Riwayat. Sisa dan status hutang akan berubah sendiri.
> Pulihkan lagi untuk mengembalikan pembayaran tersebut.

---

## 1d. 📜 Layar RIWAYAT

```
Transaksi  →  tombol "Riwayat" (kiri atas)
```

Semua **catat · ubah · batalkan** tercatat di sini — tidak ada yang bisa hilang.
Yang sudah dibatalkan bisa **dipulihkan** dengan satu tombol.

> 🔑 Inilah yang membuat Bapak **berani mencoba**: apa pun yang salah, bisa dikembalikan.

---

## 2. 🧭 Pindah halaman — pakai TAB BAWAH

Selalu ada 3 tab di paling bawah layar:

| Tab | Isinya |
|---|---|
| **📊 Dashboard** | Halaman pertama. Daftar semua kotak uang + saldo, total, ringkasan, bunga & pajak, transaksi terbaru |
| **🧾 Transaksi** | Semua catatan uang — bisa disaring & diurut |
| **⚙️ Pengaturan** | Bulan · Daftar Fund · Daftar Tag · Pajak & Bunga · Bahasa · **📅 Bulan Baru** · Daftar Istilah · Tentang |

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
| 🏷️ **Daftar Tag** | 15 tag + arahnya (masuk/keluar) + jumlah catatan + **borang tambah tag** |
| 🧾 **Pajak & Bunga** | Rate pajak & bunga bank |
| 🌐 **Bahasa** | Indonesia ↔ English |
| 📖 **Daftar Istilah** | Padanan istilah keuangan Indonesia–Inggris |
| ℹ️ **Tentang** | Keterangan berkas ini |

**Tombol pilih jumlah kolom** (hanya di **Daftar Fund**): **Otomatis (n) · 3 · 4 · 5**.
Jumlah kolom itu berlaku **di tiga tempat sekaligus** — Dashboard, Daftar Fund, dan daftar kotak uang di Transaksi.
Di halaman **Daftar Tag** tombol itu **tidak ada** (memang dihilangkan atas permintaan Bapak).

### 🏷️ Menambah / mengubah tag

Di **Pengaturan → 🏷️ Daftar Tag**, di bawah kisi tag ada borang **＋ Tambah Tag Baru**:

| Isian | Artinya |
|---|---|
| **Nama tag** | Nama yang Bapak mau (paling banyak 30 huruf) |
| **Ikon** | Pilih satu dari 40 gambar |
| **Jurnal** | **— Bebas —** (boleh masuk & keluar) · **Debit (masuk)** · **Kredit (keluar)** |
| **🧾 Kena pajak otomatis** | Centang kalau tag ini kena pajak (mis. Bunga) |
| **🛒 Muncul di Belanja** | Centang kalau tag ini dipakai di daftar belanja |

Tekan **Tambah** → tag langsung muncul di kisi dan di pilihan tag saat mencatat.

Di bawahnya ada **Ubah / hapus tag** — tiap tag punya tombol **✎** (ubah) dan **✕** (hapus).

> 🔒 **Tag bertanda 🔧 = tag SISTEM** — tidak bisa diubah atau dihapus. Itu tag yang dipakai
> perhitungan otomatis (Bunga · Koreksi · Pinjam · Pendapatan · Reimburse · Hutang).
>
> ⚠️ **Tag yang masih dipakai transaksi tidak bisa dihapus.** Sistem akan menolak dan
> menyebutkan berapa transaksi yang memakainya. Ini sengaja — supaya laporan lama tidak rusak.

### 🔴 Arah tag — keluar = Kredit, masuk = Debit

| Tag | Arah | Bisa diganti? |
|---|---|---|
| Rumah · Pribadi · Pet · Mobil | **Kredit** (keluar) | ❌ tidak |
| Bunga · Bonus · Pendapatan | **Debit** (masuk) | ❌ tidak |
| Pajak · Hilang · biaya · Hutang | **Kredit** (keluar) | ❌ tidak |
| **Transfer · Pinjam · Koreksi · Reimburse** | **bebas** | ✅ ya (tekan tombolnya) |

> Kalau tombol Debit/Kredit **abu-abu dan tidak bisa ditekan**, itu tandanya tag itu
> **sudah pasti arahnya**. Bapak tidak perlu mengubahnya.

---

## 6. 🌐 Mengganti bahasa (Indonesia ↔ English)

**Pengaturan → 🌐 Bahasa → pilih English.**

Yang ikut berganti: judul halaman, tab bawah, ringkasan Dashboard, tombol, dan kalimat.
Yang **TIDAK** berganti: **nama kotak uang** & **nama tag** (supaya laporan tetap sama) dan **angka**.

---

## 7. 💡 Hal penting yang perlu diketahui

| Hal | Keterangan |
|---|---|
| **Bisa melihat DAN mencatat** | Yang dicatat langsung tersimpan di server — dari HP maupun komputer |
| **Angka pasti sama di mana saja** | Angka memakai aturan yang sama dengan `core/saldo.ts`. Kalau berbeda → itu **bug**, bukan beda tampilan |
| **Angka selalu penuh** | Saldo ditulis lengkap sampai sen — mis. **26.504.730,59**, bukan "26,50 jt". Supaya Bapak bisa mencocokkan dengan catatan bank |
| **Angka selalu 2 desimal** | `10.000` ditulis **`10.000,00`** — supaya semua angka seragam dan tidak salah baca |
| **6 bulan terakhir** | Bisa dipilih di **Pengaturan → Bulan** |
| **Terang / gelap** | Bisa dipilih di Pengaturan |
| **Simpan ke layar utama** | Bisa — supaya seperti aplikasi biasa (ada di Pengaturan) |
| **PIN** | **745702** — tertulis di berkas **`PIN-UangKu.txt`**. Disimpan di perangkat Bapak saja, **hanya diketik sekali**. 🔴 **Tidak akan berubah** — AI dilarang menggantinya tanpa perintah Bapak |
| **Data tidak ada di dalam berkas halaman** | Halaman hanya menampilkan; datanya di server. Jadi aman dibuka dari mana saja |

---

## 8. 🔴 Kalau ada yang aneh

| Gejala | Yang dicek |
|---|---|
| **Tidak bisa mencatat / tanggal ditolak** | Bulan baru belum dibuka → **Pengaturan → 📅 Bulan Baru → Buka bulan baru** |
| Angka tidak muncul / kosong | Internet mati, atau PIN salah. Coba muat ulang halaman |
| Muncul "PIN salah" | Buka berkas **`PIN-UangKu.txt`** di komputer, ketik ulang angkanya (6 angka, tanpa spasi) |
| Angka beda dengan komputer | **Laporkan** — itu bug (aturan C18) |
| Tampilan terpotong | Putar HP / kecilkan huruf di Chrome, lalu laporkan |
| Salah mencatat | Buka **Transaksi → Riwayat → ↩️ Pulihkan**, atau **Batalkan** di daftar transaksi |
| **Saldo beda dengan catatan bank** | Cek tag transaksinya — kalau tertulis **Transfer** padahal belanja biasa, tagnya salah. Minta AI memperbaiki |
| Muncul tulisan kuning soal tag Transfer | Tagnya belum diganti — pilih tag yang benar sebelum menyimpan |

---

## 9. 📌 Yang BELUM ada (jangan heran)

| Hal | Keadaan |
|---|---|
| **Mengubah (edit) transaksi** | ⬜ Belum — untuk sekarang: **batalkan** lalu **catat ulang** |
| **Mengisi Saldo Awal dari HP** | ⬜ Belum — saldo awal diisi lewat **Buka Bulan Baru** |
| **Batasi percobaan PIN** | ⬜ Belum — kalau PIN salah berkali-kali, tidak ada penguncian |
| **Aplikasi versi komputer (server lokal)** | ⬜ Belum — tidak diperlukan, halaman cloud sudah bisa mencatat dari komputer |

---

## 10. 🔄 Kalau Bapak masih mencatat di `c:\data\keuangan`

Halaman cloud **tidak otomatis** mengambil catatan baru dari sistem lama.
Kalau ada catatan baru di sana, minta AI menjalankan:

```
node tools\salinan-kerja.cjs          (keuangan → uangku.db)
node tools\siapkan-cloud.cjs --ulang  (uangku.db → server)
node tools\cek-sama-cloud.cjs         (pembukti: harus IDENTIK 100%)
```

> ⚠️ **Jangan** mencatat di dua tempat sekaligus untuk transaksi yang sama — nanti dobel.
| **Jembatan cloud Layerbase** | ⬜ Akun sudah ada, database belum dibuat |

---

*Panduan ini dibuat 25 September 2026. Kalau ada tampilan yang berubah,
panduan ini ikut diperbarui (aturan D1 di `agents.md`).*
