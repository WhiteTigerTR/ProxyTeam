#!/usr/bin/env node
/* global process */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
// TR: ÖRNEK: Claude Code PreToolUse kancası. Sır dosyalarının içeriğini gösterecek araç çağrılarını durdurur.
// Kit bunu KURMAZ. Kullanmak isterseniz okuyun, kendi sır yollarınıza göre düzenleyin, sonra
// kanca-ayari.json içindeki örneğe göre .claude/settings.json dosyanıza ekleyin.
//
// Nasıl çalışır: Claude Code her araç çağrısından önce kancaya JSON verir (stdin): { tool_name, tool_input, ... }.
// Kanca 0 ile çıkarsa çağrı sürer; 2 ile çıkarsa çağrı durur ve stderr metni Claude'a iletilir.
//
// Sınır: Bu bir emniyet kemeridir, kilit değildir. Sırrı kod içinden okuyan bir betik ya da dolaylı bir komut
// bu kalıplara takılmaz. Asıl önlem sırların depo dışında, yalnız araçların okuduğu yerde durmasıdır.
//
// EN: EXAMPLE: a Claude Code PreToolUse hook. It blocks tool calls that would reveal the contents of secret files.
// The kit does NOT install it. If you want to use it, read it, adjust it to your own secret paths, then add it
// to your .claude/settings.json following the example in kanca-ayari.json.
//
// How it works: before every tool call, Claude Code passes JSON to the hook (stdin): { tool_name, tool_input, ... }.
// If the hook exits 0 the call goes ahead; if it exits 2 the call is blocked and the stderr text is passed to Claude.
//
// Limit: this is a seat belt, not a lock. A script that reads the secret from code, or an indirect command, will
// not match these patterns. The real safeguard is keeping secrets outside the repository, where only the tools read them.

// Sır sayılan yollar (düzenleyin). / EN: Paths treated as secrets (edit these).
const SIR_KALIPLARI = [
  /(^|[\s/'"])\.env(\.[\w-]+)?($|[\s'"])/,
  /\.(pem|key|p12|pfx)($|[\s'"])/,
  /(^|[\s/'"])id_(rsa|ed25519|ecdsa)($|[\s'"])/,
  /(^|[\s/'"])(sirlar|secrets)\//,
  /anahtar(i|lar)?($|[\s'".])/,
];
// İçerik gösteren komutlar. Yoklama (wc -c, test -s, ls) serbesttir.
// EN: Commands that reveal content. Probing (wc -c, test -s, ls) is allowed.
// İçeriği ekrana ya da başka bir yere taşıyabilen komutlar. "source" ve "." listede yok: sırrı ortam değişkenine
// almanın (aracın okumasının) doğru yolu odur. Betik dilleri yalnız satır içi kodla çağrıldığında sayılır.
// EN: Commands that can move the contents to the screen or elsewhere. "source" and "." are not listed: that is the
// right way to load a secret into the environment (so the tool reads it). Script languages count only when
// called with inline code.
const GOSTEREN =
  /(^|[\s;|&(])((cat|head|tail|less|more|grep|rg|awk|sed|strings|xxd|od|hexdump|bat|nl|base64|cp|scp|curl|cut|jq|diff|sort|uniq|tr|paste|tee|printenv)\s|(python3?|node|ruby|perl)\s+(-c|-e|-p|--eval|--print)\b)/;

function oku() {
  return new Promise((coz) => {
    let veri = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (p) => (veri += p));
    process.stdin.on("end", () => coz(veri));
  });
}

// Sır içermeyen örnek dosyalar (.env.example gibi) serbesttir.
// EN: Example files with no secrets in them (such as .env.example) are allowed.
const ORNEK_DOSYA = /\.env\.(example|sample|template|ornek)\b/g;

export function sirMi(metin) {
  if (typeof metin !== "string") return false;
  const ayiklanmis = metin.replace(ORNEK_DOSYA, "");
  return SIR_KALIPLARI.some((k) => k.test(ayiklanmis));
}

export function denetle(girdi) {
  const ad = girdi.tool_name;
  const g = girdi.tool_input ?? {};
  if (ad === "Read" && sirMi(g.file_path)) return "Sır dosyası okunmaz. Yalnız `wc -c` ya da `test -s` ile yoklayın.";
  if ((ad === "Grep" || ad === "Glob") && (sirMi(g.path) || sirMi(g.glob))) return "Sır dosyası içinde arama yapılmaz.";
  if (ad === "Bash" && typeof g.command === "string" && GOSTEREN.test(g.command) && sirMi(g.command)) {
    return "Bu komut bir sır dosyasının içeriğini gösterebilir. Yalnız `wc -c` ya da `test -s` ile yoklayın; sırrı araç okusun.";
  }
  return null;
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
  const neden = denetle(girdi);
  if (neden) {
    process.stderr.write(neden + "\n");
    process.exit(2);
  }
  process.exit(0);
}
