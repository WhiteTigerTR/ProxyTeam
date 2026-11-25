#!/usr/bin/env node
/* global process, console */
// VekilEkip mola denetimi. Bağımlılık yok; Node 18 ve üstü yeter.
//
// Bu komut hiçbir süreci öldürmez. Oturumlar kendi işini durdurur; komut yalnız denetler ve durumu bir JSON
// dosyasına yazar.
//
//   node araclar/mola.mjs [mola]     Durmak güvenli mi? Güvenliyse kayıt "molada" olur, çıkış 0.
//                                    Değilse neyin durması gerektiğini satır satır yazar, çıkış 1.
//   node araclar/mola.mjs bitti      Kayıt "çalışıyor" olur. Kopyalar molaya girerken kaydedilen commit'te mi,
//                                    bakar. Fark varsa yazar, çıkış 1.
//
// Seçenekler: --kok <yol> (denetlenecek depo; varsayılan bulunulan klasörün deposu),
//             --ayar <yol> (ayar dosyası; varsayılan ana kopyadaki .vekilekip.json).
// Çıkış kodları: 0 güvenli, 1 güvenli değil, 2 kullanım ya da ayar hatası.
//
// Denetlenenler:
//   - her çalışma kopyası (git worktree list) temiz mi; dalı ve commit'i,
//   - uzak depoya gönderilmemiş commit (uyarı; yerel commit kayıp değildir, mola engellenmez),
//   - ayarda tanımlı süreçler çalışıyor mu (engel),
//   - kopyaların içinde çalışan ama tanınmayan süreçler (bilgi),
//   - yayın kilidi var mı (engel: yayın yarıda kesilmez),
//   - devir notu (varsayılan docs/DURUM.md) yakın zamanda commit edildi mi (uyarı; ayarla engel yapılabilir),
//   - rafa kaldırılmış iş (git stash) var mı (uyarı: mola onu görmez).
//
// Platform: macOS ve Linux'ta denendi. Windows'ta süreç denetimi PowerShell ile yapılır (çalışma klasörü
// okunamaz; süreç, komut satırında kopyanın yolu geçiyorsa o kopyaya sayılır). Windows yolu DENENMEDİ; WSL önerilir.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const AYAR_DOSYASI = ".vekilekip.json";

export const VARSAYILAN_AYAR = Object.freeze({
  uzak: "origin",
  kayit: "yerel/mola.json",
  kilit: "yerel/yayin.kilit",
  bilgiKapilari: [],
  surecler: [
    { ad: "tarayıcı testi", kalip: "playwright|cypress|chrome-headless-shell", kapsam: "kopya" },
    { ad: "test izleyici", kalip: "(^|[\\s/])(vitest|jest)(\\s|$|\\.)", kapsam: "kopya" },
    { ad: "geliştirme sunucusu", kalip: "(^|[\\s/])(vite|webpack-dev-server|nodemon)(\\s|$|/|\\.)|next dev|tsx watch", kapsam: "kopya" },
    { ad: "Blender", kalip: "Blender\\.app|(^|/)blender(\\s|$)", kapsam: "her-yer" },
  ],
  yoksay: [
    "(^|/)claude(\\s|$)",
    "@anthropic-ai/claude-code",
    "^-?(ba|z|fi)?sh(\\s|$)",
    "(^|/)(ba|z|fi)?sh(\\s|$)",
    "(^|/)git(\\s|$)",
    "mola\\.mjs",
    "(^|/)(login|tmux|screen|caffeinate|less|man|vim?|nvim|nano)(\\s|$)",
  ],
  bilinmeyenleriYaz: true,
  // Devir notu: bu dosya son "dakika" içinde commit edilmediyse uyarı (engel: true ise mola engellenir).
  devirNotu: { dosya: "docs/DURUM.md", dakika: 30, engel: false },
  // Canlıya çıkış yetkisi (araclar/canli.mjs okur): "sahip" = proje sahibinin onayı gerekir, "vekil" = vekil karar verir.
  // mesajlaOnay: true ise proje sahibi bir oturuma "canlı onay <commit>" yazarak da onay verebilir (kanca-onay.mjs kuruluysa).
  canli: { yetki: "sahip", onay: "yerel/canli-onay.json", gecerlilikSaat: 24, dal: "main", mesajlaOnay: false },
});

