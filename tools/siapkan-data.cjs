/**
 * siapkan-data.cjs — SIAPKAN DATA untuk uangku.html (versi HP/Android)
 *
 * 🔴 ATURAN:
 *   • BACA SAJA uangku.db — tidak mengubah apa pun (aturan B2/B3)
 *   • Angka memakai ATURAN YANG SAMA dengan core/saldo.ts:
 *       - deleted_at IS NULL
 *       - COALESCE(is_historical,0) = 0
 *       - batas bulan WAJIB awal DAN akhir (aturan C3)
 *       - 5 tag dikecualikan: Transfer · Koreksi · Pinjam · Hutang · Reimburse
 *   • Hasil ditulis ke dalam uangku.html (di antara penanda data) supaya
 *     berkas itu bisa dibuka di Android TANPA server dan TANPA internet.
 *
 * Jalankan: node tools\siapkan-data.cjs
 */
const fs = require('fs');
const D = require('c:/data/UangKu/node_modules/better-sqlite3');

const BERKAS_HTML = 'c:/data/UangKu/uangku.html';
const BERKAS_JSON = 'c:/data/UangKu/data/uangku-data.json';
const BULAN_MAKS = 4;

/* 5 tag yang DIKECUALIKAN dari ringkasan — persis sistem lama dashboard.ts:241 */
const TAG_KECUALI = ['Transfer', 'Koreksi', 'Pinjam', 'Hutang', 'Reimburse'];

const IKON_FUND = {
  Superbank: '🏦', SeaBank: '🌊', Celengan: '🐷', 'Dana Sopir': '🧑‍✈️',
  'Dana swn': '👥', Tunai: '💵', 'Sopir pinjam uang': '🤝', 'BCA tabungan': '🏧',
  'BCA Saham': '📈', Deposito: '🔒', 'Tabungan A': '🅰️', 'Tabungan B': '🅱️',
  ShopeePay: '🛒', OVO: '🟣', GoPay: '🟢', 'Tabungan C': '🇨', 'Tabungan D': '🇩',
  'Tabungan E': '🇪',
};

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const db = new D('c:/data/UangKu/data/uangku.db', { readonly: true, fileMustExist: true });
const semua = (sql, ...a) => db.prepare(sql).all(...a);
const satu = (sql, ...a) => db.prepare(sql).get(...a);

const dua = (n) => String(n).padStart(2, '0');
const akhirBulan = (y, m) => `${y}-${dua(m)}-${dua(new Date(y, m, 0).getDate())}`;

/* ------------------------------------------------------------------ FUND */
const fund = semua(`
  SELECT id, name, sort_order, is_blocked, is_titipan, minimum_saldo
  FROM source_funds WHERE deleted_at IS NULL ORDER BY sort_order, id
`);

/* ------------------------------------------------------------------- TAG */
const tag = semua(`
  SELECT id, name, icon, sort_order, journal_type, has_tax, is_system
  FROM tags WHERE deleted_at IS NULL ORDER BY sort_order, id
`);

/* --------------------------------------------- BULAN YANG TERSEDIA */
const bulanAda = semua(`
  SELECT year, month, COUNT(*) n, SUM(is_locked) nkunci
  FROM monthly_snapshots
  GROUP BY year, month ORDER BY year DESC, month DESC LIMIT ?
`, BULAN_MAKS);

if (bulanAda.length === 0) {
  console.error('❌ Tidak ada snapshot bulan di uangku.db');
  process.exit(1);
}

console.log('Bulan tersedia : ' + bulanAda.map((b) => `${b.month}/${b.year} (${b.n} fund, ${b.nkunci} terkunci)`).join(' · '));

