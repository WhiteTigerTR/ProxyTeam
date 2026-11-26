// TR: Mola denetiminin testleri. Koşu: node --test araclar/mola.test.mjs
// Uçtan uca test geçici bir git deposu kurar (işletim sisteminin geçici klasöründe) ve sonunda siler.
//
// EN: Tests of the break check. Run: node --test araclar/mola.test.mjs
// The end-to-end test sets up a temporary git repository (in the operating system's temp folder) and deletes it at the end.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  argumanlariCoz,
  ayariHazirla,
  kopyalariAyristir,
  kopyasi,
  surecTanimi,
  surecleriSiniflandir,
  kilitDurumu,
  karar,
  rafCoz,
  molaFarki,
  devirNotuDurumu,
  windowsSurecleriAyristir,
} from "./mola.mjs";

const MOLA = path.join(path.dirname(fileURLToPath(import.meta.url)), "mola.mjs");

const WT = `worktree /k/proje
HEAD aaaaaaa1111111111111111111111111111111111
branch refs/heads/main

worktree /tmp/lider
HEAD bbbbbbb2222222222222222222222222222222222
detached

worktree /k/proje-0040
HEAD ccccccc3333333333333333333333333333333333
branch refs/heads/is/0040-ornek

worktree /tmp/silinmis
HEAD ddddddd4444444444444444444444444444444444
detached
prunable gitdir file points to non-existent location
`;
const kopyalar = kopyalariAyristir(WT).filter((k) => !k.kayip);
const ayar = ayariHazirla({});

test("argümanlar: mola, mola bitti, bitti, seçenekler, hatalar", () => {
  assert.equal(argumanlariCoz([]).komut, "mola");
  assert.equal(argumanlariCoz(["mola"]).komut, "mola");
  assert.equal(argumanlariCoz(["mola", "bitti"]).komut, "bitti");
  assert.equal(argumanlariCoz(["bitti"]).komut, "bitti");
  assert.deepEqual(argumanlariCoz(["--kok", "/x", "bitti", "--ayar", "/y.json"]), { komut: "bitti", kok: "/x", ayar: "/y.json" });
  assert.equal(argumanlariCoz(["--yardim"]).komut, "yardim");
  assert.throws(() => argumanlariCoz(["dur"]), /bilinmeyen komut/);
  assert.throws(() => argumanlariCoz(["--kok"]), /yol ister/);
  assert.throws(() => argumanlariCoz(["-x"]), /bilinmeyen seçenek/);
});

test("ayar: varsayılan, değiştirme, hatalı alanlar", () => {
  assert.equal(ayar.uzak, "origin");
  assert.ok(ayar.surecler.length > 0);
  const ozel = ayariHazirla({ uzak: "yedek", surecler: [{ ad: "derleyici", kalip: "make" }], bilgiKapilari: [3000], _aciklama: "x" });
  assert.equal(ozel.uzak, "yedek");
  assert.equal(ozel.surecler.length, 1);
  assert.equal(ozel.surecler[0].kapsam, "kopya");
  assert.deepEqual(ozel.bilgiKapilari, [3000]);
  assert.throws(() => ayariHazirla({ bilinmez: 1 }), /bilinmeyen ayar/);
  assert.throws(() => ayariHazirla({ surecler: [{ ad: "x", kalip: "(" }] }), /geçersiz düzenli ifade/);
  assert.throws(() => ayariHazirla({ surecler: [{ ad: "x", kalip: "x", kapsam: "her" }] }), /kapsam/);
  assert.throws(() => ayariHazirla({ kayit: "/mutlak/yol.json" }), /göreli/);
  assert.throws(() => ayariHazirla({ kilit: "../disari" }), /göreli/);
  assert.throws(() => ayariHazirla({ bilgiKapilari: ["80"] }), /kapı/);
  assert.throws(() => ayariHazirla([]), /nesne/);
});

test("worktree listesi: yol, dal, commit; ayrık ve kayıp kopya", () => {
  const hepsi = kopyalariAyristir(WT);
  assert.equal(hepsi.length, 4);
  assert.deepEqual(hepsi[0], { yol: "/k/proje", commit: "aaaaaaa1111111111111111111111111111111111", dal: "main", kayip: false });
  assert.equal(hepsi[1].dal, null);
  assert.equal(hepsi[2].dal, "is/0040-ornek");
  assert.equal(hepsi[3].kayip, true);
});