const AYAR_ANAHTARLARI = new Set([...Object.keys(VARSAYILAN_AYAR), "_aciklama"]);

/**
 * Ayar dosyasının içeriğini varsayılanla birleştirir ve kalıpları derler.
 * Verilen alan varsayılanın yerine geçer (listeler birleşmez). Hata varsa fırlatır.
 */
export function ayariHazirla(ham = {}) {
  if (ham === null || typeof ham !== "object" || Array.isArray(ham)) throw new Error("ayar bir JSON nesnesi olmalı");
  const bilinmeyen = Object.keys(ham).filter((a) => !AYAR_ANAHTARLARI.has(a));
  if (bilinmeyen.length) throw new Error(`bilinmeyen ayar: ${bilinmeyen.join(", ")}`);
  const a = { ...VARSAYILAN_AYAR, ...ham };
  if (typeof a.uzak !== "string" || !a.uzak) throw new Error("uzak: dolu bir metin olmalı");
  for (const alan of ["kayit", "kilit"]) {
    if (typeof a[alan] !== "string" || !a[alan] || path.isAbsolute(a[alan]) || a[alan].split(/[\\/]/).includes("..")) {
      throw new Error(`${alan}: depo içinde göreli bir yol olmalı`);
    }
  }
  if (!Array.isArray(a.bilgiKapilari) || !a.bilgiKapilari.every((k) => Number.isInteger(k) && k > 0 && k < 65536)) {
    throw new Error("bilgiKapilari: kapı numaraları listesi olmalı");
  }
  if (!Array.isArray(a.surecler)) throw new Error("surecler: liste olmalı");
  const surecler = a.surecler.map((s, i) => {
    if (!s || typeof s.ad !== "string" || typeof s.kalip !== "string") throw new Error(`surecler[${i}]: ad ve kalip gerekli`);
    const kapsam = s.kapsam ?? "kopya";
    if (kapsam !== "kopya" && kapsam !== "her-yer") throw new Error(`surecler[${i}].kapsam: "kopya" ya da "her-yer"`);
    return { ad: s.ad, kalip: derle(s.kalip, `surecler[${i}].kalip`), kapsam };
  });
  if (!Array.isArray(a.yoksay)) throw new Error("yoksay: liste olmalı");
  const yoksay = a.yoksay.map((k, i) => derle(k, `yoksay[${i}]`));
  const goreli = (y) => typeof y === "string" && y && !path.isAbsolute(y) && !y.split(/[\\/]/).includes("..");
  const dn = { ...VARSAYILAN_AYAR.devirNotu, ...(a.devirNotu ?? {}) };
  if (!goreli(dn.dosya) || !(Number(dn.dakika) > 0)) throw new Error("devirNotu: dosya depo içinde göreli yol, dakika pozitif sayı olmalı");
  const cn = { ...VARSAYILAN_AYAR.canli, ...(a.canli ?? {}) };
  if (cn.yetki !== "sahip" && cn.yetki !== "vekil") throw new Error('canli.yetki: "sahip" ya da "vekil"');
  if (!goreli(cn.onay) || !(Number(cn.gecerlilikSaat) > 0) || typeof cn.dal !== "string" || !cn.dal) {
    throw new Error("canli: onay depo içinde göreli yol, gecerlilikSaat pozitif sayı, dal dolu metin olmalı");
  }
  return {
    uzak: a.uzak, kayit: a.kayit, kilit: a.kilit, bilgiKapilari: a.bilgiKapilari, surecler, yoksay,
    bilinmeyenleriYaz: a.bilinmeyenleriYaz !== false,
    devirNotu: { dosya: dn.dosya, dakika: Number(dn.dakika), engel: dn.engel === true },
    canli: { yetki: cn.yetki, onay: cn.onay, gecerlilikSaat: Number(cn.gecerlilikSaat), dal: cn.dal, mesajlaOnay: cn.mesajlaOnay === true },
  };
}

function derle(kalip, yer) {
  try {
    return new RegExp(kalip);
  } catch (e) {
    throw new Error(`${yer}: geçersiz düzenli ifade (${e.message})`);
  }
}

