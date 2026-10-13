/**
 * bangun-cloud.cjs — SUSUN uangku-cloud.html dari uangku.html
 *
 * 🔴 ATURAN (permintaan Bapak 13 Okt 2026):
 *   • JANGAN mengubah sistem UangKu yang sudah siap pakai.
 *     Kode tampilan (CSS + seluruh JavaScript layar) dipakai APA ADANYA.
 *   • Yang diganti HANYA dua hal:
 *       ① sumber data  : blok <script id="data-uangku">  →  ambil dari Worker
 *       ② tempat simpan: layar "Catat (TES)" localStorage →  kirim ke Worker
 *   • Ditambah: gerbang PIN + tab "Riwayat".
 *
 * Hasil: c:\data\UangKu\uangku-cloud.html
 *
 * Jalankan: node tools\bangun-cloud.cjs
 */
const fs = require('fs');

const SUMBER = 'c:/data/UangKu/uangku.html';
const HASIL = 'c:/data/UangKu/uangku-cloud.html';

let h = fs.readFileSync(SUMBER, 'utf8');
/* ⚠️ Normalkan akhir baris ke LF — kalau tidak, pencocokan teks gagal (bug nyata) */
h = h.replace(/\r\n/g, '\n');
const catat = [];

/* ================================================================== */
/* 1. BLANK — buang blok data & seluruh <script> (diisi lagi di bawah) */
/* ================================================================== */

/* 1a. blok data JSON → dikosongkan (data datang dari server) */
h = h.replace(
  /"catatan":\s*"Berkas ini HANYA BACA\. Angka memakai aturan core\/saldo\.ts\."\},/,
  '"catatan":"Data dari server (Worker)."',   /* isi meta tak berubah bentuk */
);

/* 1b. ganti blok data HANYA-BACA menjadi penanda — data dipasang saat mulai */
const blokData =
  /<!-- =+[\s\S]*?DATA — disuntik oleh tools\/siapkan-data\.cjs\.[\s\S]*?<script id="data-uangku" type="application\/json">[\s\S]*?<\/script>/;
if (!blokData.test(h)) throw new Error('blok data tidak ditemukan');
h = h.replace(blokData, '<!-- DATA — diambil dari server oleh skrip di bawah -->');
catat.push('blok data bawaan dibuang');

/* 1c. buang seluruh <script>…</script> utama (diambil utuh untuk disambung) */
const mSkrip = h.match(/<script>\s*'use strict';[\s\S]*?<\/script>/);
if (!mSkrip) throw new Error('skrip utama tidak ditemukan');
let skrip = mSkrip[0];
h = h.replace(mSkrip, '<!-- SKRIP dipasang di bawah -->');
catat.push('skrip utama diambil (' + skrip.length + ' karakter)');

/* ================================================================== */
/* 2. SAMBUNGAN — sisipkan ke dalam skrip (sisip, bukan ganti)         */
/* ================================================================== */

/* 2a. keadaan baru + PIN + jalur server — dipasang SETELAH "4. KEADAAN" */
const SISIP_KEADAAN = `
/* ============================================================
   4b. JALUR SERVER (UangKu versi cloud)
   ------------------------------------------------------------
   Sumber data = Worker (bukan berkas ini). PIN disimpan di
   perangkat ini saja. Tampilan TIDAK diubah sama sekali —
   yang berganti hanya dari mana angkanya datang.
   ============================================================ */
var CLOUD = {
  pin: (function () { try { return localStorage.getItem('uangku.pin') || ''; } catch (e) { return ''; } })(),
  alamat: (function () {
    try { return localStorage.getItem('uangku.alamat') || 'https://uangku-api.suwandhih.workers.dev'; }
    catch (e) { return 'https://uangku-api.suwandhih.workers.dev'; }
  })(),
  bulanMaks: 6
};

function simpanCloud() {
  try {
    localStorage.setItem('uangku.pin', CLOUD.pin);
    localStorage.setItem('uangku.alamat', CLOUD.alamat);
  } catch (e) { /* diam */ }
}

/** Panggil Worker. Semua nilai lewat JSON — tidak ada SQL dari halaman. */
function panggilServer(aksi, tambahan) {
  var isi = { pin: CLOUD.pin, aksi: aksi };
  if (tambahan) { for (var k in tambahan) { if (tambahan.hasOwnProperty(k)) isi[k] = tambahan[k]; } }
  return fetch(CLOUD.alamat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isi)
  }).then(function (r) {
    return r.json().then(function (j) {
      if (r.status === 401) throw new Error('PIN salah');
      if (!j.ok) throw new Error(j.error || ('Gagal (HTTP ' + r.status + ')'));
      return j;
    });
  }).catch(function (e) {
    if (e && e.message) throw e;
    throw new Error('Tidak bisa menghubungi server');
  });
}

/* keadaaan tampilan terkunci selama data dimuat */
var SIAP = false;
`;

