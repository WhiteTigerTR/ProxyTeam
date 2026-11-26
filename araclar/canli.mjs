#!/usr/bin/env node
/* global process, console */
// TR: VekilEkip canlıya çıkış kapısı. Bağımlılık yok; Node 18 ve üstü yeter.
//
// Canlıya kimin çıkabileceği proje başına ayarlanır (.vekilekip.json → canli.yetki):
//   "sahip"  Proje sahibi o commit'i onaylamadan canlıya çıkılmaz (varsayılan).
//   "vekil"  Vekil karar verir; onay dosyası aranmaz. Karar "vekil kararı" olarak kayda yazılır.
//
//   node araclar/canli.mjs durum             Yetki kimde, geçerli onay var mı?
//   node araclar/canli.mjs onayla [commit]   YALNIZ PROJE SAHİBİ, kendi terminalinde. Canlı dalının ucunu (ya da verilen
//                                            commit'i) onaylar. Etkileşimli terminal ister ve kısa kimliği yazdırır.
//   node araclar/canli.mjs denetle [commit]  Yayın betiği canlıya yükseltmeden hemen önce çağırır.
//                                            Çıkış 0: çıkılabilir. Çıkış 1: çıkılamaz (neden yazılır).
//   node araclar/canli.mjs kullan            Yayın bitince onayı tüketir (aynı onay ikinci yayında geçmez).
//
// Seçenekler: --kok <yol>, --ayar <yol> (mola.mjs ile aynı). Çıkış kodları: 0 olur, 1 olmaz, 2 kullanım ya da ayar hatası.
//
// Sınır: Bu bir kapıdır, kasa değildir. "onayla" etkileşimli terminal ister; oturumların araç çağrıları etkileşimli
// değildir, bu yüzden bir oturum onayı kendi veremez. Onay dosyasına elle yazmayı ve "onayla" çağrısını ayrıca
// rol kancası (sablonlar/ornekler/kanca-rol.mjs) durdurur. İkisi birlikte kullanılmalıdır.
//
// EN: VekilEkip (ProxyTeam) production deploy gate. No dependencies; Node 18 or later is enough.
//
// Who may deploy to production is set per project (.vekilekip.json → canli.yetki):
//   "sahip"  (owner) Nothing goes to production until the owner has approved that exact commit (default).
//   "vekil"  (proxy) The proxy decides; no approval file is needed. The decision is logged as a "proxy decision".
//
//   node araclar/canli.mjs durum             Who holds the authority, is there a valid approval?
//   node araclar/canli.mjs onayla [commit]   OWNER ONLY, in their own terminal. Approves the tip of the production branch
//                                            (or the given commit). Needs an interactive terminal and makes you type the short id.
//   node araclar/canli.mjs denetle [commit]  Called by the deploy script right before promoting to production.
//                                            Exit 0: may deploy. Exit 1: may not (the reason is printed).
//   node araclar/canli.mjs kullan            Consumes the approval once the deploy is done, so it cannot be reused for a second deploy.
//
// Options: --kok <path>, --ayar <path> (same as mola.mjs). Exit codes: 0 yes, 1 no, 2 usage or config error.
//
// Limit: this is a gate, not a safe. "onayla" needs an interactive terminal; the tool calls of sessions are not
// interactive, so a session cannot give the approval itself. Writing the approval file by hand and calling "onayla"
// are stopped separately by the role hook (sablonlar/ornekler/kanca-rol.mjs). The two should be used together.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { AYAR_DOSYASI, ayariHazirla, kopyalariAyristir } from "./mola.mjs";

/**
 * Onayın verilen commit için geçerli olup olmadığını söyler.
 * onay: { commit, zaman } ya da null. Döner: { gecerli, neden }.
 *
 * EN: Tells whether the approval is valid for the given commit.
 * onay: { commit, zaman } or null. Returns: { gecerli, neden } (valid, reason).
 */
export function onayDurumu(onay, commit, simdiMs, gecerlilikSaat) {
  if (!onay || typeof onay.commit !== "string" || typeof onay.zaman !== "string") return { gecerli: false, neden: "onay yok" };
  if (onay.commit !== commit) return { gecerli: false, neden: `onay başka bir commit için (${onay.commit.slice(0, 7)}), yayımlanacak ${commit.slice(0, 7)}` };
  const yas = (simdiMs - Date.parse(onay.zaman)) / 3600000;
  if (!(yas >= 0)) return { gecerli: false, neden: "onayın zamanı okunamadı" };
  if (yas > gecerlilikSaat) return { gecerli: false, neden: `onay ${Math.floor(yas)} saat önce verilmiş; ${gecerlilikSaat} saatten eski onay geçmez` };
  return { gecerli: true, neden: `onay geçerli (${onay.commit.slice(0, 7)}, ${onay.zaman})` };
}

