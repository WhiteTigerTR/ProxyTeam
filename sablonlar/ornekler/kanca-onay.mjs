#!/usr/bin/env node
/* global process */
// ÖRNEK: Claude Code UserPromptSubmit kancası. Proje sahibinin bir oturuma yazdığı mesajla canlı onayı verir.
// Kit bunu KURMAZ. Telefondan (Remote Control ile) çalışırken terminale erişmeden onay verebilmek içindir.
//
// Nasıl çalışır: Claude Code, kullanıcının gönderdiği her mesajdan önce kancaya JSON verir (stdin): { prompt, cwd, ... }.
// Mesajın TAMAMI şu biçimdeyse kanca onay dosyasını yazar:
//
//   canlı onay c40d7e9
//
// Onayı model değil bu betik yazar; model onay dosyasına dokunamaz (rol kancası durdurur). Böylece proje sahibinin
// mesajı, oturumun kendi kararından ayrılır.
//
// Koşullar: .vekilekip.json içinde canli.yetki "sahip" ve canli.mesajlaOnay true olmalı. Yoksa kanca hiçbir şey yapmaz.
//
// Sınırlar:
//   - Mesajın tamamı kalıba uymalıdır; başka bir metnin içinde geçen "canlı onay ..." sayılmaz. Öbür oturumlardan
//     gelen mesajlar bir sarmalayıcı etiket içinde geldiği için kalıba uymaz.
//   - DENENMEDİ: bu kancanın Remote Control'den gelen mesajlarda çalıştığı ve öbür oturumlardan gelen mesajların
//     kancaya nasıl göründüğü canlı bir oturumda doğrulanmadı. Güvenmeden önce kendi kurulumunuzda deneyin:
//       1. Bir oturuma "canlı onay <kısa kimlik>" yazın; "node araclar/canli.mjs durum" onayı göstermeli.
//       2. Başka bir oturumdan bu oturuma aynı cümleyi mesaj olarak gönderin; onay YAZILMAMALI.
//   - Oturumu açan herkes bu cümleyi yazabilir. Makinenize ve hesabınıza başkası erişebiliyorsa kullanmayın.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Mesaj bir onay isteğiyse commit kimliğini (7-40 onaltılık hane), değilse null döner. */
export function onayIstegi(prompt) {
  if (typeof prompt !== "string") return null;
  const m = /^\s*canl[ıi] onay[:\s]+([0-9a-f]{7,40})\s*\.?\s*$/i.exec(prompt);
  return m ? m[1].toLowerCase() : null;
}

function oku() {
  return new Promise((coz) => {
    let veri = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (p) => (veri += p));
    process.stdin.on("end", () => coz(veri));
  });
}

const git = (klasor, ...arg) => {
  try {
    return execFileSync("git", arg, { cwd: klasor, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const gercek = (yol) => {
  try {
    return fs.realpathSync(yol);
  } catch {
    return yol;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(gercek(process.argv[1])).href) {
  let girdi;
  try {
    girdi = JSON.parse(await oku());
  } catch {
    process.exit(0);
  }
  const istek = onayIstegi(girdi.prompt);
  if (!istek) process.exit(0);
  const cwd = girdi.cwd ?? process.cwd();
  const anaKopya = /^worktree (.+)$/m.exec(git(cwd, "worktree", "list", "--porcelain"))?.[1] ?? git(cwd, "rev-parse", "--show-toplevel");
  if (!anaKopya) process.exit(0);
  let canli = {};
  try {
    canli = JSON.parse(fs.readFileSync(path.join(anaKopya, ".vekilekip.json"), "utf8")).canli ?? {};
  } catch {
    /* ayar yok */
  }
  // Çıktı (stdout) oturumun bağlamına eklenir; model ne olduğunu oradan öğrenir.
  if ((canli.yetki ?? "sahip") !== "sahip") {
    console.log("[canlı onayı] Bu projede canlı yetkisi vekilde; onay gerekmez, yazılmadı.");
    process.exit(0);
  }
  if (canli.mesajlaOnay !== true) {
    console.log("[canlı onayı] Mesajla onay bu projede kapalı (.vekilekip.json → canli.mesajlaOnay). Onay yazılmadı; proje sahibi terminalde 'node araclar/canli.mjs onayla' çalıştırmalı.");
    process.exit(0);
  }
  const commit = git(anaKopya, "rev-parse", "--verify", `${istek}^{commit}`);
  if (!commit) {
    console.log(`[canlı onayı] ${istek} diye bir commit bulunamadı (ya da kimlik birden çok commit'e uyuyor). Onay yazılmadı.`);
    process.exit(0);
  }
  const onayYolu = path.join(anaKopya, typeof canli.onay === "string" && canli.onay ? canli.onay : "yerel/canli-onay.json");
  fs.mkdirSync(path.dirname(onayYolu), { recursive: true });
  fs.writeFileSync(onayYolu, JSON.stringify({ commit, zaman: new Date().toISOString(), yol: "mesaj" }, null, 2) + "\n");
  console.log(`[canlı onayı] Proje sahibi ${commit.slice(0, 7)} commit'ini mesajla onayladı; onay dosyasını kanca yazdı. Doğrulamak için: node araclar/canli.mjs denetle ${commit.slice(0, 7)}`);
  process.exit(0);
}