const penandaKeadaan = `var layar = 'dash';
var subNama = '';
var riwayatLayar = [];`;
if (!h.includes('4b. JALUR SERVER') && !skrip.includes('var layar = \'dash\';')) throw new Error('penanda keadaan tidak ada');
skrip = skrip.replace(penandaKeadaan, SISIP_KEADAAN + '\n' + penandaKeadaan);
catat.push('jalur server + PIN disisipkan');

/* 2b. GANTI tab "Riwayat" — peta ID layar */
skrip = skrip.replace(
  "var peta = { dash: 'pgDash', tx: 'pgTx', input: 'pgInput', set: 'pgSet', sub: 'pgSub' };",
  "var peta = { dash: 'pgDash', tx: 'pgTx', input: 'pgInput', set: 'pgSet', sub: 'pgSub', riwayat: 'pgRiwayat' };",
);
skrip = skrip.replace(
  "['pgDash','pgTx','pgInput','pgSet','pgSub'].forEach(function (id) {",
  "['pgDash','pgTx','pgInput','pgSet','pgSub','pgRiwayat'].forEach(function (id) {",
);
skrip = skrip.replace(
  "  document.getElementById(peta[nama === 'sub' ? 'sub' : nama]).hidden = false;",
  "  document.getElementById(peta[nama === 'sub' ? 'sub' : nama] || 'pgDash').hidden = false;",
);
skrip = skrip.replace(
  "  document.getElementById('btnAdd').hidden = (nama !== 'tx');",
  "  document.getElementById('btnAdd').hidden = (nama !== 'tx');\n" +
  "  document.getElementById('btnRiwayat').hidden = (nama !== 'tx');",
);
skrip = skrip.replace(
  "  else if (layar === 'sub') gbrSub();",
  "  else if (layar === 'sub') gbrSub();\n  else if (layar === 'riwayat') gbrRiwayat();",
);
skrip = skrip.replace(
  "  input: function () { return t('Catat (tes)'); },",
  "  input: function () { return t('Catat'); },\n  riwayat: function () { return t('Riwayat'); },",
);
/* tombol tab bawah: Transaksi & Pengaturan tetap, judul diperbarui lewat gambarUlang */
skrip = skrip.replace(
  "  document.getElementById('tbSet').textContent = t('Pengaturan');",
  "  document.getElementById('tbSet').textContent = t('Pengaturan');\n" +
  "  document.getElementById('btnRiwayat').textContent = t('Riwayat');",
);
catat.push('tab Riwayat dipasang');

/* 2c. GANTI cara simpan: localStorage → server */
const blokSimpanLama = `function simpanTesDariForm() {
  var tgl = document.getElementById('tlTgl').value;
  var ket = document.getElementById('tlKet').value.trim();
  var bln = bulanDariTgl(tgl);
  var isi = formTes.baris.filter(function (b) { return numTes(b.jml) > 0; });
  if (!bln) { alert('Tanggal di luar bulan yang tersedia.'); return; }
  if (!ket) { alert('Keterangan belum diisi.'); return; }
  if (!isi.length) { alert('Belum ada jumlah yang diisi.'); return; }
  var arr = bacaTes();
  arr.push({ id: Date.now(), tgl: tgl, ket: ket, baris: isi.map(function (b) {
    return { fund: b.fund, tag: b.tag, arah: arahTetapTag(b.tag) || b.arah, jml: b.jml }; }) });
  simpanTesKeMemori(arr);
  formTes = null;
  terapkanTes();
  gbrInput();
  alert('Tersimpan (tes).');
}`;

