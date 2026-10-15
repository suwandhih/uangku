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

/* Baris transaksi yang sedang "dipanggil" (diketuk) di layar Transaksi.
   0 = belum ada. Selama 0, tombol ✎ dan ✕ di kepala berwarna ABU-ABU.
   Begitu ada baris dipanggil, keduanya menjadi HITAM (order Bapak 15 Okt 2026). */
var barisDipilih = 0;
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
  "  document.getElementById('btnRiwayat').hidden = (nama !== 'tx');\n" +
  "  document.getElementById('btnEdit').hidden = (nama !== 'tx');\n" +
  "  document.getElementById('btnHapus').hidden = (nama !== 'tx');\n" +
  "  if (nama !== 'tx') barisDipilih = 0;\n" +
  "  siapkanTombolBaris();",
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
  "  document.getElementById('btnRiwayat').textContent = t('Riwayat');\n" +
  "  document.getElementById('btnEdit').title = t('Ubah transaksi');\n" +
  "  document.getElementById('btnHapus').title = t('Hapus transaksi');\n" +
  "  siapkanTombolBaris();",
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

/* 2e2. layar "Tentang" — versi cloud (bukan lagi berkas mandiri) */
skrip = skrip.replace(
  `      '<div class="r"><span class="k">Versi</span><span class="v">HP (Android)</span></div>' +`,
  `      '<div class="r"><span class="k">Versi</span><span class="v">Cloud (PC + HP)</span></div>' +`,
);
const tentangLama = `    h += '<div class="sec">' + t('Informasi') + '</div>' +
      '<div class="hint">Berkas ini <b>berdiri sendiri</b> — tidak butuh server dan tidak butuh internet.<br><br>' +
      'Data <b>tidak</b> berubah-ubah: angkanya diambil dari ' + t('Saldo') + ' kerja di komputer. ' +
      'Kalau catatan di komputer berubah, jalankan <code>node tools\\\\siapkan-data.cjs</code> ' +
      'lalu kirim ulang berkas ini ke HP.<br><br>' +
      t('Angka memakai aturan yang sama dengan') + ' <code>core/saldo.ts</code> — ' +
      'batas bulan wajib awal dan akhir, dan 5 tag dikecualikan.<br><br>' +
      '<b>' + t('Simpan ke layar utama') + ':</b> di Chrome tekan menu ⋮ → ' +
      '“Tambahkan ke layar utama”.</div>';`;
const tentangBaru = `    h += '<div class="sec">' + t('Informasi') + '</div>' +
      '<div class="hint">Berkas ini <b>hanya tampilan</b> — angkanya diambil dari server setiap kali dibuka. ' +
      'Tidak ada data keuangan di dalam berkas ini.<br><br>' +
      'Yang dicatat di sini <b>langsung tersimpan di server</b>, jadi bisa dibuka dari komputer maupun HP ' +
      'dan angkanya selalu sama.<br><br>' +
      t('Angka memakai aturan yang sama dengan') + ' <code>core/saldo.ts</code> — ' +
      'batas bulan wajib awal dan akhir, dan 5 tag dikecualikan.<br><br>' +
      '<b>' + t('Simpan ke layar utama') + ':</b> di Chrome tekan menu ⋮ → ' +
      '“Tambahkan ke layar utama”.</div>';`;
if (!skrip.includes(tentangLama)) throw new Error('blok Tentang tidak ditemukan');
skrip = skrip.replace(tentangLama, tentangBaru);
catat.push('layar Tentang: versi cloud');

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

/** Bulan berikutnya dari sebuah kunci 'YYYY-MM'. */
function bulanBerikut(kunci) {
  var p = String(kunci).split('-');
  var th = Number(p[0]), bl = Number(p[1]);
  if (bl === 12) { th += 1; bl = 1; } else { bl += 1; }
  return th + '-' + (bl < 10 ? '0' + bl : String(bl));
}

/** Nama bulan yang enak dibaca dari kunci 'YYYY-MM'. */
function namaBulanKunci(kunci) {
  var p = String(kunci).split('-');
  var nm = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
    'Agustus','September','Oktober','November','Desember'];
  return nm[Number(p[1]) - 1] + ' ' + p[0];
}

/**
 * Buka bulan baru — saldo awal diambil dari saldo akhir bulan terakhir.
 * Tanpa ini, mulai tanggal 1 bulan depan Bapak TIDAK BISA mencatat,
 * karena bulan baru belum punya saldo awal.
 */
function bukaBulanBaru() {
  if (!BULAN.length) { pesan(t('Belum ada data di server'), 'salah'); return; }
  var terakhir = BULAN[0].kunci;
  var tujuan = bulanBerikut(terakhir);
  if (!confirm(t('Buka bulan baru?') + '\\n\\n' + namaBulanKunci(terakhir) +
      ' → ' + namaBulanKunci(tujuan) + '\\n' +
      t('Saldo awal bulan baru diambil dari saldo akhir bulan terakhir, lalu bulan lama dikunci.'))) return;

  panggilServer('bukaBulan', { bulan: tujuan }).then(function (r) {
    return muatDariServer().then(function () { return r; });
  }).then(function (r) {
    pesan(r.sudahAda
      ? t('Bulan itu sudah siap') + ': ' + namaBulanKunci(r.bulan)
      : t('Bulan baru siap') + ': ' + namaBulanKunci(r.bulan) + ' · ' +
        r.fund + ' fund · total ' + rp2(r.total) + ' Rp');
  }).catch(function (e) { pesan(e.message, 'salah'); });
}

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

/**
 * Apakah bulan berjalan sudah punya saldo awal?
 * Kalau belum, Bapak TIDAK BISA mencatat — jadi harus diberi tahu.
 * Dibandingkan dengan tanggal hari ini (WIB), bukan tanggal komputer.
 */
function bulanBerjalanBelumSiap() {
  if (!BULAN.length) return null;
  var kini = new Date(Date.now() + 7 * 3600 * 1000);
  var kunci = kini.getUTCFullYear() + '-' +
    (kini.getUTCMonth() + 1 < 10 ? '0' : '') + (kini.getUTCMonth() + 1);
  var ada = BULAN.some(function (b) { return b.kunci === kunci; });
  return ada ? null : kunci;
}