/** Komut satırı argümanlarını çözer. */
export function argumanlariCoz(argv) {
  const secenek = { komut: "mola", kok: null, ayar: null };
  const kalan = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--kok" || a === "--ayar") {
      const deger = argv[++i];
      if (!deger) throw new Error(`${a} bir yol ister`);
      secenek[a.slice(2)] = deger;
    } else if (a === "-h" || a === "--yardim") secenek.komut = "yardim";
    else if (a.startsWith("-")) throw new Error(`bilinmeyen seçenek: ${a}`);
    else kalan.push(a);
  }
  if (secenek.komut === "yardim") return secenek;
  if (kalan[0] === "mola") kalan.shift();
  if (kalan.length === 0) secenek.komut = "mola";
  else if (kalan.length === 1 && kalan[0] === "bitti") secenek.komut = "bitti";
  else throw new Error(`bilinmeyen komut: ${kalan.join(" ")}`);
  return secenek;
}

/** `git worktree list --porcelain` çıktısını kopyalara ayırır. */
export function kopyalariAyristir(metin) {
  const kopyalar = [];
  for (const blok of metin.split(/\n\s*\n/)) {
    const k = {};
    for (const satir of blok.split("\n")) {
      const [anahtar, ...kalan] = satir.split(" ");
      const deger = kalan.join(" ");
      if (anahtar === "worktree") k.yol = deger;
      else if (anahtar === "HEAD") k.commit = deger;
      else if (anahtar === "branch") k.dal = deger.replace(/^refs\/heads\//, "");
      else if (anahtar === "detached") k.dal = null;
      else if (anahtar === "bare") k.ciplak = true;
      else if (anahtar === "prunable") k.kayip = true;
    }
    if (k.yol) kopyalar.push({ dal: null, kayip: false, ...k });
  }
  return kopyalar;
}

/** Bir yolun hangi kopyanın içinde olduğunu verir (en uzun eşleşme; ad öneki karışmaz). */
export function kopyasi(yol, kopyalar) {
  if (!yol) return null;
  let bulunan = null;
  for (const k of kopyalar) {
    if ((yol === k.yol || yol.startsWith(k.yol + "/")) && (!bulunan || k.yol.length > bulunan.yol.length)) bulunan = k;
  }
  return bulunan;
}

/** Komut satırından sürecin tanımını bulur: { ad, kapsam }, yoksayılacaksa "yoksay", tanınmıyorsa null. */
export function surecTanimi(komut, ayar) {
  if (ayar.yoksay.some((k) => k.test(komut))) return "yoksay";
  return ayar.surecler.find((s) => s.kalip.test(komut)) ?? null;
}

/**
 * Süreçleri sınıflandırır.
 * surecler: [{ pid, pgid, komut, cwd }]; bilgiGruplari: bilgi kapılarını dinleyen süreçlerin grup kimlikleri;
 * haric: denetimin kendisi ve ataları.
 * "her-yer" kapsamlı süreç hangi klasörde olursa olsun engeldir; öbürleri yalnız bir kopyanın içindeyse sayılır.
 * Kopyanın içinde çalışan, tanınmayan süreç bilgi olarak yazılır.
 */
export function surecleriSiniflandir(surecler, kopyalar, ayar, bilgiGruplari = new Set(), haric = new Set()) {
  const engeller = [];
  const bilgiler = [];
  const bilinmeyenler = [];
  for (const s of surecler) {
    if (haric.has(s.pid)) continue;
    const duzKomut = s.komut.replace(/\\/g, "/"); // Windows yolları da "/" kalıplarıyla eşleşsin
    const tanim = surecTanimi(duzKomut, ayar);
    if (tanim === "yoksay") continue;
    const k = kopyasi(s.cwd, kopyalar) ?? kopyalar.find((x) => duzKomut.includes(x.yol + "/")) ?? null;
    if (!tanim) {
      if (k && ayar.bilinmeyenleriYaz) bilinmeyenler.push({ pid: s.pid, komut: kisalt(s.komut), kopya: k.yol });
      continue;
    }
    if (!k && tanim.kapsam !== "her-yer") continue;
    const kayit = { pid: s.pid, tur: tanim.ad, kopya: k?.yol ?? s.cwd ?? "?" };
    if (bilgiGruplari.has(s.pgid) && tanim.kapsam !== "her-yer") bilgiler.push(kayit);
    else engeller.push(kayit);
  }
  return { engeller, bilgiler, bilinmeyenler };
}

function kisalt(metin, en = 80) {
  return metin.length > en ? metin.slice(0, en - 1) + "…" : metin;
}

/**
 * Yayın kilidini değerlendirir. icerik: kilit dosyasının metni ya da null; yasiyor(pid) → boolean.
 * Kilit biçimi: "pid=<sayı> surum=<metin> ..." (yayın betiği yazar, bitince siler).
 */
export function kilitDurumu(icerik, yasiyor) {
  if (icerik == null) return null;
  const pid = Number(/pid=(\d+)/.exec(icerik)?.[1]);
  const surum = /surum=(\S+)/.exec(icerik)?.[1] ?? "?";
  if (pid && yasiyor(pid)) return `yayın sürüyor (sürüm ${surum}, PID ${pid}): yarıda kesilmez, bitmesini bekle`;
  return `yayın kilidi kalmış (sürüm ${surum}, süreç yok): yayın yarıda kalmış olabilir; ortamı denetle, sonra kilidi sil`;
}

/** Süreçleri tür ve kopyaya göre toplar: "vite çalışıyor (kopya)" → [pid, ...]. */
export function grupla(surecler) {
  const gruplar = new Map();
  for (const s of surecler) {
    const anahtar = `${s.tur} çalışıyor (${s.kopya})`;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), s.pid]);
  }
  return gruplar;
}