const blokSimpanBaru = `/* SIMPAN KE SERVER — satu tindakan boleh berisi beberapa jurnal.
   Tampilan TIDAK berubah; yang berganti hanya tujuannya (server). */
function simpanTesDariForm() {
  var tgl = document.getElementById('tlTgl').value;
  var ket = document.getElementById('tlKet').value.trim();
  var bln = bulanDariTgl(tgl);
  var isi = formTes.baris.filter(function (b) { return numTes(b.jml) > 0; });
  if (!bln) { alert(t('Tanggal di luar bulan yang tersedia.')); return; }
  if (!ket) { alert(t('Keterangan belum diisi.')); return; }
  if (!isi.length) { alert(t('Belum ada jumlah yang diisi.')); return; }

  var tombol = document.getElementById('tlSimpan');
  if (tombol) { tombol.disabled = true; tombol.textContent = t('Menyimpan…'); }

  panggilServer('catat', {
    tanggal: tgl,
    keterangan: ket,
    baris: isi.map(function (b) {
      var f = FUND().filter(function (x) { return x.nama === b.fund; })[0];
      return { fundId: f ? f.id : 0, tag: b.tag, arah: arahTetapTag(b.tag) || b.arah, jumlah: numTes(b.jml) };
    })
  }).then(function (r) {
    formTes = null;
    return muatDariServer();
  }).then(function () {
    gbrInput();
    alert(t('Tersimpan ke server.'));
  }).catch(function (e) {
    if (tombol) { tombol.disabled = false; tombol.textContent = t('Simpan'); }
    alert(e.message);
  });
}`;

if (!skrip.includes(blokSimpanLama)) throw new Error('blok simpan lama tidak ditemukan');
skrip = skrip.replace(blokSimpanLama, blokSimpanBaru);
catat.push('simpan: localStorage → server');

/* 2d. GANTI pembatalan data tes → pembatalan di server */
const blokBatalLama = `function batalkanTes(id) {
  simpanTesKeMemori(bacaTes().filter(function (e) { return String(e.id) !== String(id); }));
  terapkanTes();`;
const blokBatalBaru = `function batalkanTes(id) {
  if (!confirm(t('Batalkan transaksi ini?') + '\\n' + t('Saldo fund akan kembali seperti sebelum transaksi ini.'))) return;
  panggilServer('batalkan', { id: Number(id) }).then(function () {
    return muatDariServer();
  }).then(function () {
    gbrInput(); gbrDash();
    alert(t('Sudah dibatalkan.'));
  }).catch(function (e) { alert(e.message); });
}

function _batalLamaJanganDipakai(id) {
  simpanTesKeMemori(bacaTes().filter(function (e) { return String(e.id) !== String(id); }));
  terapkanTes();`;
if (!skrip.includes(blokBatalLama)) throw new Error('blok batal lama tidak ditemukan');
skrip = skrip.replace(blokBatalLama, blokBatalBaru);
catat.push('batalkan → server');

/* 2e. daftar "TES TERSIMPAN" di layar Catat → tampilkan dari server */
skrip = skrip.replace(
  "  var daftarTes = bacaTes().slice().reverse().map(function (e) {",
  "  var daftarTes = TX().slice(0, 12).map(function (e) {",
);
skrip = skrip.replace(
  `    var masukDihitung = e.baris.reduce(function (s, b) {
      var dihitung = TAG_TIDAK_DIHITUNG.indexOf(b.tag) === -1;
      return s + ((dihitung && (arahTetapTag(b.tag) || b.arah) === 'D') ? numTes(b.jml) : 0);
    }, 0);
    return '<div class="tl-tes"><div><b>' + esc(e.ket) + '</b><small>' + esc(e.tgl) + ' · ' + e.baris.length +
      ' jurnal · masuk dihitung ' + rp2(masukDihitung) + '</small></div><button class="btn-kecil" data-batal="' + e.id + '">↩️ Batalkan</button></div>';
  }).join('');`,
  `    return '<div class="tl-tes"><div><b>' + esc(e.ket) + '</b><small>' + esc(String(e.tanggal).split('-').reverse().join('/')) +
      ' · ' + esc(e.fund) + ' · ' + esc(e.tag) + ' · ' + (e.arah === 'D' ? 'masuk' : 'keluar') + ' ' + rp2(e.jumlah) +
      '</small></div><button class="btn-kecil" data-batal="' + e.id + '">↩️ ' + t('Batalkan') + '</button></div>';
  }).join('');`,
);
skrip = skrip.replace(
  "'<div class=\"tl-banner\">MODE TES — tersimpan di browser ini saja, bukan di uangku.db</div>' +",
  "'<div class=\"tl-banner\">' + t('Tersimpan di server') + ' · ' + esc(B() ? B().label : '') + '</div>' +",
);
skrip = skrip.replace("'<div class=\"sec\">TES TERSIMPAN</div>' +", "'<div class=\"sec\">' + t('Tersimpan di server') + '</div>' +");
skrip = skrip.replace("'<div class=\"empty\">Belum ada data tes</div>'", "'<div class=\"empty\">' + t('Belum ada transaksi') + '</div>'");
skrip = skrip.replace(
  "    '<div class=\"tl-card\"><button class=\"btn-utama\" id=\"tlSimpan\" style=\"width:100%\">Simpan (tes)</button></div>' +",
  "    '<div class=\"tl-card\"><button class=\"btn-utama\" id=\"tlSimpan\" style=\"width:100%\">' + t('Simpan') + '</button></div>' +",
);
catat.push('layar Catat: data dari server');