/** Pita peringatan di Dashboard — hanya muncul kalau memang perlu. */
function pitaBulanBaru() {
  var kurang = bulanBerjalanBelumSiap();
  if (!kurang) return '';
  return '<div class="pita-perlu">⚠️ ' + t('Bulan ini belum dibuka') + ': ' +
    esc(namaBulanKunci(kurang)) + ' — ' + t('buka dulu supaya bisa mencatat') +
    '<button class="btn-kecil" id="pitaBuka">' + t('Buka sekarang') + '</button></div>';
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
        }).catch(function (e) { b.disabled = false; pesan(e.message, 'salah'); });
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
document.getElementById('btnRiwayat').addEventListener('click', function () { ke('riwayat'); });

/* Tombol "Buka bulan baru" ada di DUA tempat (pita Dashboard & Pengaturan)
   dan keduanya baru dibuat saat layarnya digambar. Jadi dipasang lewat satu
   pendengar klik di seluruh halaman — lebih andal daripada memasang satu-satu
   (bug nyata: 'Cannot read properties of null'). */
document.addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('#pitaBuka, #btnBukaBulan') : null;
  if (b) bukaBulanBaru();
});`,
);

/* ================================================================== */
/* 2b1. ✎ EDIT & ✕ HAPUS TRANSAKSI (order Bapak 15 Okt 2026)           */
/* ------------------------------------------------------------------ */
/* Cara kerja (sesuai kalimat Bapak):
     "edit dan hapus ada di bagian atas kanan sejajar dengan
      [riwayat][+][edit][hapus] · edit dan hapus ABU jika user tidak
      panggil data lama.. jika proses panggil data untuk edit atau hapus
      berwarna HITAM"
   → Bapak KETUK satu baris transaksi = "panggil data lama".
     Baris itu ditandai, tombol ✎ dan ✕ berubah hitam.
     ✎ = buka form Catat berisi data lama → ubah → Simpan.
     ✕ = batalkan (soft delete) → bisa dipulihkan dari layar Riwayat.
   Semua lewat Worker: 'ubah' dan 'batalkan'. Tidak ada SQL dari halaman. */

/* 2b1a. baris tabel bisa diketuk — beri nomor id + tanda baris terpanggil */
skrip = skrip.replace(
  `function barisTabel(x, pr) {
  var masuk = x.arah === 'D';
  return '<tr' + (pr ? ' class="pr"' : '') + '>' +`,
  `function barisTabel(x, pr) {
  var masuk = x.arah === 'D';
  var kelas = (pr ? 'pr' : '') + (x.id === barisDipilih ? ' dipanggil' : '');
  return '<tr data-tx="' + x.id + '"' + (kelas ? ' class="' + kelas + '"' : '') + '>' +`,
);
catat.push('baris tabel: bisa diketuk');

/* 2b1b. setelah daftar digambar → pasang ketukan baris */
skrip = skrip.replace(
  `  document.getElementById('txDaftar').innerHTML = h;
  pasangKlik(document.getElementById('txDaftar'));`,
  `  document.getElementById('txDaftar').innerHTML = h;
  pasangKlik(document.getElementById('txDaftar'));

  /* ketuk satu baris = "panggil data lama" → tombol ✎ ✕ jadi hitam */
  document.querySelectorAll('#txDaftar tbody tr[data-tx]').forEach(function (tr) {
    tr.addEventListener('click', function () {
      var id = Number(tr.getAttribute('data-tx'));
      barisDipilih = (barisDipilih === id) ? 0 : id;   /* ketuk lagi = lepas */
      gbrTx();
    });
  });`,
);
catat.push('ketuk baris → panggil data lama');

/* 2b1b2. setiap daftar Transaksi digambar → tombol ✎ ✕ ikut menyesuaikan.
   Tanpa ini tombol tetap abu walau baris sudah dipanggil (bug nyata 15 Okt 2026). */
skrip = skrip.replace(
  `  /* pilih fund → grid MENUTUP lagi, barisnya berganti nama fund itu */
  wadahChips.querySelectorAll('.chipgrid .chip').forEach(function (c) {
    c.addEventListener('click', function () {
      fundSaring = c.getAttribute('data-fund');
      chipsTerbuka = false;
      riwayatLayar = [];
      gbrTx();
    });
  });
}`,
  `  /* pilih fund → grid MENUTUP lagi, barisnya berganti nama fund itu */
  wadahChips.querySelectorAll('.chipgrid .chip').forEach(function (c) {
    c.addEventListener('click', function () {
      fundSaring = c.getAttribute('data-fund');
      chipsTerbuka = false;
      riwayatLayar = [];
      gbrTx();
    });
  });

  /* tombol ✎ ✕ di kepala ikut menyesuaikan setiap daftar digambar */
  siapkanTombolBaris();
}`,
);
catat.push('tombol ✎ ✕ ikut digambar ulang');

/* 2b1c. tombol kepala: keadaan + aksi */
const blokEditHapus = `
/* ============================================================
   14b. ✎ EDIT & ✕ HAPUS — tombol kepala (order Bapak 15 Okt 2026)
   ============================================================ */

/** Baris yang sedang dipanggil (0 = belum ada). */
function barisTerpanggil() {
  if (!barisDipilih) return null;
  var arr = TX().filter(function (x) { return x.id === barisDipilih; });
  return arr.length ? arr[0] : null;
}

/** Tombol ✎ ✕: ABU-ABU selama belum ada baris dipanggil, HITAM kalau sudah. */
function siapkanTombolBaris() {
  var e = document.getElementById('btnEdit');
  var d = document.getElementById('btnHapus');
  if (!e || !d) return;
  var ada = !!barisTerpanggil();
  e.disabled = !ada;
  d.disabled = !ada;
  e.classList.toggle('siap', ada);
  d.classList.toggle('siap', ada);
}

/** Ketuk baris → panggil data lama (dipakai juga oleh tombol ✎ ✕). */
function panggilBaris(id) {
  barisDipilih = Number(id) || 0;
  gbrTx();
  siapkanTombolBaris();
}

