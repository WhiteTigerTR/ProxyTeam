/* global process */
// TR: Türkçe ve İngilizce belgelerin yapıca eşit kaldığını denetler: başlık sayıları (düzeye göre), kod bloğu sayısı,
// tablo satırı sayısı ve kod bloklarındaki komutlar. Bir dilde yapılan değişikliğin öbür dilde unutulmasını yakalar.
// Çevirinin doğruluğunu denetlemez; o hâlâ okuyarak yapılır. Koşu: node --test araclar/belge-esligi.test.mjs
// Yalnız kitin kendi deposunda çalışır; kurulan projeye kopyalanmaz.
//
// EN: Checks that the Turkish and English documents stay structurally in step: heading counts (per level), number of
// code blocks, number of table rows, and the commands inside code blocks. It catches a change made in one language and
// forgotten in the other. It does not check that the translation is right; that is still done by reading.
// Run: node --test araclar/belge-esligi.test.mjs
// It only runs in the kit's own repository; it is not copied into installed projects.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CIFTLER = [
  ["KILAVUZ.md", "GUIDE.en.md"],
  ["HIZLI-BASLANGIC.md", "QUICKSTART.en.md"],
  ["KULLANIM-TALIMATI.md", "USAGE.en.md"],
  ["OLCUM-GUNLUGU.md", "MEASUREMENT-LOG.en.md"],
  ["DEGISIKLIKLER.md", "CHANGELOG.en.md"],
];
// Komut sayılan satır başları. Açıklama (# ...) ve yer tutucu metin dile göre değişir; yalnız komutun kendisi karşılaştırılır.
// EN: Line starts that count as commands. Comments (# ...) and placeholder text differ by language; only the command itself is compared.
const KOMUT = /^(bash|sh|node|python3|git|claude|npm|npx)\s/;

/** Bir belgenin yapı özeti. / EN: Structural summary of one document. */
export function ozet(metin) {
  const o = { baslik: {}, kodBlogu: 0, tabloSatiri: 0, komutlar: [] };
  let kodda = false;
  for (const satir of metin.split("\n")) {
    if (satir.startsWith("```")) {
      kodda = !kodda;
      if (kodda) o.kodBlogu += 1;
      continue;
    }
    if (kodda) {
      const s = satir.trim();
      if (KOMUT.test(s)) o.komutlar.push(s.replace(/\s+#.*$/, ""));
      continue;
    }
    const b = /^(#{1,6})\s/.exec(satir);
    if (b) o.baslik[b[1].length] = (o.baslik[b[1].length] ?? 0) + 1;
    else if (satir.startsWith("|")) o.tabloSatiri += 1;
  }
  o.komutlar.sort();
  return o;
}

const varMi = CIFTLER.every(([tr, en]) => fs.existsSync(path.join(KOK, tr)) && fs.existsSync(path.join(KOK, en)));

test("özet: başlık, kod bloğu, tablo satırı ve komutları sayar; açıklamayı komuttan ayırır", () => {
  const o = ozet("# A\n\n## B\n\n| x |\n|---|\n\n```bash\nnode araclar/mola.mjs   # güvende\n# yalnız açıklama\n```\n");
  assert.deepEqual(o.baslik, { 1: 1, 2: 1 });
  assert.equal(o.kodBlogu, 1);
  assert.equal(o.tabloSatiri, 2);
  assert.deepEqual(o.komutlar, ["node araclar/mola.mjs"]);
});

for (const [tr, en] of CIFTLER) {
  test(`eşlik: ${tr} ↔ ${en}`, { skip: varMi ? false : "belgeler yok (kurulmuş proje)" }, () => {
    const a = ozet(fs.readFileSync(path.join(KOK, tr), "utf8"));
    const b = ozet(fs.readFileSync(path.join(KOK, en), "utf8"));
    assert.deepEqual(b.baslik, a.baslik, "başlık sayıları (düzeye göre) farklı");
    assert.equal(b.kodBlogu, a.kodBlogu, "kod bloğu sayısı farklı");
    assert.equal(b.tabloSatiri, a.tabloSatiri, "tablo satırı sayısı farklı");
    assert.deepEqual(b.komutlar, a.komutlar, "kod bloklarındaki komutlar farklı");
  });
}