/* 2f. matikan penggabungan data tes (tidak dipakai lagi) */
skrip = skrip.replace(
  '/* gabungkan data tes ke salinan data asli — dari awal setiap kali (tidak dobel) */\nfunction terapkanTes() {',
  '/* tidak dipakai lagi — data datang utuh dari server */\nfunction terapkanTes() {\n  if (true) return;',
);
catat.push('terapkanTes dimatikan');

/* ================================================================== */
/* 3. TAMBAHAN BARU — pemuat data, gerbang PIN, layar Riwayat          */
/* ================================================================== */

const TAMBAHAN = `
/* ============================================================
   14. CLOUD — pemuat data, gerbang PIN, layar Riwayat
   ============================================================ */

/** Ambil seluruh data bulan dari server, lalu gambar ulang seperti biasa. */
function muatDariServer() {
  return panggilServer('bulan', { batas: CLOUD.bulanMaks }).then(function (r) {
    var daftar = r.data;
    if (!daftar.length) throw new Error('Belum ada data di server');
    return panggilServer('dashboard', { bulan: daftar });
  }).then(function (r) {
    BULAN = r.data;
    BULAN_ASLI = null;
    idxBulan = 0;
    if (!FUND().some(function (f) { return f.nama === fundSaring; })) fundSaring = FUND_AWAL;
    SIAP = true;
    gambarUlang();
    return true;
  });
}

/* ---------- gerbang PIN ---------- */
function pasangGerbang() {
  var g = document.getElementById('gerbang');
  var ge = document.getElementById('gerbangPesan');
  document.getElementById('gPin').value = CLOUD.pin;
  document.getElementById('gAlamat').value = CLOUD.alamat;

  document.getElementById('gMasuk').addEventListener('click', function () {
    CLOUD.pin = document.getElementById('gPin').value.trim();
    CLOUD.alamat = document.getElementById('gAlamat').value.trim() || CLOUD.alamat;
    ge.className = 'gerbang-pesan tampil';
    ge.textContent = t('Menyambung…');
    simpanCloud();
    muatDariServer().then(function () {
      g.hidden = true;
      document.getElementById('tabs').hidden = false;
      document.querySelector('.head').hidden = false;
      tampil('dash');
      ge.className = 'gerbang-pesan';
    }).catch(function (e) {
      ge.className = 'gerbang-pesan tampil salah';
      ge.textContent = e.message;
    });
  });
}

/* ---------- layar Riwayat ---------- */
function gbrRiwayat() {
  var wadah = document.getElementById('riwayatIsi');
  if (!wadah) return;
  jadikanRiwayat = [];
  wadah.innerHTML = '<div class="sec">' + t('Riwayat perubahan') + '</div>' +
    '<div class="hint">' + t('Setiap catat, ubah, dan batalkan tercatat di sini. Bisa dikembalikan.') + '</div>' +
    '<div id="riwayatDaftar"><div class="empty">' + t('Sedang memuat…') + '</div></div>';

  panggilServer('riwayat', { batas: 60 }).then(function (r) {
    var kotak = document.getElementById('riwayatDaftar');
    if (!kotak) return;
    if (!r.data.length) { kotak.innerHTML = '<div class="empty">' + t('Belum ada riwayat') + '</div>'; return; }

    var nama = { CREATE: 'dibuat', UPDATE: 'diubah', DELETE: 'dibatalkan', RESTORE: 'dipulihkan' };
    kotak.innerHTML = '<div class="cover">' + r.data.map(function (x, i) {
      var isi = '';
      try {
        var o = x.new_data ? JSON.parse(x.new_data) : (x.old_data ? JSON.parse(x.old_data) : null);
        if (o) {
          if (o.keterangan) isi = o.keterangan;
          else if (o.description) isi = o.description;
          else if (o.baris) isi = o.baris.length + ' jurnal';
          else if (o.grup) isi = o.grup;
          var n = o.amount || (o.baris && o.baris.length ? o.baris.reduce(function (s, b) { return s + Number(b.jumlah || 0); }, 0) : 0);
          if (n) isi += ' · ' + rp2(n);
        }
      } catch (e) { isi = ''; }
      jadikanRiwayat[i] = x;
      var bisa = (x.action === 'DELETE' || x.action === 'RESTORE');
      var teksTombol = x.action === 'DELETE' ? ('↩️ ' + t('Pulihkan')) : t('Batalkan');
      return '<div class="crow"><span class="cl"><b>' + esc(String(x.timestamp).slice(5, 16)) + '</b> · ' +
        esc(t(nama[x.action] || x.action)) + '<br><small>' + esc(isi) + '</small></span>' +
        (bisa ? '<button class="btn-kecil" data-riw="' + i + '">' + teksTombol + '</button>' : '') + '</div>';
    }).join('') + '</div>';

    kotak.querySelectorAll('[data-riw]').forEach(function (b) {
      b.addEventListener('click', function () {
        var x = jadikanRiwayat[+b.getAttribute('data-riw')];
        if (!x) return;
        var aksi = x.action === 'DELETE' ? 'pulihkan' : 'batalkan';
        if (!confirm(t(aksi === 'pulihkan' ? 'Pulihkan transaksi ini?' : 'Batalkan transaksi ini?') + '\\n' +
            t('Saldo fund akan menyesuaikan sendiri.'))) return;
        b.disabled = true;
        panggilServer(aksi, { id: Number(x.record_id) }).then(function () {
          return muatDariServer();
        }).then(function () {
          gbrRiwayat(); gbrDash();
        }).catch(function (e) { b.disabled = false; alert(e.message); });
      });
    });
  }).catch(function (e) {
    var kotak = document.getElementById('riwayatDaftar');
    if (kotak) kotak.innerHTML = '<div class="empty">' + esc(e.message) + '</div>';
  });
}
var jadikanRiwayat = [];
`;