/** ✎ — buka form Catat berisi data lama, siap diubah. */
function editBaris() {
  var x = barisTerpanggil();
  if (!x) { alert(t('Ketuk satu baris transaksi dulu, baru tekan Edit.')); return; }
  var bln = B();
  if (!bln) return;
  if (bln.terkunci) { alert(t('Bulan ini terkunci — tidak bisa diubah.')); return; }

  formTes = {
    mode: 'ubah',
    id: x.id,
    tgl: x.tanggal,
    ket: x.ket,
    baris: [{ fund: x.fund, tag: x.tag, arah: x.arah, jml: rp2(x.jumlah) }]
  };
  ke('input');
}

/** ✕ — batalkan transaksi (soft delete). Bisa dipulihkan dari layar Riwayat. */
function hapusBaris() {
  var x = barisTerpanggil();
  if (!x) { alert(t('Ketuk satu baris transaksi dulu, baru tekan Hapus.')); return; }
  var bln = B();
  if (bln && bln.terkunci) { alert(t('Bulan ini terkunci — tidak bisa dihapus.')); return; }

  var f = FUND().filter(function (y) { return y.nama === x.fund; })[0];
  var sesudah = f ? f.saldo - (x.arah === 'D' ? x.jumlah : -x.jumlah) : null;
  if (!confirm(t('Hapus transaksi ini?') + '\\n\\n' + x.tanggal + ' · ' + x.ket + '\\n' +
      (x.arah === 'D' ? '+' : '−') + rp2(x.jumlah) + ' · ' + x.fund + '\\n\\n' +
      (sesudah === null ? '' :
        t('Saldo') + ' ' + x.fund + ': ' + rp2(f.saldo) + ' → ' + rp2(sesudah) + '\\n\\n') +
      t('Bisa dipulihkan dari layar Riwayat.'))) return;

  var d = document.getElementById('btnHapus');
  if (d) d.disabled = true;
  panggilServer('batalkan', { id: x.id }).then(function () {
    barisDipilih = 0;
    return muatDariServer();
  }).then(function () {
    gbrTx();
    alert(t('Sudah dihapus. Bisa dipulihkan dari Riwayat.'));
  }).catch(function (e) {
    if (d) d.disabled = false;
    alert(e.message);
  });
}

