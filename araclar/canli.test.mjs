// TR: Canlıya çıkış kapısının testleri. Koşu: node --test araclar/canli.test.mjs
// EN: Tests of the production deploy gate. Run: node --test araclar/canli.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { argumanlariCoz, onayDurumu } from "./canli.mjs";

const CANLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "canli.mjs");
const C1 = "a".repeat(40);
const C2 = "b".repeat(40);
const SIMDI = Date.parse("2026-01-10T12:00:00Z");

test("onay: yok, başka commit, eski, geçerli", () => {
  assert.equal(onayDurumu(null, C1, SIMDI, 24).gecerli, false);
  assert.match(onayDurumu({ commit: C2, zaman: "2026-01-10T11:00:00Z" }, C1, SIMDI, 24).neden, /başka bir commit/);
  assert.match(onayDurumu({ commit: C1, zaman: "2026-01-08T11:00:00Z" }, C1, SIMDI, 24).neden, /saatten eski/);
  assert.equal(onayDurumu({ commit: C1, zaman: "2026-01-10T11:00:00Z" }, C1, SIMDI, 24).gecerli, true);
  assert.equal(onayDurumu({ commit: C1, zaman: "bozuk" }, C1, SIMDI, 24).gecerli, false);
  assert.equal(onayDurumu({ commit: C1, zaman: "2026-01-11T11:00:00Z" }, C1, SIMDI, 24).gecerli, false); // gelecekten onay
});

test("argümanlar", () => {
  assert.deepEqual(argumanlariCoz(["denetle", "abc1234"]), { komut: "denetle", commit: "abc1234", kok: null, ayar: null });
  assert.equal(argumanlariCoz(["durum", "--kok", "/x"]).kok, "/x");
  assert.throws(() => argumanlariCoz([]));
  assert.throws(() => argumanlariCoz(["sil"]));
  assert.throws(() => argumanlariCoz(["kullan", "fazla"]));
});

function depoKur(ayar) {
  const kok = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vekilekip-canli-")));
  const g = (...a) => execFileSync("git", a, { cwd: kok, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  g("init", "-q", "-b", "main");
  g("config", "user.email", "test@example.com");
  g("config", "user.name", "Test");
  fs.writeFileSync(path.join(kok, ".gitignore"), "yerel/\n");
  if (ayar) fs.writeFileSync(path.join(kok, ".vekilekip.json"), JSON.stringify(ayar));
  g("add", "-A");
  g("commit", "-q", "-m", "ilk");
  return { kok, commit: g("rev-parse", "HEAD").trim() };
}
const kos = (kok, ...arg) => spawnSync(process.execPath, [CANLI, ...arg, "--kok", kok], { encoding: "utf8" });

test("uçtan uca: sahip yetkisinde onaysız çıkılmaz, onayla çıkılır, tüketilince yine çıkılmaz", () => {
  const { kok, commit } = depoKur(null); // varsayılan: sahip / EN: default: owner
  try {
    assert.equal(kos(kok, "denetle").status, 1);
    // oturum gibi (etkileşimsiz) onay verilemez / EN: a non-interactive caller, such as a session, cannot approve
    const o = kos(kok, "onayla");
    assert.equal(o.status, 1);
    assert.match(o.stderr, /etkileşimli/);
    assert.equal(fs.existsSync(path.join(kok, "yerel/canli-onay.json")), false);
    // proje sahibinin verdiği onay / EN: approval given by the owner
    fs.mkdirSync(path.join(kok, "yerel"), { recursive: true });
    fs.writeFileSync(path.join(kok, "yerel/canli-onay.json"), JSON.stringify({ commit, zaman: new Date().toISOString() }));
    assert.equal(kos(kok, "denetle").status, 0);
    // yeni commit gelince eski onay geçmez / EN: a new commit invalidates the old approval
    fs.writeFileSync(path.join(kok, "x.txt"), "x");
    execFileSync("git", ["add", "-A"], { cwd: kok });
    execFileSync("git", ["commit", "-q", "-m", "ikinci"], { cwd: kok });
    const d = kos(kok, "denetle");
    assert.equal(d.status, 1);
    assert.match(d.stdout, /başka bir commit/);
    assert.equal(kos(kok, "kullan").status, 0);
    assert.equal(fs.existsSync(path.join(kok, "yerel/canli-onay.json")), false);
  } finally {
    fs.rmSync(kok, { recursive: true, force: true });
  }
});

test("uçtan uca: vekil yetkisinde onay aranmaz; bozuk ayar çıkış 2", () => {
  const { kok } = depoKur({ canli: { yetki: "vekil" } });
  try {
    const d = kos(kok, "denetle");
    assert.equal(d.status, 0);
    assert.match(d.stdout, /vekil/);
    fs.writeFileSync(path.join(kok, ".vekilekip.json"), JSON.stringify({ canli: { yetki: "herkes" } }));
    assert.equal(kos(kok, "denetle").status, 2);
  } finally {
    fs.rmSync(kok, { recursive: true, force: true });
  }
});
