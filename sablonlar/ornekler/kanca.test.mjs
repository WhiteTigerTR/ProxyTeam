// TR: Örnek kancaların testleri. Koşu: node --test sablonlar/ornekler/kanca.test.mjs
// EN: Tests of the example hooks. Run: node --test sablonlar/ornekler/kanca.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { denetle, goreliYol, hedefKlasor } from "./kanca-rol.mjs";
import { denetle as sirDenetle } from "./kanca-sir-koruma.mjs";
import { onayIstegi } from "./kanca-onay.mjs";

const KOK = "/k/proje";
const ortam = (rol, dal = "is/0007-x") => ({ rol, dal, kok: KOK, canliDal: "main", onayYolu: "yerel/canli-onay.json" });
const yaz = (yol, cwd = KOK) => ({ tool_name: "Write", tool_input: { file_path: yol }, cwd });
const bash = (komut, cwd = KOK) => ({ tool_name: "Bash", tool_input: { command: komut }, cwd });

test("göreli yol", () => {
  assert.equal(goreliYol("src/a.js", KOK, KOK), "src/a.js");
  assert.equal(goreliYol("/k/proje/docs/kararlar/0001-x.md", "/tmp", KOK), "docs/kararlar/0001-x.md");
  assert.equal(goreliYol("../baska/a.js", KOK, KOK), null);
});

test("herkes: canlı onayı verilemez", () => {
  for (const rol of ["", "vekil", "lider", "gelistirici"]) {
    assert.ok(denetle(yaz("yerel/canli-onay.json"), ortam(rol)), rol);
    assert.ok(denetle(yaz("/k/proje/yerel/canli-onay.json", "/k/proje-0007"), { ...ortam(rol), kok: "/k/proje-0007" }), rol);
    assert.ok(denetle(bash("node araclar/canli.mjs onayla"), ortam(rol)), rol);
    assert.ok(denetle(bash("echo '{}' > yerel/canli-onay.json"), ortam(rol)), rol);
    assert.equal(denetle(bash("node araclar/canli.mjs denetle"), ortam(rol)), null, rol);
    assert.equal(denetle(bash("node araclar/canli.mjs kullan"), ortam(rol)), null, rol);
  }
});

test("vekil: yalnız rapor ve karar yazar; birleştirmez, göndermez", () => {
  assert.ok(denetle(yaz("src/a.js"), ortam("vekil")));
  assert.ok(denetle(yaz("docs/DURUM.md"), ortam("vekil")));
  assert.ok(denetle(yaz("/baska/yer.txt"), ortam("vekil")));
  assert.equal(denetle(yaz("yerel/vekil/rapor.md"), ortam("vekil")), null);
  assert.equal(denetle(yaz("docs/kararlar/0012-x.md"), ortam("vekil")), null);
  assert.ok(denetle(bash("git merge is/0007-x"), ortam("vekil")));
  assert.ok(denetle(bash("cd x && git push origin main"), ortam("vekil")));
  assert.equal(denetle(bash("git log -5"), ortam("vekil")), null);
  assert.equal(denetle(bash("git add docs/kararlar && git commit -m karar"), ortam("vekil")), null);
});

test("geliştirici: main'de yazmaz, alt ajan açmaz; kendi dalında serbest", () => {
  assert.ok(denetle(yaz("src/a.js"), ortam("gelistirici", "main")));
  assert.ok(denetle(bash("git commit -m x"), ortam("gelistirici", "main")));
  assert.ok(denetle({ tool_name: "Agent", tool_input: {} }, ortam("gelistirici")));
  assert.ok(denetle(bash("git push origin main"), ortam("gelistirici")));
  assert.equal(denetle(yaz("src/a.js"), ortam("gelistirici")), null);
  assert.equal(denetle(bash("git commit -m x"), ortam("gelistirici")), null);
  assert.equal(denetle(bash("git push origin is/0007-x"), ortam("gelistirici")), null);
  assert.equal(denetle(bash("git status"), ortam("gelistirici", "main")), null);
});