test("yolun kopyası: en uzun eşleşme, ad öneki karışmaz", () => {
  assert.equal(kopyasi("/k/proje/src", kopyalar).yol, "/k/proje");
  assert.equal(kopyasi("/k/proje-0040/src", kopyalar).yol, "/k/proje-0040");
  assert.equal(kopyasi("/baska/proje", kopyalar), null);
  assert.equal(kopyasi(null, kopyalar), null);
});

test("süreç tanımı: tanınanlar, yoksayılanlar, bilinmeyenler", () => {
  assert.equal(surecTanimi("/Applications/Blender.app/Contents/MacOS/Blender -b", ayar).ad, "Blender");
  assert.equal(surecTanimi("node /k/proje/node_modules/playwright/cli.js test", ayar).ad, "tarayıcı testi");
  assert.equal(surecTanimi("node /k/proje/node_modules/.bin/vite", ayar).ad, "geliştirme sunucusu");
  assert.equal(surecTanimi("node /k/proje/node_modules/vitest/vitest.mjs", ayar).ad, "test izleyici");
  assert.equal(surecTanimi("claude --resume", ayar), "yoksay");
  assert.equal(surecTanimi("-zsh", ayar), "yoksay");
  assert.equal(surecTanimi("/bin/bash", ayar), "yoksay");
  assert.equal(surecTanimi("node /usr/lib/node_modules/@anthropic-ai/claude-code/cli.js", ayar), "yoksay");
  assert.equal(surecTanimi("python3 sunucu.py", ayar), null);
});

test("süreç sınıflandırma: kopya dışı yok sayılır, bilgi kapısı grubu bilgi, her-yer kapsamı engel, bilinmeyen bilgi", () => {
  const surecler = [
    { pid: 10, pgid: 10, komut: "node /k/proje/node_modules/vite/bin/vite.js", cwd: "/k/proje/web" },
    { pid: 20, pgid: 20, komut: "node /k/proje-0040/node_modules/playwright/cli.js test", cwd: "/k/proje-0040" },
    { pid: 21, pgid: 21, komut: "node /x/node_modules/vite/bin/vite.js", cwd: "/baska/proje" },
    { pid: 30, pgid: 30, komut: "/Applications/Blender.app/Contents/MacOS/Blender -b", cwd: "/home/x" },
    { pid: 40, pgid: 40, komut: "python3 sunucu.py", cwd: "/k/proje" },
    { pid: 41, pgid: 41, komut: "python3 baska.py", cwd: "/baska" },
    { pid: 42, pgid: 42, komut: "-zsh", cwd: "/k/proje" },
    { pid: 50, pgid: 50, komut: "node /k/proje/node_modules/playwright/cli.js", cwd: "/k/proje" },
    { pid: 60, pgid: 60, komut: "node /k/proje-0040/node_modules/vite/bin/vite.js", cwd: null },
  ];
  const { engeller, bilgiler, bilinmeyenler } = surecleriSiniflandir(surecler, kopyalar, ayar, new Set([10]), new Set([50]));
  assert.deepEqual(bilgiler.map((s) => s.pid), [10]);
  assert.deepEqual(engeller.map((s) => [s.pid, s.tur]), [[20, "tarayıcı testi"], [30, "Blender"], [60, "geliştirme sunucusu"]]);
  assert.equal(engeller[0].kopya, "/k/proje-0040");
  assert.equal(engeller[2].kopya, "/k/proje-0040");
  assert.deepEqual(bilinmeyenler.map((s) => s.pid), [40]);
  const sessiz = surecleriSiniflandir(surecler, kopyalar, ayariHazirla({ bilinmeyenleriYaz: false }));
  assert.equal(sessiz.bilinmeyenler.length, 0);
});