/** Bütün bulgulardan kararı çıkarır. */
export function karar({ kopyalar, kirliler, gonderilmemis, uzakYok = [], surecler, kilitler, devirNotu = null, raf = 0 }, uzak = "origin") {
  const engel = [];
  const uyari = [];
  const bilgi = [];
  for (const k of kirliler) engel.push(`${k.yol}: commit edilmemiş değişiklik (${k.sayi} dosya); "yarım" diye commit et`);
  for (const [anahtar, pidler] of grupla(surecler.engeller)) engel.push(`${anahtar}: PID ${pidler.join(", ")}; durdur`);
  for (const k of kilitler) engel.push(`${k.yol}: ${k.ileti}`);
  if (devirNotu) (devirNotu.engel ? engel : uyari).push(devirNotu.ileti);
  if (raf > 0) uyari.push(`rafta (git stash) ${raf} kayıt var; mola bunları görmez. Kalıcı olsun istiyorsan "yarım" diye commit et`);
  for (const g of gonderilmemis) uyari.push(`${g.yol}: ${uzak} deposuna gönderilmemiş ${g.sayi} commit (git push ${uzak} ${g.dal ?? "<dal>"})`);
  for (const y of uzakYok) uyari.push(`${y}: "${uzak}" adlı uzak depo yok ya da hiç alınmamış; gönderim denetlenemedi`);
  for (const [anahtar, pidler] of grupla(surecler.bilgiler)) bilgi.push(`${anahtar}: PID ${pidler.join(", ")}; bilgi kapısını dinliyor, durmayı engellemez`);
  for (const b of surecler.bilinmeyenler ?? []) bilgi.push(`tanınmayan süreç (${b.kopya}): PID ${b.pid} ${b.komut}`);
  return { guvenli: engel.length === 0, engel, uyari, bilgi, kopyalar: kopyalar.map(({ yol, dal, commit }) => ({ yol, dal, commit })) };
}

/**
 * Devir notunun tazeliğini değerlendirir. sonCommitSn: dosyanın son commit zamanı (saniye) ya da null;
 * dosyaVar: dosya diskte var mı. Sorun yoksa null, varsa { ileti, engel } döner.
 */
export function devirNotuDurumu(sonCommitSn, simdiSn, ayar, dosyaVar = true) {
  if (!dosyaVar && sonCommitSn == null) return null; // projede devir notu dosyası kullanılmıyor
  if (sonCommitSn == null) return { ileti: `${ayar.dosya}: hiç commit edilmemiş; devir notunu yazıp commit et`, engel: ayar.engel };
  const dakika = Math.floor((simdiSn - sonCommitSn) / 60);
  if (dakika <= ayar.dakika) return null;
  const sure = dakika >= 120 ? `${Math.floor(dakika / 60)} saat` : `${dakika} dakika`;
  return { ileti: `${ayar.dosya}: son commit ${sure} önce; devir notunu güncelleyip commit et`, engel: ayar.engel };
}