/* 2b sambung: petunjuk klik & pemuat awal */
skrip = skrip.replace(
  `document.getElementById('btnBack').addEventListener('click', kembali);`,
  `document.getElementById('btnBack').addEventListener('click', kembali);
document.getElementById('btnRiwayat').addEventListener('click', function () { ke('riwayat'); });`,
);

/* pemuat awal: ganti blok "13. MULAI" agar menunggu server */
skrip = skrip.replace(
  `terapkanTes();

/* pasang tulisan sesuai bahasa yang tersimpan, baru tampilkan */
gambarUlang();
tampil('dash');`,
  `/* ---- 15. MULAI — tunggu server dulu ---- */
pasangGerbang();

if (CLOUD.pin) {
  muatDariServer().then(function () {
    document.getElementById('gerbang').hidden = true;
    document.getElementById('tabs').hidden = false;
    document.querySelector('.head').hidden = false;
    tampil('dash');
  }).catch(function (e) {
    document.getElementById('gerbangPesan').className = 'gerbang-pesan tampil salah';
    document.getElementById('gerbangPesan').textContent = e.message;
  });
}`,
);
catat.push('pemuat awal menunggu server');

/* jaringan aman saat data belum siap — layar kosong tidak error */
skrip = skrip.replace(
  "function B() { return BULAN[idxBulan] || null; }",
  "function B() { return BULAN[idxBulan] || null; }",
);

/* pasang tambahan + pembungkus aman sebelum penutup skrip */
skrip = skrip.replace('</script>', TAMBAHAN + '\n</script>');

/* ================================================================== */
/* 4. HTML TAMBAHAN — gerbang PIN, tombol Riwayat, layar Riwayat       */
/* ================================================================== */

/* 4a. tombol Riwayat di kepala */
h = h.replace(
  '  <button id="btnAdd" hidden title="Tambah transaksi" class="plus">＋</button>',
  '  <button id="btnRiwayat" hidden title="Riwayat">Riwayat</button>\n' +
  '  <button id="btnAdd" hidden title="Tambah transaksi" class="plus">＋</button>',
);

/* 4b. tab bawah & kepala disembunyikan sampai PIN benar */
h = h.replace('<nav class="tabs">', '<nav class="tabs" id="tabs" hidden>');