test("yayın kilidi: yok, sürüyor, kalmış", () => {
  assert.equal(kilitDurumu(null, () => true), null);
  assert.match(kilitDurumu("pid=123 surum=abc1234 zaman=x", (p) => p === 123), /yayın sürüyor.*abc1234/);
  assert.match(kilitDurumu("pid=123 surum=abc1234", () => false), /kilidi kalmış/);
  assert.match(kilitDurumu("", () => true), /kilidi kalmış \(sürüm \?/);
});

test("karar: engel yoksa güvenli; gönderilmemiş commit, eksik uzak ve bilgi engellemez", () => {
  const temel = { kopyalar, kirliler: [], gonderilmemis: [], surecler: { engeller: [], bilgiler: [], bilinmeyenler: [] }, kilitler: [] };
  assert.equal(karar(temel).guvenli, true);
  const g = karar(
    {
      ...temel,
      gonderilmemis: [{ yol: "/k/proje", dal: "main", sayi: 2 }],
      uzakYok: ["/k/proje"],
      surecler: { engeller: [], bilgiler: [{ pid: 1, tur: "vite", kopya: "/k" }], bilinmeyenler: [{ pid: 2, komut: "python3 x", kopya: "/k" }] },
    },
    "yedek",
  );
  assert.equal(g.guvenli, true);
  assert.equal(g.uyari.length, 2);
  assert.match(g.uyari[0], /git push yedek main/);
  assert.equal(g.bilgi.length, 2);
  const k = karar({ ...temel, kirliler: [{ yol: "/k/proje-0040", sayi: 3 }], kilitler: [{ yol: "/k/proje", ileti: "yayın sürüyor" }] });
  assert.equal(k.guvenli, false);
  assert.equal(k.engel.length, 2);
  assert.deepEqual(Object.keys(k.kopyalar[0]), ["yol", "dal", "commit"]);
});

test("karar: aynı kopyadaki aynı türden süreçler tek satır", () => {
  const e = [1, 2, 3].map((pid) => ({ pid, tur: "vite", kopya: "/k" })).concat({ pid: 9, tur: "Blender", kopya: "/u" });
  const k = karar({ kopyalar, kirliler: [], gonderilmemis: [], surecler: { engeller: e, bilgiler: [] }, kilitler: [] });
  assert.deepEqual(k.engel, ["vite çalışıyor (/k): PID 1, 2, 3; durdur", "Blender çalışıyor (/u): PID 9; durdur"]);
});

test("mola bitti: kaydedilen commit, dal ve kopya karşılaştırması", () => {
  const kayitli = kopyalar.map(({ yol, dal, commit }) => ({ yol, dal, commit }));
  assert.deepEqual(molaFarki(kayitli, kayitli), []);
  const simdiki = kayitli
    .map((k, i) => (i === 0 ? { ...k, commit: "eeeeeee" } : k))
    .slice(0, 2)
    .concat({ yol: "/yeni", dal: "x", commit: "f" });
  const farklar = molaFarki(kayitli, simdiki);
  assert.equal(farklar.length, 3);
  assert.match(farklar[0], /aaaaaaa kaydedilmişti, şimdi eeeeeee/);
  assert.match(farklar[1], /kopya artık yok/);
  assert.match(farklar[2], /molada yeni kopya/);
  assert.match(molaFarki([{ yol: "/a", dal: "x", commit: "1" }], [{ yol: "/a", dal: "y", commit: "1" }])[0], /dal x kaydedilmişti, şimdi y/);
});

// ---- uçtan uca: gerçek git deposu / EN: end to end: a real git repository ----

function git(cwd, ...arg) {
  return execFileSync("git", ["-c", "user.name=deneme", "-c", "user.email=deneme@example.com", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...arg], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function mola(kok, ...arg) {
  const r = spawnSync(process.execPath, [MOLA, ...arg, "--kok", kok], { encoding: "utf8" });
  return { kod: r.status, cikti: r.stdout + r.stderr };
}

test("uçtan uca: temiz, kirli, kilit, mola bitti, molada commit", (t) => {
  const kok = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vekilekip-mola-")));
  t.after(() => fs.rmSync(kok, { recursive: true, force: true }));
  const depo = path.join(kok, "proje");
  fs.mkdirSync(depo);
  git(depo, "init", "-q", "-b", "main");
  // Süreç kalıbı yok: makinede çalışan başka işler testi etkilemesin. yerel/ git dışında.
  // EN: No process patterns, so other work running on the machine does not affect the test. yerel/ is outside git.
  fs.writeFileSync(path.join(depo, ".vekilekip.json"), JSON.stringify({ surecler: [], bilinmeyenleriYaz: false }));
  fs.writeFileSync(path.join(depo, ".gitignore"), "yerel/\n");
  fs.writeFileSync(path.join(depo, "a.txt"), "1\n");
  git(depo, "add", ".");
  git(depo, "commit", "-q", "-m", "ilk");
  const kopya = path.join(kok, "proje-is");
  git(depo, "worktree", "add", "-q", "-b", "is/deneme", kopya);

  let r = mola(depo);
  assert.equal(r.kod, 0, r.cikti);
  assert.match(r.cikti, /Güvende: 2 kopya/);
  assert.match(r.cikti, /UYARI .*"origin" adlı uzak depo yok/);
  const kayit = JSON.parse(fs.readFileSync(path.join(depo, "yerel/mola.json"), "utf8"));
  assert.equal(kayit.durum, "molada");
  assert.equal(kayit.kopyalar.length, 2);

  // Rafta iş varsa "bitti" bunu uyarı olarak yazar. / EN: "bitti" prints stashed work as a warning.
  // Kılavuzdaki "kanca geçirmiyorsa" yolu: izlenmeyen dosya dahil stash ve yama.
  // EN: The "hook will not pass" path from the guide: stash including untracked files, plus a patch.
  fs.writeFileSync(path.join(kopya, "raf.txt"), "rafta\n");
  git(kopya, "stash", "push", "-q", "-u", "-m", "yarım: deneme");
  const yama = execFileSync("git", ["stash", "show", "-p", "--include-untracked", "stash@{0}"], { cwd: kopya, encoding: "utf8" });
  assert.match(yama, /raf\.txt/);
  assert.match(yama, /\+rafta/);
  r = mola(depo);
  assert.equal(r.kod, 0, r.cikti);
  assert.match(r.cikti, /UYARI  stash@\{0\} \(is\/deneme\): bekleyen yarım iş/);
  r = mola(kopya, "bitti");
  assert.equal(r.kod, 0, r.cikti);
  assert.match(r.cikti, /UYARI  stash@\{0\} \(is\/deneme\): bekleyen yarım iş/);
  git(kopya, "stash", "drop", "-q");
  assert.equal(JSON.parse(fs.readFileSync(path.join(depo, "yerel/mola.json"), "utf8")).durum, "çalışıyor");

  fs.writeFileSync(path.join(kopya, "b.txt"), "yarım\n");
  r = mola(depo, "mola");
  assert.equal(r.kod, 1, r.cikti);
  assert.match(r.cikti, /proje-is: commit edilmemiş değişiklik \(1 dosya\)/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(depo, "yerel/mola.json"), "utf8")).durum, "mola-bekliyor");

  git(kopya, "add", ".");
  git(kopya, "commit", "-q", "-m", "yarım: deneme");
  fs.mkdirSync(path.join(depo, "yerel"), { recursive: true });
  fs.writeFileSync(path.join(depo, "yerel/yayin.kilit"), "pid=999999 surum=abc1234\n");
  r = mola(depo);
  assert.equal(r.kod, 1, r.cikti);
  assert.match(r.cikti, /yayın kilidi kalmış \(sürüm abc1234/);
  fs.rmSync(path.join(depo, "yerel/yayin.kilit"));

  r = mola(depo);
  assert.equal(r.kod, 0, r.cikti);
  fs.writeFileSync(path.join(kopya, "c.txt"), "molada\n");
  git(kopya, "add", ".");
  git(kopya, "commit", "-q", "-m", "molada iş");
  r = mola(depo, "mola", "bitti");
  assert.equal(r.kod, 1, r.cikti);
  assert.match(r.cikti, /kaydedilmişti, şimdi/);

  r = mola(depo, "bitti");
  assert.equal(r.kod, 1, r.cikti);
  assert.match(r.cikti, /kayıtlı bir mola yok/);
});

test("uçtan uca: git dışı klasör ve bozuk ayar çıkış 2", (t) => {
  const kok = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vekilekip-mola-")));
  t.after(() => fs.rmSync(kok, { recursive: true, force: true }));
  assert.equal(mola(kok).kod, 2);
  git(kok, "init", "-q");
  fs.writeFileSync(path.join(kok, ".vekilekip.json"), "{bozuk");
  const r = mola(kok);
  assert.equal(r.kod, 2);
  assert.match(r.cikti, /ayar okunamadı/);
});

test("devir notu: taze, bayat, hiç commit edilmemiş, kullanılmıyor", () => {
  const ayar = { dosya: "docs/DURUM.md", dakika: 30, engel: false };
  const simdi = 1_000_000;
  assert.equal(devirNotuDurumu(simdi - 10 * 60, simdi, ayar), null);
  assert.match(devirNotuDurumu(simdi - 45 * 60, simdi, ayar).ileti, /45 dakika önce/);
  assert.match(devirNotuDurumu(simdi - 5 * 3600, simdi, ayar).ileti, /5 saat önce/);
  assert.match(devirNotuDurumu(null, simdi, ayar, true).ileti, /hiç commit edilmemiş/);
  assert.equal(devirNotuDurumu(null, simdi, ayar, false), null);
  assert.equal(devirNotuDurumu(simdi - 45 * 60, simdi, { ...ayar, engel: true }).engel, true);
});

test("karar: devir notu uyarı ya da engel; raf uyarı", () => {
  const taban = { kopyalar: [], kirliler: [], gonderilmemis: [], surecler: { engeller: [], bilgiler: [], bilinmeyenler: [] }, kilitler: [] };
  const u = karar({ ...taban, devirNotu: { ileti: "not bayat", engel: false }, raflar: rafCoz("stash@{0}: WIP on main: abc1234 konu\nstash@{1}: On is/0040-ornek: yarım: tür hatası var\n") });
  assert.equal(u.guvenli, true);
  assert.equal(u.uyari.length, 3);
  assert.match(u.uyari[1], /^stash@\{1\} \(is\/0040-ornek\): bekleyen yarım iş/);
  assert.match(u.uyari[2], /^stash@\{0\} \(main\): rafta iş/);
  const e = karar({ ...taban, devirNotu: { ileti: "not bayat", engel: true } });
  assert.equal(e.guvenli, false);
  assert.deepEqual(e.engel, ["not bayat"]);
});

test("ayar: devirNotu ve canli doğrulanır", () => {
  const a = ayariHazirla({ canli: { yetki: "vekil" }, devirNotu: { engel: true } });
  assert.equal(a.canli.yetki, "vekil");
  assert.equal(a.canli.dal, "main");
  assert.equal(a.devirNotu.engel, true);
  assert.equal(a.devirNotu.dakika, 30);
  assert.equal(ayariHazirla({}).canli.yetki, "sahip");
  assert.throws(() => ayariHazirla({ canli: { yetki: "herkes" } }));
  assert.throws(() => ayariHazirla({ canli: { onay: "../disari.json" } }));
  assert.throws(() => ayariHazirla({ devirNotu: { dakika: 0 } }));
});

test("Windows süreç listesi ayrıştırılır; komut satırındaki ters eğik çizgili yol kopyaya sayılır", () => {
  const json = JSON.stringify([
    { ProcessId: 10, ParentProcessId: 1, CommandLine: "node C:\\k\\proje\\node_modules\\vite\\bin\\vite.js" },
    { ProcessId: 11, ParentProcessId: 1, CommandLine: null },
  ]);
  const s = windowsSurecleriAyristir(json);
  assert.equal(s.length, 1);
  assert.equal(s[0].pid, 10);
  assert.deepEqual(windowsSurecleriAyristir("bozuk"), []);
  assert.equal(windowsSurecleriAyristir(JSON.stringify({ ProcessId: 5, ParentProcessId: 1, CommandLine: "x" })).length, 1);
  const sonuc = surecleriSiniflandir(s, [{ yol: "C:/k/proje", dal: "main" }], ayariHazirla({}));
  assert.equal(sonuc.engeller.length, 1);
  assert.equal(sonuc.engeller[0].tur, "geliştirme sunucusu");
});