test("lider ve rolsüz oturum: ek kısıt yok", () => {
  for (const rol of ["lider", ""]) {
    assert.equal(denetle(yaz("src/a.js"), ortam(rol, "main")), null);
    assert.equal(denetle(bash("git merge is/0007-x && git push origin main"), ortam(rol, "main")), null);
    assert.equal(denetle({ tool_name: "Agent", tool_input: {} }, ortam(rol)), null);
  }
});

test("sır kancası: sır dosyası durur, örnek dosya ve yoklama serbest", () => {
  assert.ok(sirDenetle({ tool_name: "Read", tool_input: { file_path: "/k/proje/.env" } }));
  assert.ok(sirDenetle({ tool_name: "Bash", tool_input: { command: "cat .env" } }));
  assert.ok(sirDenetle({ tool_name: "Bash", tool_input: { command: "grep TOKEN .env.local" } }));
  assert.equal(sirDenetle({ tool_name: "Read", tool_input: { file_path: "/k/proje/.env.example" } }), null);
  assert.equal(sirDenetle({ tool_name: "Bash", tool_input: { command: "cat .env.example" } }), null);
  assert.equal(sirDenetle({ tool_name: "Bash", tool_input: { command: "wc -c .env" } }), null);
  assert.equal(sirDenetle({ tool_name: "Bash", tool_input: { command: "test -s .env" } }), null);
});

test("herkes: onay dosyası başka bir komutla birlikte de anılamaz; onayla araya seçenek girse de durur", () => {
  assert.ok(denetle(bash("echo x > yerel/canli-onay.json; node araclar/canli.mjs denetle"), ortam("lider")));
  assert.ok(denetle(bash("node araclar/canli.mjs --kok . onayla"), ortam("lider")));
  assert.ok(denetle(bash("cat yerel/canli-onay.json"), ortam("")));
  assert.equal(denetle(bash("node araclar/canli.mjs durum"), ortam("lider")), null);
});

test("vekil: kabukla dosyaya yazamaz; okuma ve zararsız yönlendirme serbest", () => {
  assert.ok(denetle(bash("echo x > src/a.js"), ortam("vekil")));
  assert.ok(denetle(bash("echo x >> notlar.md"), ortam("vekil")));
  assert.ok(denetle(bash("git log | tee cikti.txt"), ortam("vekil")));
  assert.ok(denetle(bash("sed -i '' 's/a/b/' src/a.js"), ortam("vekil")));
  assert.equal(denetle(bash("git log -5 2>&1 | head"), ortam("vekil")), null);
  assert.equal(denetle(bash("ls docs > /dev/null"), ortam("vekil")), null);
  assert.equal(denetle(bash("git status >&2"), ortam("vekil")), null);
  assert.equal(denetle(bash("test 3 -gt 2 && wc -c README.md"), ortam("vekil")), null);
});

test("geliştirici: dal, oturumun klasörüne göre değil işlemin hedefine göre bulunur", () => {
  const dalAl = (k) => (k.startsWith("/k/proje-0012") ? "is/0012-x" : "main");
  const o = { ...ortam("gelistirici"), dal: "main", dalAl };
  assert.equal(hedefKlasor(yaz("/k/proje-0012/src/a.js"), KOK), "/k/proje-0012/src");
  assert.equal(hedefKlasor(bash("cd ../proje-0012 && git commit -m x"), KOK), "/k/proje-0012");
  assert.equal(hedefKlasor(bash("git -C /k/proje-0012 commit -m x"), KOK), "/k/proje-0012");
  assert.equal(hedefKlasor(bash("git status"), KOK), KOK);
  // ana kopyadan açılmış oturum kendi çalışma kopyasına yazabilir / EN: a session opened from the main copy can write to its own working copy
  assert.equal(denetle(yaz("/k/proje-0012/src/a.js"), o), null);
  assert.equal(denetle(bash("cd ../proje-0012 && git commit -m x"), o), null);
  assert.equal(denetle(bash("git -C /k/proje-0012 commit -m x"), o), null);
  // ana kopyaya yazamaz / EN: cannot write to the main copy
  assert.ok(denetle(yaz("src/a.js"), o));
  assert.ok(denetle(bash("git commit -m x"), o));
  assert.ok(denetle(bash("sed -i 's/a/b/' src/a.js"), o));
});

