#!/usr/bin/env node
/* global process */
// TR: ÖRNEK: Claude Code PreToolUse kancası. Rol kurallarını metinden denetime taşır.
// Kit bunu KURMAZ. Kullanmak için: bu dosyayı projenizde araclar/ altına kopyalayın, kanca-ayari.json
// içindeki örneği .claude/settings.json dosyanıza ekleyin ve her oturumu rolüyle açın:
//
//   VEKILEKIP_ROL=vekil claude          VEKILEKIP_ROL=lider claude          VEKILEKIP_ROL=gelistirici claude
//
// Değer bu üç sözcükten biridir; kurulumda rol adlarını değiştirmiş olsanız da değişmez.
// Rol verilmemiş (ya da başka bir değer verilmiş) oturumda yalnız "herkes için" kurallar çalışır.
//
// Kurallar:
//   herkes        Canlı onayını kendisi veremez: "canli.mjs ... onayla" çağrısı, onay dosyasına araçla yazma ve
//                 onay dosyasının adını anan her kabuk komutu durur.
//   vekil         Edit/Write araçlarıyla yalnız yerel/vekil/ ve docs/kararlar/ altına yazar. Kabukta dosyaya
//                 yönlendirme (>, >>, tee, sed -i) ve birleştirme, gönderme (merge, rebase, reset, push, cherry-pick) durur.
//   gelistirici   Canlı dalındaki (.vekilekip.json → canli.dal; varsayılan main) bir çalışma kopyasında dosya değiştiremez,
//                 commit, birleştirme, gönderme yapamaz; canlı dalına gönderemez. Alt ajan açamaz.
//   lider         Ek kısıt yok.
//
// Hangi dalda olunduğu, oturumun açıldığı klasöre göre değil, işlemin hedefine göre bulunur: yazılan dosyanın klasörü,
// ya da komuttaki ilk "cd <yol>" / "git -C <yol>". Böylece ana kopyadan açılmış bir geliştirici oturumu kendi
// çalışma kopyasına yazabilir.
//
// Kanca 0 ile çıkarsa çağrı sürer; 2 ile çıkarsa durur ve stderr metni Claude'a iletilir.
// Sınır: Bu bir emniyet kemeridir, kilit değildir. Kabuk komutları kalıpla tanınır; bir betik içinden ya da dolaylı
// yoldan yapılan yazma (ör. python -c, cp, mv) takılmaz. Canlı bir oturumda uzun süre denenmedi.
//
// EN: EXAMPLE: a Claude Code PreToolUse hook. It turns the role rules from prompt text into an enforced check.
// The kit does NOT install it. To use it: copy this file into araclar/ in your project, add the example from
// kanca-ayari.json to your .claude/settings.json, and start every session with its role:
//
//   VEKILEKIP_ROL=vekil claude          VEKILEKIP_ROL=lider claude          VEKILEKIP_ROL=gelistirici claude
//
// The value is one of these three words (proxy, lead, developer); it stays the same even if you renamed the roles
// at install time. In a session with no role (or any other value) only the "everyone" rules apply.
//
// Rules:
//   everyone      Cannot approve a production deploy itself: a "canli.mjs ... onayla" call, a tool write to the
//                 approval file, and any shell command that mentions the approval file's name are blocked.
//   vekil         (proxy) With Edit/Write it can write only under yerel/vekil/ and docs/kararlar/. In the shell,
//                 redirecting to a file (>, >>, tee, sed -i) and merging or pushing (merge, rebase, reset, push,
//                 cherry-pick) are blocked.
//   gelistirici   (developer) In a working copy on the production branch (.vekilekip.json → canli.dal; default main)
//                 it cannot change files, commit, merge or push; it cannot push to the production branch. It cannot
//                 spawn subagents.
//   lider         (lead) No extra restrictions.
//
// The branch is taken from the target of the operation, not from the folder the session was opened in: the folder of
// the file being written, or the first "cd <path>" / "git -C <path>" in the command. That way a developer session
// opened from the main copy can still write to its own working copy.
//
// If the hook exits 0 the call goes ahead; if it exits 2 the call is blocked and the stderr text is passed to Claude.
// Limit: this is a seat belt, not a lock. Shell commands are recognized by pattern; a write done from inside a script
// or by an indirect route (e.g. python -c, cp, mv) is not caught. It has not yet been run for any length of time in a live session.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const YAZAN_ARACLAR = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
export const ALT_AJAN_ARACLARI = new Set(["Agent", "Task"]);
const VEKIL_YAZABILIR = ["yerel/vekil/", "docs/kararlar/"];