/** PowerShell'in JSON süreç listesini ayrıştırır (Windows). */
export function windowsSurecleriAyristir(metin) {
  let veri;
  try {
    veri = JSON.parse(metin);
  } catch {
    return [];
  }
  return (Array.isArray(veri) ? veri : [veri])
    .filter((x) => x && Number.isInteger(x.ProcessId) && typeof x.CommandLine === "string" && x.CommandLine)
    .map((x) => ({ pid: x.ProcessId, ppid: x.ParentProcessId ?? 0, pgid: x.ProcessId, komut: x.CommandLine, cwd: null }));
}

/** Molaya girerken kaydedilen kopyalarla şimdikileri karşılaştırır. */
export function molaFarki(kayitli, simdiki) {
  const farklar = [];
  for (const k of kayitli) {
    const s = simdiki.find((x) => x.yol === k.yol);
    if (!s) farklar.push(`${k.yol}: kopya artık yok`);
    else if (s.commit !== k.commit) farklar.push(`${k.yol}: ${k.commit.slice(0, 7)} kaydedilmişti, şimdi ${s.commit.slice(0, 7)}`);
    else if (s.dal !== k.dal) farklar.push(`${k.yol}: dal ${k.dal ?? "(ayrık)"} kaydedilmişti, şimdi ${s.dal ?? "(ayrık)"}`);
  }
  for (const s of simdiki) if (!kayitli.some((k) => k.yol === s.yol)) farklar.push(`${s.yol}: molada yeni kopya`);
  return farklar;
}

// ---- dış dünya ----

function cikti(komut, arg, secenek = {}) {
  try {
    return execFileSync(komut, arg, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024, ...secenek });
  } catch (e) {
    return e.stdout ?? "";
  }
}

function yasiyor(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

function windowsSurecleri() {
  return windowsSurecleriAyristir(
    cikti("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress"]),
  );
}

function surecleriOku() {
  if (process.platform === "win32") return windowsSurecleri();
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const surecler = [];
  for (const satir of cikti("ps", ["-axo", "pid=,pgid=,uid=,command="]).split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(satir);
    if (!m) continue;
    if (uid !== null && Number(m[3]) !== uid) continue; // yalnız kendi süreçlerimiz
    surecler.push({ pid: Number(m[1]), pgid: Number(m[2]), komut: m[4], cwd: null });
  }
  if (!surecler.length) return surecler;
  if (fs.existsSync("/proc/self/cwd")) {
    for (const s of surecler) {
      try {
        s.cwd = fs.readlinkSync(`/proc/${s.pid}/cwd`);
      } catch {
        /* erişilemedi */
      }
    }
    return surecler;
  }
  // macOS ve öbürleri: çalışma klasörleri tek lsof çağrısıyla.
  const cwd = new Map();
  let pid = 0;
  for (const satir of cikti("lsof", ["-a", "-d", "cwd", "-Fpn", "-p", surecler.map((s) => s.pid).join(",")]).split("\n")) {
    if (satir.startsWith("p")) pid = Number(satir.slice(1));
    else if (satir.startsWith("n")) cwd.set(pid, satir.slice(1));
  }
  for (const s of surecler) s.cwd = cwd.get(s.pid) ?? null;
  return surecler;
}

function bilgiGruplariniOku(surecler, kapilar) {
  const gruplar = new Set();
  if (process.platform === "win32") return gruplar; // Windows'ta kapı dinleyicisi denetlenmez
  for (const kapi of kapilar) {
    for (const p of cikti("lsof", ["-nP", `-iTCP:${kapi}`, "-sTCP:LISTEN", "-t"]).split("\n").filter(Boolean)) {
      const s = surecler.find((x) => x.pid === Number(p));
      if (s) gruplar.add(s.pgid);
    }
  }
  return gruplar;
}