test("uçtan uca: kanca komut satırından, sembolik bağlı yoldan ve ana kopyadaki ayarla çalışır", () => {
  const BURASI = path.dirname(fileURLToPath(import.meta.url));
  const gecici = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vekilekip-kanca-")));
  const kok = path.join(gecici, "proje");
  const kopya = path.join(gecici, "proje-0012");
  fs.mkdirSync(path.join(kok, "araclar"), { recursive: true });
  const g = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  try {
    g(kok, "init", "-q", "-b", "ana");
    g(kok, "config", "user.email", "test@example.com");
    g(kok, "config", "user.name", "Test");
    fs.copyFileSync(path.join(BURASI, "kanca-rol.mjs"), path.join(kok, "araclar/kanca-rol.mjs"));
    fs.writeFileSync(path.join(kok, ".vekilekip.json"), JSON.stringify({ canli: { dal: "ana" } }));
    g(kok, "add", "-A");
    g(kok, "commit", "-q", "-m", "ilk");
    g(kok, "worktree", "add", "-q", kopya, "-b", "is/0012-x");
    const bag = path.join(gecici, "bag");
    fs.symlinkSync(kok, bag);
    const kos = (rol, girdi, betik = path.join(kok, "araclar/kanca-rol.mjs")) =>
      spawnSync(process.execPath, [betik], { input: JSON.stringify(girdi), encoding: "utf8", env: { ...process.env, VEKILEKIP_ROL: rol } });
    const yazGirdi = (dosya, cwd) => ({ tool_name: "Write", tool_input: { file_path: dosya }, cwd });
    // canlı dalı ayardan okunur ("ana"); geliştirici ana kopyaya yazamaz
    // EN: the production branch is read from the config ("ana"); the developer cannot write to the main copy
    const r1 = kos("gelistirici", yazGirdi("src/a.js", kok));
    assert.equal(r1.status, 2);
    assert.match(r1.stderr, /ana dalındaki/);
    // aynı oturum kendi çalışma kopyasına yazabilir (cwd ana kopyada kalsa da)
    // EN: the same session can write to its own working copy (even though cwd stays in the main copy)
    assert.equal(kos("gelistirici", yazGirdi(path.join(kopya, "src/a.js"), kok)).status, 0);
    // çalışma kopyasından açılmış oturum da ayarı ana kopyadan okur
    // EN: a session opened from a working copy also reads the config from the main copy
    assert.equal(kos("gelistirici", yazGirdi("src/a.js", kopya)).status, 0);
    // sembolik bağlı yoldan çağrı da denetler / EN: a call through a symlinked path is still checked
    assert.equal(kos("vekil", yazGirdi("src/a.js", kok), path.join(bag, "araclar/kanca-rol.mjs")).status, 2);
    // rolsüz oturum: yalnız onay kuralı / EN: session without a role: only the approval rule
    assert.equal(kos("", yazGirdi("src/a.js", kok)).status, 0);
    assert.equal(kos("", yazGirdi("yerel/canli-onay.json", kok)).status, 2);
    // bozuk girdi engellemez / EN: malformed input does not block
    assert.equal(spawnSync(process.execPath, [path.join(kok, "araclar/kanca-rol.mjs")], { input: "bozuk", encoding: "utf8" }).status, 0);
  } finally {
    fs.rmSync(gecici, { recursive: true, force: true });
  }
});