const git = (re) => new RegExp(`(^|[\\s;|&(])git\\s+(-C\\s+\\S+\\s+)?(${re})(\\s|$)`);
const GIT_BIRLESTIR_GONDER = git("merge|rebase|reset|push|cherry-pick");
const GIT_YAZAN = git("commit|merge|rebase|reset|push|cherry-pick|revert|am");
// Dosyaya yönlendirme: > ya da >> (2>&1, >&2 ve /dev/null hariç), tee, sed -i.
// EN: Redirect to a file: > or >> (except 2>&1, >&2 and /dev/null), tee, sed -i.
const KABUK_YAZAN = /(^|[^0-9&>])>{1,2}\s*(?!&|\/dev\/null)[^\s>&]|(^|[\s;|&(])tee\s|(^|[\s;|&(])sed\s+(-[a-zA-Z]*\s+)*-i/;

/**
 * Dosya yolunu proje köküne göre göreli, "/" ayırıcılı hale getirir; kökün dışındaysa null.
 * EN: Makes a file path relative to the project root, with "/" separators; null if it is outside the root.
 */
export function goreliYol(dosya, cwd, kok) {
  if (typeof dosya !== "string" || !dosya) return null;
  const g = path.relative(kok, path.resolve(cwd, dosya));
  if (g.startsWith("..") || path.isAbsolute(g)) return null;
  return g.split(path.sep).join("/");
}

/**
 * İşlemin hedef klasörü: yazılan dosyanın klasörü, komuttaki ilk "cd"/"git -C" yolu, yoksa cwd.
 * EN: The operation's target folder: the folder of the file being written, the first "cd"/"git -C" path in the command, otherwise cwd.
 */
export function hedefKlasor(girdi, cwd) {
  const g = girdi.tool_input ?? {};
  if (YAZAN_ARACLAR.has(girdi.tool_name)) {
    const d = g.file_path ?? g.notebook_path;
    return typeof d === "string" && d ? path.dirname(path.resolve(cwd, d)) : cwd;
  }
  if (girdi.tool_name === "Bash" && typeof g.command === "string") {
    const m = /(?:^|[\s;|&(])cd\s+("[^"]+"|'[^']+'|[^\s;|&)]+)/.exec(g.command) ?? /git\s+-C\s+("[^"]+"|'[^']+'|\S+)/.exec(g.command);
    if (m) return path.resolve(cwd, m[1].replace(/^["']|["']$/g, "").replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
  }
  return cwd;
}

/**
 * girdi: kancaya gelen JSON; ortam: { rol, kok, canliDal, onayYolu, dal, dalAl? }.
 * dalAl(klasör) verilirse dal işlemin hedef klasöründen bulunur; verilmezse ortam.dal kullanılır.
 * Engellenecekse neden metnini, değilse null döner.
 *
 * EN: girdi: the JSON passed to the hook; ortam: { rol, kok, canliDal, onayYolu, dal, dalAl? }.
 * If dalAl(folder) is given, the branch is looked up from the operation's target folder; otherwise ortam.dal is used.
 * Returns the reason text if the call should be blocked, otherwise null.
 */
export function denetle(girdi, ortam) {
  const ad = girdi.tool_name;
  const g = girdi.tool_input ?? {};
  const cwd = girdi.cwd ?? ortam.kok;
  const onay = ortam.onayYolu ?? "yerel/canli-onay.json";
  const hamDosya = YAZAN_ARACLAR.has(ad) ? (g.file_path ?? g.notebook_path) : null;
  const dosya = goreliYol(hamDosya, cwd, ortam.kok);
  const tamDosya = typeof hamDosya === "string" && hamDosya ? path.resolve(cwd, hamDosya).split(path.sep).join("/") : "";
  const komut = ad === "Bash" && typeof g.command === "string" ? g.command : "";

  // herkes: canlı onayı (onay dosyası ana kopyada durur; başka kopyadan tam yolla yazma da durur)
  // EN: everyone: production approval (the approval file lives in the main copy; a full-path write from another copy is blocked too)
  if (dosya === onay || tamDosya.endsWith("/" + onay)) return "Canlı onayını yalnız proje sahibi verir. Onay dosyasına yazılmaz.";
  if (/canli\.mjs\b[^;|&]*\bonayla\b/.test(komut)) return "Canlı onayını yalnız proje sahibi, kendi terminalinde verir.";
  if (komut.includes(path.basename(onay))) return "Onay dosyasına komutla dokunulmaz. Durumu görmek için: node araclar/canli.mjs durum";

  if (ortam.rol === "vekil") {
    if (YAZAN_ARACLAR.has(ad) && !(dosya && VEKIL_YAZABILIR.some((o) => dosya.startsWith(o)))) {
      return `Vekil kod yazmaz, dosya değiştirmez. Yalnız ${VEKIL_YAZABILIR.join(" ve ")} altına yazar. Değişikliği lidere görev olarak ilet.`;
    }
    if (KABUK_YAZAN.test(komut)) return "Vekil kabuk komutuyla dosyaya yazmaz. Kendi raporunu ve karar kaydını Write/Edit aracıyla yaz.";
    if (GIT_BIRLESTIR_GONDER.test(komut)) return "Vekil birleştirme ve gönderme yapmaz; bunlar liderin işidir.";
  }
  if (ortam.rol === "gelistirici") {
    if (ALT_AJAN_ARACLARI.has(ad)) return "Geliştirici alt ajan açmaz. İnceleme gerekiyorsa lidere sor.";
    const dal = ortam.dalAl ? ortam.dalAl(hedefKlasor(girdi, cwd)) : ortam.dal;
    if (dal === ortam.canliDal) {
      if (YAZAN_ARACLAR.has(ad)) return `Geliştirici ${ortam.canliDal} dalındaki kopyada dosya değiştirmez. Kendi dalında ve kendi çalışma kopyasında çalış (git worktree).`;
      if (GIT_YAZAN.test(komut)) return `Geliştirici ${ortam.canliDal} dalında commit, birleştirme ya da gönderme yapmaz; ${ortam.canliDal} dalına lider birleştirir.`;
      if (KABUK_YAZAN.test(komut)) return `Geliştirici ${ortam.canliDal} dalındaki kopyada kabuk komutuyla dosyaya yazmaz.`;
    }
    if (new RegExp(`git\\s+push\\s+.*\\b${ortam.canliDal}\\b`).test(komut)) return `Geliştirici ${ortam.canliDal} dalına göndermez.`;
  }
  return null;
}

function oku() {
  return new Promise((coz) => {
    let veri = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (p) => (veri += p));
    process.stdin.on("end", () => coz(veri));
  });
}

const gitCalistir = (klasor, ...arg) => {
  try {
    return execFileSync("git", arg, { cwd: klasor, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

/**
 * Var olan en yakın üst klasör (henüz oluşturulmamış bir klasöre yazılıyor olabilir).
 * EN: The nearest existing parent folder (the write may target a folder that does not exist yet).
 */
function varOlan(klasor) {
  let k = klasor;
  while (!fs.existsSync(k) && path.dirname(k) !== k) k = path.dirname(k);
  return k;
}

const gercek = (yol) => {
  try {
    return fs.realpathSync(yol);
  } catch {
    return yol;
  }
};

// Sembolik bağlı yoldan çağrılsa da çalışsın diye gerçek yol karşılaştırılır.
// EN: The real path is compared so the hook also runs when invoked through a symlink.
if (process.argv[1] && import.meta.url === pathToFileURL(gercek(process.argv[1])).href) {
  let girdi;
  try {
    girdi = JSON.parse(await oku());
  } catch {
    process.exit(0); // anlaşılmayan girdide engelleme / EN: do not block on input that cannot be parsed
  }
  const cwd = girdi.cwd ?? process.cwd();
  const kok = gitCalistir(cwd, "rev-parse", "--show-toplevel") || process.env.CLAUDE_PROJECT_DIR || cwd;
  // Ayar ana kopyada durur (worktree listesinin ilki), araçlarla aynı yerden okunur.
  // EN: The config lives in the main copy (first in the worktree list) and is read from the same place the tools use.
  const anaKopya = /^worktree (.+)$/m.exec(gitCalistir(cwd, "worktree", "list", "--porcelain"))?.[1] ?? kok;
  let canli = {};
  try {
    canli = JSON.parse(fs.readFileSync(path.join(anaKopya, ".vekilekip.json"), "utf8")).canli ?? {};
  } catch {
    /* ayar yok ya da okunamadı: varsayılanlar / EN: no config or unreadable: defaults */
  }
  const neden = denetle(girdi, {
    rol: (process.env.VEKILEKIP_ROL ?? "").toLowerCase(),
    kok,
    canliDal: typeof canli.dal === "string" && canli.dal ? canli.dal : "main",
    onayYolu: typeof canli.onay === "string" && canli.onay ? canli.onay : "yerel/canli-onay.json",
    dal: gitCalistir(cwd, "rev-parse", "--abbrev-ref", "HEAD"),
    dalAl: (klasor) => gitCalistir(varOlan(klasor), "rev-parse", "--abbrev-ref", "HEAD"),
  });
  if (neden) {
    process.stderr.write(neden + "\n");
    process.exit(2);
  }
  process.exit(0);
}
