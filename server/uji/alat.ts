/**
 * server/uji/alat.ts — ALAT UJI SEDERHANA (tanpa kerangka uji)
 * 1 perintah = tahu masih benar (aturan C5)
 */

let jumlah = 0;
let gagal = 0;
const pesanGagal: string[] = [];

export function uji(nama: string, hasil: boolean, keterangan = ''): void {
  jumlah++;
  if (hasil) {
    console.log('  ✅ ' + nama + (keterangan ? '  — ' + keterangan : ''));
  } else {
    gagal++;
    pesanGagal.push(nama + (keterangan ? '  — ' + keterangan : ''));
    console.log('  ❌ ' + nama + (keterangan ? '  — ' + keterangan : ''));
  }
}

export function sama(nama: string, dapat: unknown, harus: unknown): void {
  const a = JSON.stringify(dapat);
  const b = JSON.stringify(harus);
  uji(nama, a === b, a === b ? String(dapat) : `dapat ${a}, harus ${b}`);
}

export function dekat(nama: string, dapat: number, harus: number, toleransi = 0.005): void {
  const beda = Math.abs(dapat - harus);
  uji(nama, beda <= toleransi, `dapat ${dapat}, harus ${harus} (beda ${beda.toFixed(6)})`);
}

export function bagian(judul: string): void {
  console.log('\n── ' + judul + ' ' + '─'.repeat(Math.max(0, 46 - judul.length)));
}

export function lapor(namaBerkas: string): void {
  console.log('\n' + '='.repeat(50));
  if (gagal === 0) {
    console.log(`✅ ${namaBerkas}: ${jumlah} uji, 0 gagal`);
  } else {
    console.log(`❌ ${namaBerkas}: ${jumlah} uji, ${gagal} GAGAL`);
    pesanGagal.forEach((p) => console.log('   • ' + p));
  }
  console.log('='.repeat(50));
  if (gagal > 0) process.exitCode = 1;
}