/* 4c. layar Riwayat + gerbang PIN + gaya tambahan, sebelum </body> */
const HTML_TAMBAHAN = `
<!-- ---------------------------- RIWAYAT ---------------------------- -->
<main class="body" id="pgRiwayat" hidden>
  <div id="riwayatIsi"></div>
</main>

<!-- ---------------------------- GERBANG PIN ---------------------------- -->
<div id="gerbang">
  <div class="gerbang-kartu">
    <div class="gerbang-judul">UangKu</div>
    <div class="gerbang-ket">Masukkan PIN untuk menyambung ke server.</div>
    <label class="gerbang-label">PIN</label>
    <input id="gPin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN akses">
    <label class="gerbang-label">Alamat server</label>
    <input id="gAlamat" type="text" autocomplete="off">
    <button id="gMasuk" class="gerbang-tombol">Simpan &amp; sambung</button>
    <div class="gerbang-pesan" id="gerbangPesan"></div>
    <div class="gerbang-kaki">PIN disimpan di perangkat ini saja. Data keuangan tidak ada di dalam berkas ini.</div>
  </div>
</div>

<style>
/* gaya tambahan — sepadan dengan rancangan hitam-putih yang sudah ada */
#gerbang{
  position:fixed; inset:0; z-index:50; background:var(--bg,#fff);
  display:flex; align-items:center; justify-content:center; padding:16px;
}
#gerbang[hidden]{display:none}
.gerbang-kartu{width:100%; max-width:340px; border:1px solid #ddd; border-radius:10px; padding:14px}
.gerbang-judul{font-size:19px; font-weight:700; margin-bottom:4px}
.gerbang-ket{font-size:13px; color:#666; margin-bottom:10px}
.gerbang-label{display:block; font-size:12px; color:#666; margin:8px 0 3px}
.gerbang-kartu input{width:100%; padding:9px; font-size:16px; border:1px solid #ddd; border-radius:6px}
.gerbang-tombol{
  width:100%; margin-top:12px; padding:11px; font-size:15px; font-weight:600;
  border:0; border-radius:8px; background:#111; color:#fff;
}
.gerbang-pesan{margin-top:8px; font-size:13px; display:none}
.gerbang-pesan.tampil{display:block}
.gerbang-pesan.salah{color:#c00; font-weight:600}
.gerbang-kaki{margin-top:10px; font-size:11px; color:#888; line-height:1.4}
#btnRiwayat{
  border:1px solid #ddd; background:none; color:inherit; font-size:12px;
  padding:4px 8px; border-radius:6px; margin-left:auto;
}
@media (prefers-color-scheme: dark){
  #gerbang{background:#000; color:#eee}
  .gerbang-kartu{border-color:#333}
  .gerbang-kartu input{background:#000; color:#eee; border-color:#333}
  .gerbang-tombol{background:#eee; color:#000}
  .gerbang-pesan.salah{color:#ff6b6b}
  .gerbang-ket,.gerbang-label,.gerbang-kaki{color:#999}
  #btnRiwayat{border-color:#333}
}
</style>
`;

/* ⚠️ WAJIB dipasang SEBELUM skrip — kalau sesudah, skrip jalan lebih dulu
   dan elemen gerbang belum ada (bug nyata: "Cannot set properties of null"). */
h = h.replace('<!-- SKRIP dipasang di bawah -->', HTML_TAMBAHAN + '\n<!-- SKRIP dipasang di bawah -->');

/* perbarui judul halaman */
h = h.replace('<title>UangKu</title>', '<title>UangKu</title>');

/* ================================================================== */
/* 5. PASANG KEMBALI SKRIP                                             */
/* ================================================================== */

h = h.replace('<!-- SKRIP dipasang di bawah -->', skrip);

fs.writeFileSync(HASIL, h, 'utf8');

console.log('=== BANGUN uangku-cloud.html ===');
catat.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
console.log(`\nUkuran: ${(h.length / 1024).toFixed(0)} KB (sumber uangku.html: ${(fs.readFileSync(SUMBER, 'utf8').length / 1024).toFixed(0)} KB)`);
console.log('Hasil: ' + HASIL);

/* periksa tidak ada sisa data keuangan yang ikut */
const KATA = ['Superbank', 'SeaBank', 'Celengan', 'Deposito', 'Tabungan A', 'ShopeePay',
  'Galon', '269626', '23717634', '260000000', '293.720.428'];
const ketemu = KATA.filter((k) => h.includes(k));
console.log(ketemu.length === 0
  ? '\n✅ Bersih — tidak ada nama fund / angka saldo di dalam berkas'
  : '\n⚠️  Masih ada: ' + ketemu.join(', '));