/** Denetimin kendisi, ataları ve aynı süreç grubundakiler (ör. aynı boru hattındaki `head`). */
function haricSurecler() {
  const ebeveyn = new Map();
  const grup = new Map();
  if (process.platform === "win32") {
    for (const s of windowsSurecleri()) ebeveyn.set(s.pid, s.ppid);
    const haric = new Set();
    for (let p = process.pid; p > 0 && !haric.has(p); p = ebeveyn.get(p) ?? 0) haric.add(p);
    return haric;
  }
  for (const satir of cikti("ps", ["-axo", "pid=,ppid=,pgid="]).split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)/.exec(satir);
    if (m) {
      ebeveyn.set(Number(m[1]), Number(m[2]));
      grup.set(Number(m[1]), Number(m[3]));
    }
  }
  const haric = new Set();
  for (let p = process.pid; p > 1 && !haric.has(p); p = ebeveyn.get(p) ?? 0) haric.add(p);
  const kendiGrubu = grup.get(process.pid);
  if (kendiGrubu) for (const [pid, g] of grup) if (g === kendiGrubu) haric.add(pid);
  return haric;
}

function gercekYol(yol) {
  try {
    return fs.realpathSync(yol);
  } catch {
    return yol;
  }
}

function topla(kok, ayar) {
  const kopyalar = kopyalariAyristir(cikti("git", ["worktree", "list", "--porcelain"], { cwd: kok }))
    .filter((k) => !k.kayip && !k.ciplak && fs.existsSync(k.yol))
    .map((k) => ({ ...k, yol: gercekYol(k.yol) }));
  const kirliler = [];
  const gonderilmemis = [];
  const uzakYok = [];
  const kilitler = [];
  const gorulenKilitler = new Set(); // yerel/ başka kopyaya bağ olabilir; aynı kilit bir kez yazılır
  const uzakVar = cikti("git", ["for-each-ref", "--count=1", `refs/remotes/${ayar.uzak}/`], { cwd: kok }).trim() !== "";
  if (!uzakVar && kopyalar.length) uzakYok.push(kopyalar[0].yol);
  for (const k of kopyalar) {
    const degisen = cikti("git", ["status", "--porcelain"], { cwd: k.yol }).split("\n").filter(Boolean).length;
    if (degisen) kirliler.push({ yol: k.yol, sayi: degisen });
    if (uzakVar) {
      const sayi = Number(cikti("git", ["rev-list", "--count", "HEAD", "--not", `--remotes=${ayar.uzak}`], { cwd: k.yol }).trim() || 0);
      if (sayi) gonderilmemis.push({ yol: k.yol, dal: k.dal, sayi });
    }
    const kilitYolu = path.join(k.yol, ayar.kilit);
    if (!fs.existsSync(kilitYolu)) continue;
    const gercek = gercekYol(kilitYolu);
    if (gorulenKilitler.has(gercek)) continue;
    gorulenKilitler.add(gercek);
    const ileti = kilitDurumu(fs.readFileSync(kilitYolu, "utf8"), yasiyor);
    if (ileti) kilitler.push({ yol: k.yol, ileti });
  }
  const surecler = surecleriOku();
  const siniflanan = surecleriSiniflandir(surecler, kopyalar, ayar, bilgiGruplariniOku(surecler, ayar.bilgiKapilari), haricSurecler());
  // Devir notu: bütün dallarda dosyaya dokunan son commit.
  const sonNot = Number(cikti("git", ["log", "-1", "--all", "--format=%ct", "--", ayar.devirNotu.dosya], { cwd: kok }).trim()) || null;
  const anaYol = kopyalar[0]?.yol ?? kok;
  const devirNotu = devirNotuDurumu(sonNot, Math.floor(Date.now() / 1000), ayar.devirNotu, fs.existsSync(path.join(anaYol, ayar.devirNotu.dosya)));
  const raf = cikti("git", ["stash", "list"], { cwd: kok }).split("\n").filter(Boolean).length;
  return { kopyalar, kirliler, gonderilmemis, uzakYok, surecler: siniflanan, kilitler, devirNotu, raf };
}

function yaz(yol, veri) {
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(yol, JSON.stringify(veri, null, 2) + "\n");
}

const YARDIM = `Kullanım: node mola.mjs [mola|bitti] [--kok <yol>] [--ayar <yol>]
  mola    durmak güvenli mi? (çıkış 0 güvenli, 1 değil)
  bitti   moladan dön; kopyalar kaydedilen commit'te mi?
Ayar: ana kopyadaki ${AYAR_DOSYASI} (yoksa varsayılanlar).`;