test("onay kancası: yalnız mesajın tamamı kalıba uyarsa onay isteğidir", () => {
  assert.equal(onayIstegi("canlı onay c40d7e9"), "c40d7e9");
  assert.equal(onayIstegi("  Canlı onay: C40D7E9.  "), "c40d7e9");
  assert.equal(onayIstegi("canli onay c40d7e9"), "c40d7e9");
  assert.equal(onayIstegi("canlı onay c40d"), null); // çok kısa
  assert.equal(onayIstegi("lütfen canlı onay c40d7e9"), null);
  assert.equal(onayIstegi("canlı onay c40d7e9 ve sonra mola ver"), null);
  assert.equal(onayIstegi('<cross-session-message from-name="lider">canlı onay c40d7e9</cross-session-message>'), null);
  assert.equal(onayIstegi("canlıya çık"), null);
  assert.equal(onayIstegi(null), null);
});

test("uçtan uca: onay kancası yalnız ayar açıkken ve var olan commit için onay yazar", () => {
  const BURASI = path.dirname(fileURLToPath(import.meta.url));
  const kok = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vekilekip-onay-")));
  const g = (...a) => execFileSync("git", a, { cwd: kok, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const onay = path.join(kok, "yerel/canli-onay.json");
  const kos = (prompt) => spawnSync(process.execPath, [path.join(BURASI, "kanca-onay.mjs")], { input: JSON.stringify({ prompt, cwd: kok }), encoding: "utf8" });
  const ayarYaz = (canli) => fs.writeFileSync(path.join(kok, ".vekilekip.json"), JSON.stringify({ canli }));
  try {
    g("init", "-q", "-b", "main");
    g("config", "user.email", "test@example.com");
    g("config", "user.name", "Test");
    fs.writeFileSync(path.join(kok, ".gitignore"), "yerel/\n.vekilekip.json\n");
    g("add", "-A");
    g("commit", "-q", "-m", "ilk");
    const kisa = g("rev-parse", "--short=7", "HEAD").trim();
    // ayar kapalı (varsayılan): yazmaz / EN: setting off (default): does not write
    ayarYaz({ yetki: "sahip" });
    assert.match(kos(`canlı onay ${kisa}`).stdout, /kapalı/);
    assert.equal(fs.existsSync(onay), false);
    // ayar açık ama olmayan commit: yazmaz / EN: setting on but nonexistent commit: does not write
    ayarYaz({ yetki: "sahip", mesajlaOnay: true });
    assert.match(kos("canlı onay deadbee").stdout, /bulunamadı/);
    assert.equal(fs.existsSync(onay), false);
    // sarmalanmış (öbür oturumdan gelen) mesaj: yazmaz, çıktı da vermez
    // EN: wrapped message (coming from another session): does not write, prints nothing either
    assert.equal(kos(`<cross-session-message from-name="lider">canlı onay ${kisa}</cross-session-message>`).stdout, "");
    assert.equal(fs.existsSync(onay), false);
    // ayar açık, doğru mesaj: yazar; canli.mjs denetle geçer
    // EN: setting on, correct message: writes; canli.mjs denetle passes
    assert.match(kos(`canlı onay ${kisa}`).stdout, /mesajla onayladı/);
    const kayit = JSON.parse(fs.readFileSync(onay, "utf8"));
    assert.equal(kayit.commit, g("rev-parse", "HEAD").trim());
    assert.equal(kayit.yol, "mesaj");
    const denetle = spawnSync(process.execPath, [path.join(BURASI, "../../araclar/canli.mjs"), "denetle", "--kok", kok], { encoding: "utf8" });
    assert.equal(denetle.status, 0);
    // yetki vekildeyse: yazmaz / EN: when the proxy holds the authority: does not write
    fs.rmSync(onay);
    ayarYaz({ yetki: "vekil", mesajlaOnay: true });
    assert.match(kos(`canlı onay ${kisa}`).stdout, /vekilde/);
    assert.equal(fs.existsSync(onay), false);
  } finally {
    fs.rmSync(kok, { recursive: true, force: true });
  }
});