/** Komut satırını çözer. / EN: Parses the command line. */
export function argumanlariCoz(argv) {
  const s = { komut: null, commit: null, kok: null, ayar: null };
  const kalan = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--kok" || a === "--ayar") {
      const d = argv[++i];
      if (!d) throw new Error(`${a} bir yol ister`);
      s[a.slice(2)] = d;
    } else if (a.startsWith("-")) throw new Error(`bilinmeyen seçenek: ${a}`);
    else kalan.push(a);
  }
  if (!["durum", "onayla", "denetle", "kullan"].includes(kalan[0])) throw new Error("komut: durum | onayla | denetle | kullan");
  s.komut = kalan[0];
  if (kalan.length > 2 || (kalan.length === 2 && !["onayla", "denetle"].includes(s.komut))) throw new Error("fazla argüman");
  s.commit = kalan[1] ?? null;
  return s;
}

function git(kok, ...arg) {
  try {
    return execFileSync("git", arg, { cwd: kok, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function sor(soru) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((coz) => rl.question(soru, (y) => (rl.close(), coz(y.trim()))));
}

async function ana() {
  let s;
  try {
    s = argumanlariCoz(process.argv.slice(2));
  } catch (e) {
    console.error(`Hata: ${e.message}`);
    process.exit(2);
  }
  const kok = git(path.resolve(s.kok ?? process.cwd()), "rev-parse", "--show-toplevel");
  if (!kok) {
    console.error("Hata: burası bir git deposu değil.");
    process.exit(2);
  }
  const anaKopya = kopyalariAyristir(git(kok, "worktree", "list", "--porcelain"))[0]?.yol ?? kok;
  const ayarYolu = s.ayar ? path.resolve(s.ayar) : path.join(anaKopya, AYAR_DOSYASI);
  let ayar;
  try {
    ayar = ayariHazirla(fs.existsSync(ayarYolu) ? JSON.parse(fs.readFileSync(ayarYolu, "utf8")) : {}).canli;
  } catch (e) {
    console.error(`Hata: ayar okunamadı: ${e.message}`);
    process.exit(2);
  }
  const onayYolu = path.join(anaKopya, ayar.onay);
  const commit = git(kok, "rev-parse", "--verify", `${s.commit ?? ayar.dal}^{commit}`);
  if (!commit && s.komut !== "kullan") {
    console.error(`Hata: commit bulunamadı: ${s.commit ?? ayar.dal}`);
    process.exit(2);
  }
  let onay = null;
  try {
    onay = JSON.parse(fs.readFileSync(onayYolu, "utf8"));
  } catch {
    /* onay yok / EN: no approval */
  }
  const durum = onayDurumu(onay, commit, Date.now(), ayar.gecerlilikSaat);

  if (s.komut === "durum") {
    console.log(`Canlı yetkisi: ${ayar.yetki === "sahip" ? "proje sahibi" : "vekil"} · dal ${ayar.dal} · ${commit.slice(0, 7)}`);
    if (ayar.yetki === "sahip") {
      console.log(`Onay: ${durum.neden}`);
      console.log(`Mesajla onay: ${ayar.mesajlaOnay ? "açık (onay kancası kuruluysa)" : "kapalı"}`);
    }
    return;
  }
  if (s.komut === "denetle") {
    if (ayar.yetki === "vekil") {
      console.log(`Çıkılabilir: bu projede canlı yetkisi vekilde (${commit.slice(0, 7)}). Kararı "vekil kararı" olarak kayda yazın.`);
      return;
    }
    if (durum.gecerli) {
      console.log(`Çıkılabilir: ${durum.neden}`);
      return;
    }
    console.log(`Canlıya çıkılamaz: ${durum.neden}.`);
    console.log(`Proje sahibi kendi terminalinde çalıştırmalı: node araclar/canli.mjs onayla ${commit.slice(0, 7)}`);
    process.exit(1);
  }
  if (s.komut === "kullan") {
    if (fs.existsSync(onayYolu)) fs.rmSync(onayYolu);
    console.log("Onay tüketildi.");
    return;
  }
  // onayla / EN: approve
  if (ayar.yetki === "vekil") {
    console.log("Bu projede canlı yetkisi vekilde; onay gerekmez. Değiştirmek için .vekilekip.json → canli.yetki.");
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("Onay yalnız etkileşimli bir terminalde, proje sahibince verilir. Bir oturum onay veremez.");
    process.exit(1);
  }
  const kisa = commit.slice(0, 7);
  console.log(`Canlıya çıkacak commit: ${kisa}  ${git(kok, "log", "-1", "--format=%s", commit)}`);
  const yanit = await sor(`Onaylamak için kısa kimliği yazın (${kisa}): `);
  if (yanit !== kisa) {
    console.log("Onay verilmedi.");
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(onayYolu), { recursive: true });
  fs.writeFileSync(onayYolu, JSON.stringify({ commit, zaman: new Date().toISOString() }, null, 2) + "\n");
  console.log(`Onaylandı: ${kisa}. ${ayar.gecerlilikSaat} saat geçerli. Yayın bitince "kullan" komutu onayı siler; yeni yayın yeni onay ister.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) await ana();