function ana() {
  let secenek;
  try {
    secenek = argumanlariCoz(process.argv.slice(2));
  } catch (e) {
    console.error(`Hata: ${e.message}\n${YARDIM}`);
    process.exit(2);
  }
  if (secenek.komut === "yardim") {
    console.log(YARDIM);
    return;
  }
  const baslangic = path.resolve(secenek.kok ?? process.cwd());
  const kok = cikti("git", ["rev-parse", "--show-toplevel"], { cwd: baslangic }).trim();
  if (!kok) {
    console.error(`Hata: ${baslangic} bir git deposu değil.`);
    process.exit(2);
  }
  // Kayıt ve ayar ana kopyada durur (worktree listesinin ilki), komut hangi kopyadan çalışırsa çalışsın.
  const anaKopya = kopyalariAyristir(cikti("git", ["worktree", "list", "--porcelain"], { cwd: kok }))[0]?.yol ?? kok;
  const ayarYolu = secenek.ayar ? path.resolve(secenek.ayar) : path.join(anaKopya, AYAR_DOSYASI);
  let ayar;
  const notlar = [];
  try {
    if (fs.existsSync(ayarYolu)) ayar = ayariHazirla(JSON.parse(fs.readFileSync(ayarYolu, "utf8")));
    else {
      if (secenek.ayar) throw new Error(`ayar dosyası yok: ${ayarYolu}`);
      ayar = ayariHazirla({});
      notlar.push(`ayar dosyası yok (${AYAR_DOSYASI}); varsayılanlar kullanıldı`);
    }
  } catch (e) {
    console.error(`Hata: ayar okunamadı: ${e.message}`);
    process.exit(2);
  }
  const kayitYolu = path.join(anaKopya, ayar.kayit);
  const bulgular = topla(kok, ayar);
  const zaman = new Date().toISOString();
  for (const n of notlar) console.log("BİLGİ  " + n);

  if (secenek.komut === "bitti") {
    let onceki = null;
    try {
      onceki = JSON.parse(fs.readFileSync(kayitYolu, "utf8"));
    } catch {
      /* kayıt yok */
    }
    const farklar =
      onceki?.durum === "molada" && Array.isArray(onceki.kopyalar)
        ? molaFarki(onceki.kopyalar, bulgular.kopyalar)
        : [`kayıtlı bir mola yok (${ayar.kayit}); önce "mola" güvenli dönmeliydi`];
    yaz(kayitYolu, { durum: "çalışıyor", zaman, molaBaslangici: onceki?.durum === "molada" ? onceki.zaman : null, kopyalar: bulgular.kopyalar.map(({ yol, dal, commit }) => ({ yol, dal, commit })), farklar });
    if (farklar.length) {
      console.log("Mola bitti, ama kopyalar molaya girerken kaydedilen yerde değil:");
      for (const f of farklar) console.log("  - " + f);
      process.exit(1);
    }
    console.log(`Mola bitti: ${bulgular.kopyalar.length} kopya kaydedilen commit'te. Devir notundan devam.`);
    return;
  }

  const k = karar(bulgular, ayar.uzak);
  for (const b of k.bilgi) console.log("BİLGİ  " + b);
  for (const u of k.uyari) console.log("UYARI  " + u);
  if (!k.guvenli) {
    yaz(kayitYolu, { durum: "mola-bekliyor", zaman, engel: k.engel, uyari: k.uyari, bilgi: k.bilgi, kopyalar: k.kopyalar });
    console.log("Mola için durması gerekenler:");
    for (const e of k.engel) console.log("  - " + e);
    process.exit(1);
  }
  yaz(kayitYolu, { durum: "molada", zaman, uyari: k.uyari, bilgi: k.bilgi, kopyalar: k.kopyalar });
  console.log(`Güvende: ${k.kopyalar.length} kopya temiz, çalışan iş yok. Kayıt: ${ayar.kayit}`);
  for (const x of k.kopyalar) console.log(`  ${x.dal ?? "(ayrık)"} ${x.commit.slice(0, 7)}  ${x.yol}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) ana();