document.getElementById('btnEdit').addEventListener('click', editBaris);
document.getElementById('btnHapus').addEventListener('click', hapusBaris);
`;
skrip = skrip.replace('</script>', blokEditHapus + '\n</script>');
catat.push('tombol ✎ ✕ di kepala: aksi terpasang');

/* 2b1d. form Catat: judul & tombol menyesuaikan mode (baru / ubah) */
skrip = skrip.replace(
  `    '<div class="sec">TANGGAL & KETERANGAN</div>' +`,
  `    (formTes.mode === 'ubah'
      ? '<div class="peringatan-tag">✎ ' + t('Mengubah transaksi') + ' #' + esc(formTes.id) + ' — ' +
        t('tekan Simpan kalau sudah benar.') + '</div>'
      : '') +
    '<div class="sec">TANGGAL & KETERANGAN</div>' +`,
);
skrip = skrip.replace(
  `    '<div class="tl-card"><button class="btn-utama" id="tlSimpan" style="width:100%">' + t('Simpan') + '</button></div>' +`,
  `    '<div class="tl-card"><button class="btn-utama" id="tlSimpan" style="width:100%">' +
      (formTes.mode === 'ubah' ? t('Simpan perubahan') : t('Simpan')) + '</button>' +
      (formTes.mode === 'ubah'
        ? '<button class="btn-kecil" id="tlBatalUbah" style="width:100%;margin-top:6px">' +
          t('Batal') + '</button>'
        : '') + '</div>' +`,
);
catat.push('form Catat: mode ubah');

/* 2b1e. simpan: 'catat' kalau baru, 'ubah' kalau sedang mengubah */
skrip = skrip.replace(
  `  var tombol = document.getElementById('tlSimpan');
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
}`,
  `  var tombol = document.getElementById('tlSimpan');
  if (tombol) { tombol.disabled = true; tombol.textContent = t('Menyimpan…'); }

  var ubah = (formTes.mode === 'ubah' && formTes.id);
  var b0 = isi[0];
  var f0 = FUND().filter(function (x) { return x.nama === b0.fund; })[0];
  var arah0 = arahTetapTag(b0.tag) || b0.arah;

  /* ✎ UBAH: Worker hanya mengubah SATU baris. Kalau Bapak menambah baris
     saat mengubah, baris pertama diubah dan sisanya dicatat sebagai baru. */
  var janji = ubah
    ? panggilServer('ubah', {
        id: Number(formTes.id), tanggal: tgl, keterangan: ket,
        fundId: f0 ? f0.id : 0, tag: b0.tag, arah: arah0, jumlah: numTes(b0.jml)
      }).then(function () {
        var sisa = isi.slice(1);
        if (!sisa.length) return null;
        return panggilServer('catat', {
          tanggal: tgl, keterangan: ket,
          baris: sisa.map(function (b) {
            var f = FUND().filter(function (x) { return x.nama === b.fund; })[0];
            return { fundId: f ? f.id : 0, tag: b.tag, arah: arahTetapTag(b.tag) || b.arah, jumlah: numTes(b.jml) };
          })
        });
      })
    : panggilServer('catat', {
        tanggal: tgl, keterangan: ket,
        baris: isi.map(function (b) {
          var f = FUND().filter(function (x) { return x.nama === b.fund; })[0];
          return { fundId: f ? f.id : 0, tag: b.tag, arah: arahTetapTag(b.tag) || b.arah, jumlah: numTes(b.jml) };
        })
      });

  janji.then(function () {
    formTes = null;
    barisDipilih = 0;
    return muatDariServer();
  }).then(function () {
    gbrInput();
    alert(t(ubah ? 'Perubahan tersimpan.' : 'Tersimpan ke server.'));
  }).catch(function (e) {
    if (tombol) { tombol.disabled = false; tombol.textContent = t(ubah ? 'Simpan perubahan' : 'Simpan'); }
    alert(e.message);
  });
}`,
);
catat.push('simpan: catat / ubah');

/* 2b1f. tombol ＋ = selalu transaksi BARU (lepas baris terpanggil) */
skrip = skrip.replace(
  `document.getElementById('btnAdd').addEventListener('click', function () {
  ke('input');
});`,
  `document.getElementById('btnAdd').addEventListener('click', function () {
  formTes = null;          /* ＋ = transaksi BARU, bukan lanjutan yang diubah */
  barisDipilih = 0;
  ke('input');
});`,
);
catat.push('tombol ＋ = transaksi baru');

/* 2b1g. tombol Batal di form ubah — kembali tanpa menyimpan */
skrip = skrip.replace(
  `  if (b.id === 'tlTambah') {`,
  `  if (b.id === 'tlBatalUbah') { formTes = null; barisDipilih = 0; ke('tx'); return; }
  if (b.id === 'tlTambah') {`,
);

/* ================================================================== */
/* 2b1h. 🧾 PAJAK BUNGA OTOMATIS (order Bapak 15 Okt 2026)             */
/* ------------------------------------------------------------------ */
/* Kalimat Bapak: *"kalau tag: bunga di saya isi .... seharusnya tag
   pajak : bisa langsung dihitung berapa ........"*
   → Begitu Bapak memilih tag Bunga dan mengisi jumlahnya, baris PAJAK
     langsung muncul di bawahnya dengan angka 20% yang sudah terisi.
     Bapak tinggal periksa (boleh dikoreksi) lalu Simpan.
   Rate diambil dari tax_config di server (bukan angka tetap di halaman).
   Rumus tetap satu tempat: core/bunga.ts. */

const blokPajakOtomatis = `
/* ============================================================
   14c. 🧾 PAJAK BUNGA OTOMATIS
   ------------------------------------------------------------
   Tag "Bunga" kena pajak (has_tax=1). Begitu baris Bunga diisi,
   baris Pajak muncul sendiri dengan angka rate dari server.
   ============================================================ */

/** Rate pajak bunga dari server (tax_config). Cadangan 20 kalau belum ada. */
function ratePajak() {
  var b = B();
  if (b && b.pajak && typeof b.pajak.rate === 'number') return b.pajak.rate;
  return 20;
}

/** Batas minimum bunga yang tidak dipotong pajak (0 = selalu dipotong). */
function minPajak() {
  var b = B();
  if (b && b.pajak && typeof b.pajak.minimum === 'number') return b.pajak.minimum;
  return 0;
}

/** Apakah baris ini tag Bunga yang masuk (D)? */
function barisBunga(b) {
  return b && b.tag === 'Bunga' && (arahTetapTag(b.tag) || b.arah) === 'D';
}

/** Apakah baris ini tag Pajak? */
function barisPajak(b) {
  return b && b.tag === 'Pajak';
}

/** Pajak = bunga × rate ÷ 100, dibulatkan 2 desimal (sen). */
function hitungPajak(bunga) {
  var n = Math.round(bunga * ratePajak()) / 100;
  return Math.round(n * 100) / 100;
}

/** Angka → teks 2 desimal gaya Indonesia (12328.76 → "12.328,76"). */
function jmlTeks(n) {
  return rp2(n);
}

/**
 * Selaraskan baris pajak dengan baris bunga.
 * Dipanggil setiap kali form digambar / jumlah berubah.
 *  • ada baris Bunga berisi  → pastikan ada baris Pajak tepat di bawahnya
 *  • tidak ada baris Bunga   → buang baris Pajak yang dibuat otomatis
 *  • Bapak sudah mengubah angka pajak sendiri → JANGAN ditimpa
 */
function selaraskanPajak() {
  if (!formTes || !formTes.baris) return;
  var arr = formTes.baris;

  /* buang baris pajak otomatis yang bunganya sudah tidak ada / kosong */
  for (var i = arr.length - 1; i >= 0; i--) {
    if (arr[i].auto && barisPajak(arr[i])) {
      var adaBunga = arr.some(function (x, j) {
        return j !== i && barisBunga(x) && numTes(x.jml) > 0;
      });
      if (!adaBunga) arr.splice(i, 1);
    }
  }

  /* tambahkan / perbarui baris pajak untuk tiap baris bunga */
  for (var k = 0; k < arr.length; k++) {
    var b = arr[k];
    if (!barisBunga(b)) continue;
    var bunga = numTes(b.jml);
    if (!(bunga > 0)) continue;
    if (bunga < minPajak()) continue;          /* bunga kecil → tidak dipotong */

    var pajak = hitungPajak(bunga);
    var sudah = arr[k + 1];
    if (sudah && barisPajak(sudah)) {
      /* Sudah ada baris pajak di bawahnya.
         Hitung ulang HANYA kalau jumlah bunganya berubah — supaya koreksi
         Bapak (mis. angka bank beda beberapa sen) tidak tertimpa saat form
         digambar ulang. */
      if (sudah.auto && sudah.dariBunga !== bunga) {
        sudah.jml = jmlTeks(pajak);
        sudah.fund = b.fund;
        sudah.dariBunga = bunga;
      }
      continue;
    }
    /* sisipkan baris pajak tepat di bawah baris bunga */
    arr.splice(k + 1, 0, {
      fund: b.fund, tag: 'Pajak', arah: 'K', jml: jmlTeks(pajak),
      auto: true, dariBunga: bunga
    });
    k++;
  }
}
`;
skrip = skrip.replace('</script>', blokPajakOtomatis + '\n</script>');
catat.push('pajak bunga otomatis: logika');

/* 2b1i. panggil penyelaras SEBELUM baris digambar — supaya baris pajak
   langsung ikut tampil begitu baris bunga diisi. */
skrip = skrip.replace(
  `  var baris = formTes.baris.map(function (b, i) {`,
  `  selaraskanPajak();
  var baris = formTes.baris.map(function (b, i) {`,
);
catat.push('pajak bunga otomatis: dipanggil saat form digambar');

/* 2b1j. saat jumlah / tag / fund berubah → selaraskan pajak lalu gambar ulang */
skrip = skrip.replace(
  `    formTes.baris[i].jml = rapi;
    hitungRingTes();
  }
});`,
  `    formTes.baris[i].jml = rapi;
    if (barisBunga(formTes.baris[i])) { selaraskanPajak(); gbrInput(); return; }
    hitungRingTes();
  }
});`,
);
skrip = skrip.replace(
  `  if (e.target.dataset.k === 'fund') { formTes.baris[i].fund = e.target.value; hitungRingTes(); }
  if (e.target.dataset.k === 'tag') {
    formTes.baris[i].tag = e.target.value;
    var tetap = arahTetapTag(e.target.value);
    if (tetap) formTes.baris[i].arah = tetap;
    gbrInput();
  }`,
  `  if (e.target.dataset.k === 'fund') {
    formTes.baris[i].fund = e.target.value;
    /* baris pajak otomatis ikut fund bunganya */
    if (formTes.baris[i].auto) { /* biarkan */ }
    hitungRingTes();
  }
  if (e.target.dataset.k === 'tag') {
    formTes.baris[i].tag = e.target.value;
    var tetap = arahTetapTag(e.target.value);
    if (tetap) formTes.baris[i].arah = tetap;
    /* Bapak memilih tag sendiri → baris ini bukan pajak otomatis lagi */
    formTes.baris[i].auto = false;
    formTes.baris[i].disentuh = true;
    selaraskanPajak();
    gbrInput();
  }`,
);
catat.push('pajak bunga otomatis: ikut berubah saat diisi');

/* 2b1k. saat Bapak mengetik angka pajak sendiri → jangan ditimpa lagi */
skrip = skrip.replace(
  `    formTes.baris[i].jml = rapi;
    hitungRingTes();
  }
});
document.getElementById('inputIsi').addEventListener('change', function (e) {`,
  `      formTes.baris[i].jml = rapi;
  hitungRingTes();
  }
});
document.getElementById('inputIsi').addEventListener('change', function (e) {`,
);

/* 2b1l. baris pajak otomatis diberi tanda supaya Bapak tahu angkanya hitungan sistem */
skrip = skrip.replace(
  `      '<input class="tl-jml" type="text" inputmode="decimal" data-i="' + i + '" data-k="jml" value="' + esc(b.jml) + '" placeholder="0">' +`,
  `      '<input class="tl-jml' + (b.auto ? ' auto' : '') + '" type="text" inputmode="decimal" data-i="' + i +
        '" data-k="jml" value="' + esc(b.jml) + '" placeholder="0"' +
        (b.auto ? ' title="' + esc(t('Pajak dihitung otomatis') + ' ' + ratePajak() + '%') + '"' : '') + '>' +`,
);
catat.push('pajak bunga otomatis: tanda di baris');

/* ================================================================== */
/* 2b1m. 💬 PESAN SINGKAT — pengganti alert()                          */
/* ------------------------------------------------------------------ */
/* Keluhan Bapak 15 Okt 2026: *"setiap kali simpan selalu ada messege yg
   harus di klik ok"* → pesan tidak lagi memblokir. Muncul sebentar di
   bawah, lalu hilang sendiri. Tidak perlu klik apa pun. */

const blokPesan = `
/* ============================================================
   14d. 💬 PESAN SINGKAT (toast) — pengganti alert()
   ------------------------------------------------------------
   Pesan muncul di bawah layar, hilang sendiri:
     • berhasil  → 2,6 detik
     • bermasalah → 6 detik (supaya sempat dibaca)
   Tidak ada tombol OK, tidak memblokir pekerjaan.
   ============================================================ */
function pesan(teks, jenis) {
  var w = document.getElementById('pesanWadah');
  if (!w) return;
  var d = document.createElement('div');
  d.className = 'pesan' + (jenis ? ' ' + jenis : '');
  d.textContent = teks;
  w.appendChild(d);
  setTimeout(function () { d.classList.add('tampil'); }, 10);
  setTimeout(function () {
    d.classList.remove('tampil');
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 300);
  }, jenis === 'salah' ? 6000 : 2600);
}

/* 🔴 Chrome menawarkan "Save password?" karena menemukan kolom type=password.
   UangKu tidak punya akun/password — PIN hanya kunci lokal (keluhan Bapak
   15 Okt 2026, muncul 2×). Percobaan pertama GAGAL: HTML masih type=password
   lalu diubah oleh skrip — Chrome sudah terlanjur memindai lebih dulu.
   Perbaikan: HTML LANGSUNG type=text + kelas .sandi (disamarkan CSS).
   Skrip di bawah hanya CADANGAN: kalau peramban tidak mendukung penyamaran,
   kolom dikembalikan ke type=password supaya PIN tidak terlihat. */
(function () {
  var p = document.getElementById('gPin');
  if (!p) return;
  var uji = document.createElement('input');
  uji.style.webkitTextSecurity = 'disc';
  if (uji.style.webkitTextSecurity !== 'disc') {
    p.type = 'password';
    p.classList.remove('sandi');
  }
})();
`;
skrip = skrip.replace('</script>', blokPesan + '\n</script>');
catat.push('pesan singkat: pengganti alert');

/* 2b1n. SEMUA alert() → pesan() — tidak ada lagi klik OK.
   Dilakukan paling akhir supaya seluruh skrip (termasuk bawaan uangku.html)
   ikut tergantikan. confirm() TIDAK diubah — konfirmasi hapus tetap perlu. */
const jmlAlert = (skrip.match(/\balert\(/g) || []).length;
skrip = skrip.replace(/\balert\(/g, 'pesan(');
catat.push('alert → pesan singkat (' + jmlAlert + ' tempat)');

/* 2b2. tombol "Buka Bulan Baru" di layar Pengaturan.
   Tanpa ini, mulai tanggal 1 bulan depan Bapak tidak bisa mencatat. */
skrip = skrip.replace(
  `      '<div class="r"><span class="k">Bulan</span><span class="v">' + BULAN.length + ' bulan</span></div>' +`,
  `      '<div class="r"><span class="k">Bulan</span><span class="v">' + BULAN.length + ' bulan</span></div>' +`,
);
skrip = skrip.replace(
  `  else if (subNama === 'Tentang') {`,
  `  else if (subNama === 'Bulan Baru') {
    var terakhir = BULAN.length ? BULAN[0].kunci : '';
    var tujuan = terakhir ? bulanBerikut(terakhir) : '';
    h += '<div class="dl">' +
      '<div class="r"><span class="k">' + t('Bulan terakhir') + '</span><span class="v">' +
        esc(terakhir ? namaBulanKunci(terakhir) : '—') + '</span></div>' +
      '<div class="r"><span class="k">' + t('Bulan berikutnya') + '</span><span class="v">' +
        esc(tujuan ? namaBulanKunci(tujuan) : '—') + '</span></div>' +
      '</div>';
    h += '<div class="sec">' + t('Cara kerja') + '</div>' +
      '<div class="hint">' + t('Saldo awal bulan baru diambil dari saldo akhir bulan terakhir, lalu bulan lama dikunci supaya tidak berubah lagi.') +
      '<br><br>' + t('Lakukan ini sekali setiap awal bulan, sebelum mencatat transaksi pertama.') + '</div>';
    h += '<div class="tl-card"><button class="btn-utama" id="btnBukaBulan" style="width:100%">' +
      t('Buka bulan baru') + '</button></div>';
  }
  else if (subNama === 'Tentang') {`,
);

/* 2b2a. 🔴 ANGKA SALDO JANGAN DISINGKAT (permintaan Bapak 13 Okt 2026):
   *"nilai saldo jangan di singkat karena ini harus akurat.. jadi jangan 25,5jt
     ini tidak memberi informasi yg tepat.. seharusnya ditulis 26.504.730,59"*
   Fungsi `rpRingkas` dulu mengubah 26.504.730,59 menjadi "26,50 jt".
   Sekarang SELALU angka penuh. Nama fungsi dipertahankan supaya semua
   pemanggilnya (13 tempat) tetap jalan tanpa diubah satu-satu. */
skrip = skrip.replace(
  `function rpRingkas(n) {
  var a = Math.abs(n);
  if (a >= 1e9) return (n < 0 ? '−' : '') + (a / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (a >= 1e6) return (n < 0 ? '−' : '') + (a / 1e6).toFixed(2).replace('.', ',') + ' jt';
  if (a >= 1000) return rp(n);
  return rp2(n);   /* di bawah 1.000 → tampilkan sen juga (mis. 0,29) */
}`,
  `/* 🔴 ANGKA SALDO TIDAK DISINGKAT — harus akurat sampai sen.
   Permintaan Bapak 13 Okt 2026: *"jangan 25,5jt ini tidak memberi informasi
   yg tepat.. seharusnya ditulis 26.504.730,59"*.
   Nama fungsi dipertahankan supaya semua pemanggil tetap jalan. */
function rpRingkas(n) {
  return rp2(n);
}`,
);
catat.push('angka saldo: tidak disingkat lagi');

/* 2b2b. 🔴 TAG BAWAAN FORM — jangan 'Transfer'.
   MASALAH NYATA 13 Okt 2026: tag bawaan form adalah 'Transfer' — tag DUA ARAH
   yang TIDAK mengunci D/K. Bapak mencatat 3 transaksi (service ac, ayam mentah,
   makan siang) tanpa mengganti tag → semuanya tersimpan sebagai 'Transfer',
   sehingga:
     ① tidak muncul di Ringkasan bulan ini (Transfer dikecualikan)
     ② saldo Superbank di UangKu beda dengan catatan bank
   Obat: tag bawaan = tag PERTAMA yang mengunci arah (biasanya 'Rumah' → K),
   supaya arah selalu terkunci dan Bapak sadar harus memilih tag. */
skrip = skrip.replace(
  `  if (!formTes) formTes = { tgl: hariIniISO(), ket: '', baris: [
    { fund: bln.fund[0] ? bln.fund[0].nama : '', tag: 'Transfer', arah: 'K', jml: '' },
    { fund: bln.fund[0] ? bln.fund[0].nama : '', tag: 'Transfer', arah: 'K', jml: '' } ] };`,
  `  if (!formTes) formTes = { tgl: hariIniISO(), ket: '', baris: [
    { fund: bln.fund[0] ? bln.fund[0].nama : '', tag: tagBawaan(bln), arah: 'K', jml: '' },
    { fund: bln.fund[0] ? bln.fund[0].nama : '', tag: tagBawaan(bln), arah: 'K', jml: '' } ] };`,
);
skrip = skrip.replace(
  `  if (b.id === 'tlTambah') { formTes.baris.push({ fund: B().fund[0].nama, tag: 'Transfer', arah: 'K', jml: '' }); gbrInput(); return; }`,
  `  if (b.id === 'tlTambah') { formTes.baris.push({ fund: B().fund[0].nama, tag: tagBawaan(B()), arah: 'K', jml: '' }); gbrInput(); return; }`,
);
/* ⚠️ `tagBawaan()` TIDAK disisipkan di sini — uangku.html sudah punya
   (baris ~1495). Dulu disisipkan juga → fungsi dobel → SyntaxError
   "Identifier 'tagBawaan' has already been declared" → SELURUH halaman mati.
   Bug nyata ditemukan 15 Okt 2026. */
catat.push('tag bawaan form: bukan Transfer lagi');

/* 2b2c. 🔴 PERINGATAN TAG TRANSFER di layar Catat.
   'Transfer' artinya uang PINDAH TEMPAT — dikecualikan dari Ringkasan bulan ini.
   Kalau Bapak memakainya untuk belanja biasa, transaksi itu "hilang" dari laporan
   dan saldo terlihat beda dengan catatan bank (masalah nyata 13 Okt 2026).
   Peringatan ini muncul di RINGKASAN saat ada baris bertag Transfer. */
skrip = skrip.replace(
  `  r.innerHTML = '<div class="tl-r"><span>Total masuk (dihitung)</span><b class="mono">+' + rp2(masuk) + '</b></div>' +`,
  `  var adaTransfer = formTes.baris.some(function (b) {
    return b.tag === 'Transfer' && numTes(b.jml) > 0;
  });
  r.innerHTML = (adaTransfer
      ? '<div class="peringatan-tag">⚠️ ' + t('Tag "Transfer" artinya uang PINDAH TEMPAT — tidak dihitung di Ringkasan bulan ini.') +
        '<br>' + t('Kalau ini belanja biasa, ganti tagnya (mis. Rumah / Pribadi / Pet).') + '</div>'
      : '') +
    '<div class="tl-r"><span>Total masuk (dihitung)</span><b class="mono">+' + rp2(masuk) + '</b></div>' +`,
);
catat.push('peringatan tag Transfer di layar Catat');

/* 2b3. pita peringatan "bulan ini belum dibuka" di paling atas Dashboard.
   Tanpa ini Bapak baru sadar tidak bisa mencatat setelah mencoba. */
skrip = skrip.replace(
  `  h += '<div class="sec">' + t('Sumber fund · saldo akhir') + '</div>' +
    kisiFund(document.getElementById('dashIsi'));`,
  `  h += pitaBulanBaru();
  h += '<div class="sec">' + t('Sumber fund · saldo akhir') + '</div>' +
    kisiFund(document.getElementById('dashIsi'));`,
);
/* tombol di dalam pita harus dipasang setelah Dashboard digambar */
skrip = skrip.replace(
  `  document.getElementById('tbSet').textContent = t('Pengaturan');`,
  `  document.getElementById('tbSet').textContent = t('Pengaturan');
`,
);

/* tambahkan baris menu "Bulan Baru" di daftar Pengaturan */
skrip = skrip.replace(
  `  { n: 'Daftar Istilah', i: '📖', s: 'padanan istilah keuangan' },`,
  `  { n: 'Bulan Baru', i: '📅', s: 'siapkan saldo awal bulan depan' },
  { n: 'Daftar Istilah', i: '📖', s: 'padanan istilah keuangan' },`,
);
/* terjemahan nama menu baru */
skrip = skrip.replace(
  `'Bahasa':'Language','Daftar Istilah':'Glossary','Tentang':'About',`,
  `'Bahasa':'Language','Daftar Istilah':'Glossary','Tentang':'About',
  'Bulan Baru':'New month','Bulan terakhir':'Last month','Bulan berikutnya':'Next month',
  'Buka bulan baru':'Open new month','Buka bulan baru?':'Open a new month?',
  'Bulan baru siap':'New month is ready','Bulan itu sudah siap':'That month is already ready',
  'Saldo awal bulan baru diambil dari saldo akhir bulan terakhir, lalu bulan lama dikunci.':'The opening balance of the new month comes from the closing balance of the last month, then the old month is locked.',
  'Lakukan ini sekali setiap awal bulan, sebelum mencatat transaksi pertama.':'Do this once at the start of each month, before recording the first transaction.',
  'Saldo awal bulan baru diambil dari saldo akhir bulan terakhir, lalu bulan lama dikunci supaya tidak berubah lagi.':'The opening balance of the new month comes from the closing balance of the last month, then the old month is locked so it cannot change again.',
  'Tag "Transfer" artinya uang PINDAH TEMPAT — tidak dihitung di Ringkasan bulan ini.':'The "Transfer" tag means money MOVED PLACE — it is not counted in this month\\'s Summary.',
  'Kalau ini belanja biasa, ganti tagnya (mis. Rumah / Pribadi / Pet).':'If this is an ordinary expense, change the tag (e.g. Rumah / Pribadi / Pet).',
  'Bulan ini belum dibuka':'This month is not open yet',
  'buka dulu supaya bisa mencatat':'open it first so you can record',
  'Buka sekarang':'Open now',
  'Riwayat':'History','Ubah transaksi':'Edit transaction','Hapus transaksi':'Delete transaction',
  'Simpan perubahan':'Save changes','Batal':'Cancel','Mengubah transaksi':'Editing transaction',
  'tekan Simpan kalau sudah benar.':'press Save when it is correct.',
  'Perubahan tersimpan.':'Changes saved.',
  'Ketuk satu baris transaksi dulu, baru tekan Edit.':'Tap a transaction row first, then press Edit.',
  'Ketuk satu baris transaksi dulu, baru tekan Hapus.':'Tap a transaction row first, then press Delete.',
  'Hapus transaksi ini?':'Delete this transaction?',
  'Bisa dipulihkan dari layar Riwayat.':'It can be restored from the History screen.',
  'Sudah dihapus. Bisa dipulihkan dari Riwayat.':'Deleted. It can be restored from History.',
  'Bulan ini terkunci — tidak bisa diubah.':'This month is locked — it cannot be edited.',
  'Bulan ini terkunci — tidak bisa dihapus.':'This month is locked — it cannot be deleted.',
  'Pajak dihitung otomatis':'Tax calculated automatically',`,
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

/* 4a. tombol Riwayat · ＋ · Edit · Hapus di kepala — sejajar (order Bapak 15 Okt 2026).
   Edit & Hapus ABU-ABU selama belum ada baris transaksi yang dipanggil;
   menjadi HITAM begitu Bapak memanggil satu baris. */
h = h.replace(
  '  <button id="btnAdd" hidden title="Tambah transaksi" class="plus">＋</button>',
  '  <button id="btnRiwayat" hidden title="Riwayat">Riwayat</button>\n' +
  '  <button id="btnAdd" hidden title="Tambah transaksi" class="plus">＋</button>\n' +
  '  <button id="btnEdit" hidden title="Ubah transaksi" disabled>✎</button>\n' +
  '  <button id="btnHapus" hidden title="Hapus transaksi" disabled>✕</button>',
);

/* 4b. tab bawah & kepala disembunyikan sampai PIN benar */
h = h.replace('<nav class="tabs">', '<nav class="tabs" id="tabs" hidden>');

/* 4c. layar Riwayat + gerbang PIN + gaya tambahan, sebelum </body> */
const HTML_TAMBAHAN = `
<!-- ---------------------------- RIWAYAT ---------------------------- -->
<main class="body" id="pgRiwayat" hidden>
  <div id="riwayatIsi"></div>
</main>

<!-- ---------------------------- PESAN SINGKAT ---------------------------- -->
<div id="pesanWadah"></div>

<!-- ---------------------------- GERBANG PIN ---------------------------- -->
<div id="gerbang">
  <div class="gerbang-kartu">
    <div class="gerbang-judul">UangKu</div>
    <div class="gerbang-ket">Masukkan PIN untuk menyambung ke server.</div>
    <label class="gerbang-label">PIN</label>
    <input id="gPin" type="text" class="sandi" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="PIN akses">
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
/* ✎ Edit & ✕ Hapus — sejajar dengan Riwayat & ＋ (order Bapak 15 Okt 2026).
   ABU-ABU = belum ada baris dipanggil · HITAM = sudah ada baris dipanggil. */
#btnEdit,#btnHapus{
  border:1px solid #ddd; background:none; color:#aaa; font-size:15px;
  line-height:1; padding:4px 9px; border-radius:6px;
}
/* 🔴 HITAM 100% saat baris dipanggil (permintaan Bapak 15 Okt 2026:
   *"seharusnya warna hitam 100%"*). Jangan pakai opacity — opacity membuat
   tombol terlihat abu tipis walau warnanya sudah hitam. */
#btnEdit.siap,#btnHapus.siap{
  border-color:#000; color:#000; font-weight:700; opacity:1;
}
#btnEdit:disabled,#btnHapus:disabled{opacity:.45; cursor:default}
/* baris pajak otomatis — angka hitungan sistem, boleh dikoreksi Bapak */
.tl-jml.auto{border-color:#111; font-weight:700}
/* 💬 pesan singkat — muncul di bawah, hilang sendiri, tidak perlu diklik */
#pesanWadah{
  position:fixed; left:0; right:0; bottom:64px; z-index:60;
  display:flex; flex-direction:column; align-items:center; gap:6px;
  pointer-events:none; padding:0 12px;
}
.pesan{
  max-width:420px; padding:9px 14px; border-radius:8px; font-size:13px;
  line-height:1.35; background:#111; color:#fff; border:1px solid #111;
  opacity:0; transform:translateY(8px); transition:opacity .25s, transform .25s;
  box-shadow:0 2px 10px rgba(0,0,0,.18);
}
.pesan.tampil{opacity:1; transform:translateY(0)}
.pesan.salah{background:#fff; color:#c00; border-color:#c00; font-weight:600}
/* kolom PIN disamarkan tanpa type=password — supaya Chrome tidak menawarkan
   "Save password?" setiap kali menyimpan (keluhan Bapak 15 Okt 2026) */
input.sandi{-webkit-text-security:disc; text-security:disc}
/* baris transaksi yang sedang DIPANGGIL (diketuk) — tanda hitam-putih, bukan warna */
.txt tbody tr[data-tx]{cursor:pointer}
.txt tbody tr.dipanggil td{background:var(--soft)}
.txt tbody tr.dipanggil td:first-child{box-shadow:inset 3px 0 0 var(--ink)}
/* 🔴 ANGKA SALDO PANJANG — jangan terpotong (permintaan Bapak 13 Okt 2026).
   Angka penuh seperti 26.504.730,59 lebih panjang daripada "26,50 jt".
   Kartu fund: angka boleh PATAH di titik ribuan (bukan dipotong "…").
   Kotak 4 kolom & kepala chip: huruf dikecilkan sedikit supaya tetap utuh. */
.item .val{font-size:10.5px;letter-spacing:-.2px}
.saldo .grid.k4 .cell .v{font-size:11.5px;letter-spacing:-.3px}
.saldo .grid .cell .v{font-size:12px;letter-spacing:-.3px}
.chips .kepala .pn{font-size:10px;letter-spacing:-.2px}
.item .sub{font-size:8.5px}

/* pita peringatan "bulan ini belum dibuka" — hitam-putih, warna hanya untuk peringatan */
.pita-perlu{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:8px 0;
  padding:8px 10px; border:1px solid currentColor; border-radius:8px;
  font-size:13px; line-height:1.35;
}
.pita-perlu .btn-kecil{margin-left:auto}
/* peringatan tag Transfer di layar Catat — hitam-putih, warna hanya untuk peringatan */
.peringatan-tag{
  margin:0 0 8px; padding:8px 10px; border:1px solid currentColor; border-radius:8px;
  font-size:12.5px; line-height:1.4;
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
/* ⚠️ Tema gelap aplikasi memakai kelas html.dark — BUKAN prefers-color-scheme.
   Bug nyata 15 Okt 2026: aturan prefers-color-scheme membuat tombol ✎ ✕
   menjadi PUTIH di atas latar PUTIH (komputer bertema gelap, aplikasi terang)
   → tombol nyaris tak terlihat. Karena itu hanya html.dark yang dipakai. */
html.dark #btnEdit,html.dark #btnHapus{border-color:#333; color:#666}
html.dark #btnEdit.siap,html.dark #btnHapus.siap{border-color:#fff; color:#fff; opacity:1}
html.dark .pesan{background:#eee; color:#000; border-color:#eee}
html.dark .pesan.salah{background:#000; color:#ff6b6b; border-color:#ff6b6b}
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

/* Periksa tidak ada sisa DATA KEUANGAN yang ikut.
   ⚠️ Jangan menaruh angka saldo asli di sini — berkas ini ikut ke repo publik.
   Yang diperiksa: blok data JSON bawaan, dan angka panjang (≥ 7 digit) yang
   hanya muncul kalau ada saldo/jumlah transaksi yang tertinggal. */
const sisaBlokData = /<script id="data-uangku"/.test(h);
const angkaPanjang = (h.match(/\b\d{7,}\b/g) || [])
  .filter((n) => !/^\d{7,}$/.test(n) === false)
  .filter((n) => Number(n) > 1_000_000);
const mencurigakan = [...new Set(angkaPanjang)].slice(0, 10);
console.log(sisaBlokData
  ? '\n⚠️  Blok data bawaan masih ada — data keuangan bisa ikut terkirim!'
  : '\n✅ Blok data bawaan sudah dibuang');
console.log(mencurigakan.length === 0
  ? '✅ Tidak ada angka panjang (≥ 7 digit) di dalam berkas'
  : '⚠️  Ada angka panjang — periksa dulu: ' + mencurigakan.join(', '));