/* --------------------------------------------------- HITUNG PER BULAN */
function hitungBulan(y, m) {
  const awal = `${y}-${dua(m)}-01`;
  const akhir = akhirBulan(y, m);

  const snap = semua(`
    SELECT source_fund_id AS fid, saldo_awal, saldo_akhir, is_locked
    FROM monthly_snapshots WHERE year=? AND month=?
  `, y, m);
  const petaSnap = new Map(snap.map((s) => [s.fid, s]));

  /* masuk / keluar / jumlah per fund */
  const alir = semua(`
    SELECT t.source_fund_id AS fid,
           COALESCE(SUM(CASE WHEN j.type='D' THEN t.amount ELSE 0 END),0) AS d,
           COALESCE(SUM(CASE WHEN j.type='K' THEN t.amount ELSE 0 END),0) AS k,
           COUNT(*) AS n
    FROM transactions t JOIN journals j ON j.id = t.journal_id
    WHERE t.date >= ? AND t.date <= ?
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
    GROUP BY t.source_fund_id
  `, awal, akhir);
  const petaAlir = new Map(alir.map((a) => [a.fid, a]));

  const daftarFund = fund.map((f) => {
    const s = petaSnap.get(f.id);
    const a = petaAlir.get(f.id) || { d: 0, k: 0, n: 0 };
    const saldoAwal = s ? s.saldo_awal : 0;
    return {
      id: f.id,
      nama: f.name,
      ikon: IKON_FUND[f.name] || '💰',
      urut: f.sort_order,
      diblokir: !!f.is_blocked,
      titipan: !!f.is_titipan,
      minSaldo: f.minimum_saldo,
      saldoAwal: Math.round(saldoAwal * 100) / 100,
      masuk: Math.round(a.d * 100) / 100,
      keluar: Math.round(a.k * 100) / 100,
      saldo: Math.round((saldoAwal + a.d - a.k) * 100) / 100,
      n: a.n,
      adaSnap: !!s,
    };
  });

  /* transaksi bulan ini */
  const tx = semua(`
    SELECT t.id, t.date, t.description, t.amount, t.tag, t.has_tax,
           t.transfer_pair_id, t.deleted_at, t.is_historical, t.notes,
           j.type AS arah, f.name AS fund, f.id AS fid
    FROM transactions t
    JOIN journals j ON j.id = t.journal_id
    JOIN source_funds f ON f.id = t.source_fund_id
    WHERE t.date >= ? AND t.date <= ?
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
    ORDER BY t.date DESC, t.id DESC
  `, awal, akhir);

  /* ringkasan — 5 tag dikecualikan.
     ⚠️ WAJIB persis seperti core/saldo.ts:
        `t.tag IS NULL OR t.tag NOT IN (...)`
     Kalau `IS NULL` dilupakan, transaksi tanpa tag HILANG dari ringkasan
     (Agustus 2026: ada 1 tx Rp 600.000 tanpa tag → keluar jadi kurang).
     Ini jenis bug yang sama dengan sisa script mati di sistem lama.
     Nama tag ditulis langsung karena KONSTANTA tetap, dan daftarnya
     muncul 2× di query (Debit & Kredit). */
  const BUKAN = TAG_KECUALI.map((x) => `'${x}'`).join(',');
  const rk = satu(`
    SELECT
      COALESCE(SUM(CASE WHEN j.type='D' AND (t.tag IS NULL OR t.tag NOT IN (${BUKAN})) THEN t.amount ELSE 0 END),0) AS masuk,
      COALESCE(SUM(CASE WHEN j.type='K' AND (t.tag IS NULL OR t.tag NOT IN (${BUKAN})) THEN t.amount ELSE 0 END),0) AS keluar
    FROM transactions t JOIN journals j ON j.id = t.journal_id
    WHERE t.date >= ? AND t.date <= ?
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
  `, awal, akhir);

  const bp = satu(`
    SELECT
      COALESCE(SUM(CASE WHEN j.type='D' THEN t.amount ELSE 0 END),0) AS bunga,
      COUNT(CASE WHEN j.type='D' THEN 1 END) AS nBunga
    FROM transactions t JOIN journals j ON j.id = t.journal_id
    WHERE t.date >= ? AND t.date <= ? AND t.tag='Bunga'
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
  `, awal, akhir);
  const pj = satu(`
    SELECT
      COALESCE(SUM(CASE WHEN j.type='K' THEN t.amount ELSE 0 END),0) AS pajak,
      COUNT(CASE WHEN j.type='K' THEN 1 END) AS nPajak
    FROM transactions t JOIN journals j ON j.id = t.journal_id
    WHERE t.date >= ? AND t.date <= ? AND t.tag='Pajak'
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
  `, awal, akhir);

  /* hitung per tag */
  const perTag = semua(`
    SELECT t.tag AS nama,
           COALESCE(SUM(CASE WHEN j.type='D' THEN t.amount ELSE 0 END),0) AS masuk,
           COALESCE(SUM(CASE WHEN j.type='K' THEN t.amount ELSE 0 END),0) AS keluar,
           COUNT(*) AS n
    FROM transactions t JOIN journals j ON j.id = t.journal_id
    WHERE t.date >= ? AND t.date <= ?
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
    GROUP BY t.tag
  `, awal, akhir);
  const petaTag = new Map(perTag.map((p) => [p.nama, p]));

  const totSaldo = daftarFund.reduce((s, f) => s + f.saldo, 0);
  const totAwal = daftarFund.reduce((s, f) => s + f.saldoAwal, 0);
  const tersedia = daftarFund.filter((f) => !f.diblokir && !f.titipan).reduce((s, f) => s + f.saldo, 0);
  const diblokir = daftarFund.filter((f) => f.diblokir && !f.titipan).reduce((s, f) => s + f.saldo, 0);
  const titipan = daftarFund.filter((f) => f.titipan).reduce((s, f) => s + f.saldo, 0);

  const b = bp.bunga, p = pj.pajak;

  return {
    kunci: `${y}-${dua(m)}`,
    label: `${NAMA_BULAN[m - 1]} ${y}`,
    labelSingkat: `${NAMA_BULAN[m - 1].slice(0, 3)} ${y}`,
    awal, akhir,
    terkunci: daftarFund.every((f) => {
      const s = petaSnap.get(f.id);
      return !!s && s.is_locked;
    }),
    fund: daftarFund,
    tag: tag.map((g) => {
      const pt = petaTag.get(g.name);
      return {
        id: g.id, nama: g.name, ikon: g.icon || '🏷️', urut: g.sort_order,
        arah: g.journal_type || 'bebas',
        pajak: !!g.has_tax, sistem: !!g.is_system,
        dikecualikan: TAG_KECUALI.includes(g.name),
        masuk: pt ? Math.round(pt.masuk * 100) / 100 : 0,
        keluar: pt ? Math.round(pt.keluar * 100) / 100 : 0,
        n: pt ? pt.n : 0,
      };
    }),
    tx: tx.map((t) => ({
      id: t.id, tanggal: t.date, ket: t.description,
      jumlah: Math.round(t.amount * 100) / 100,
      arah: t.arah, tag: t.tag || '(kosong)', fund: t.fund, fid: t.fid,
      pasangan: t.transfer_pair_id || 0,
      pajak: !!t.has_tax,
      catatan: t.notes || '',
    })),
    ringkas: {
      total: Math.round(totSaldo * 100) / 100,
      totalAwal: Math.round(totAwal * 100) / 100,
      tersedia: Math.round(tersedia * 100) / 100,
      diblokir: Math.round(diblokir * 100) / 100,
      titipan: Math.round(titipan * 100) / 100,
      masuk: Math.round(rk.masuk * 100) / 100,
      keluar: Math.round(rk.keluar * 100) / 100,
      selisih: Math.round((rk.masuk - rk.keluar) * 100) / 100,
      bunga: Math.round(b * 100) / 100, nBunga: bp.nBunga,
      pajak: Math.round(p * 100) / 100, nPajak: pj.nPajak,
      bungaNeto: Math.round((b - p) * 100) / 100,
    },
  };
}

const bulan = bulanAda.map((b) => hitungBulan(b.year, b.month));

/* -------------------------------------------------------- PERIKSA WARAS */
console.log('\n=== PERIKSA ANGKA ===');
let gagal = 0;
for (const b of bulan) {
  const kurang = b.fund.filter((f) => !f.adaSnap).map((f) => f.nama);
  const tanda = kurang.length === 0 ? '✅' : '⚠️';
  if (kurang.length) gagal++;
  console.log(
    `${tanda} ${b.label.padEnd(16)} ${b.tx.length.toString().padStart(4)} tx · ` +
    `saldo ${b.ringkas.total.toLocaleString('id-ID').padStart(15)} · ` +
    `masuk ${b.ringkas.masuk.toLocaleString('id-ID').padStart(13)} · ` +
    `keluar ${b.ringkas.keluar.toLocaleString('id-ID').padStart(13)}` +
    (kurang.length ? `  ⚠️ tanpa snapshot: ${kurang.join(', ')}` : '')
  );
}

/* Bandingkan bulan terbaru dengan angka yang sudah TERBUKTI di uji T1 */
const terbaru = bulan[0];
if (terbaru.kunci === '2026-09') {
  const harus = { total: 288175713, masuk: 14191861.37, keluar: 7340614.86 };
  const cek = (nama, dapat, harusNilai) => {
    const beda = Math.abs(dapat - harusNilai);
    const ok = beda < 1;
    if (!ok) gagal++;
    console.log(`  ${ok ? '✅' : '❌'} ${nama}: ${dapat.toLocaleString('id-ID')} vs ${harusNilai.toLocaleString('id-ID')} (beda ${beda.toFixed(2)})`);
  };
  console.log('\n=== BANDINGKAN dengan bukti uji T1 (September 2026) ===');
  cek('total saldo', terbaru.ringkas.total, harus.total);
  cek('masuk', terbaru.ringkas.masuk, harus.masuk);
  cek('keluar', terbaru.ringkas.keluar, harus.keluar);
}

const keluar2 = {
  meta: {
    dibuat: new Date().toISOString().slice(0, 16).replace('T', ' '),
    sumber: 'uangku.db (salinan kerja keuangan.db)',
    tagKecuali: TAG_KECUALI,
    catatan: 'Berkas ini HANYA BACA. Angka memakai aturan core/saldo.ts.',
  },
  bulan,
};

fs.mkdirSync('c:/data/UangKu/data', { recursive: true });
fs.writeFileSync(BERKAS_JSON, JSON.stringify(keluar2, null, 1), 'utf8');
console.log(`\nData ditulis → ${BERKAS_JSON} (${(fs.statSync(BERKAS_JSON).size / 1024).toFixed(0)} KB)`);

/* -------------------------------------------------- SUNTIK KE uangku.html */
if (!fs.existsSync(BERKAS_HTML)) {
  console.log('⚠️ uangku.html belum ada — data JSON saja yang ditulis.');
} else {
  const json = JSON.stringify(keluar2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = fs.readFileSync(BERKAS_HTML, 'utf8');
  const pola = /<script id="data-uangku" type="application\/json">[\s\S]*?<\/script>/;
  if (!pola.test(html)) {
    console.error('❌ Penanda <script id="data-uangku"> tidak ditemukan di uangku.html');
    process.exit(1);
  }
  fs.writeFileSync(BERKAS_HTML, html.replace(pola, `<script id="data-uangku" type="application/json">${json}</script>`), 'utf8');
  console.log(`✅ uangku.html disuntik data → ${(fs.statSync(BERKAS_HTML).size / 1024).toFixed(0)} KB`);
}

db.close();
console.log(gagal === 0 ? '\n✅ SIAP — semua angka wajar' : `\n⚠️ ${gagal} peringatan — periksa dulu`);
process.exitCode = gagal === 0 ? 0 : 1;
