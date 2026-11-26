#!/usr/bin/env python3
"""TR: VekilEkip ölçüm cetveli: oturum kayıtlarından ve git geçmişinden yalnız sayı çıkarır.

Kişisel veri yazmaz: mesaj metni, ad, adres ya da dosya içeriği çıktıya girmez.

Kullanım:
  python3 -I olcum.py --kod ATLAS --bas 2026-11-23T00:00:00+03:00 --depo ~/proje \\
      vekil=~/.claude-k2/projects/<proje>/<oturum>.jsonl \\
      lider=~/.claude-k2/projects/<proje>/<oturum>.jsonl \\
      gelistirici=~/.claude/projects/<proje>/<oturum>.jsonl
Aynı rol için birden çok dosya verilebilir (bağlam temizliğinden sonra yeni oturum).

--kod: projenin kod adı (ör. ATLAS, KUZEY). Çıktıda proje adı, klasör ya da dosya yolu
geçmez; yalnız kod adı. Kod adı ile gerçek proje eşleşmesini yalnız proje sahibi bilir,
bu kite ya da projeye yazılmaz. --json: birden çok projenin çıktısını birleştirmek için
tek satırlık JSON (birlestir alt komutu bunları toplar):
  python3 -I olcum.py birlestir a.json b.json

Token sayıları: her rolün oturum kaydındaki kullanım alanlarından toplanır (girdi, çıktı, önbelleğe yazma,
önbellekten okuma). Aynı yanıt kayıtta birkaç satıra bölünebildiği için yanıt kimliğine göre tekilleştirilir.
Alt ajanların kullanımı, kaydı aynı dosyada duruyorsa sayılır; ayrı dosyadaysa o dosyayı da aynı role verin.
Ücret hesaplanmaz: fiyatlar modele ve plana göre değişir; token sayısı karşılaştırma için yeterlidir.

Kalıba dayanan sayılar (kalıp kullanılmadıysa 0 çıkar, hata vermez):
  - rol: oturumlar arası mesajı gönderenin adında "vekil", "lider" ya da "gelistirici" geçmelidir; başka ad "diger" sayılır.
  - birlestirme: konusu "Birleştirme" ile başlayan commit. canli_yukseltme: konusunda "canlıya yükseltme" geçen
    ya da "Durum: canlı <kısa kimlik>" ile başlayan commit. yarim_commit: konusunda "yarım" geçen. yan_kol: "yan kol" geçen.
  - vekil_karari / lider_karari: mesajda "Vekil kararı" / "Lider kararı" geçmesi.
  - Yapıştırılan rol istemleri proje sahibinin mesajı sayılmaz; rol_istemi diye ayrı sayılır. Varsayılan kalıp,
    "Sen ... rolündesin" ya da "Sen ... oturumusun" ile başlayan mesajı tanır; farklıysa --istem '<düzenli ifade>' verin.
  - Alt ajan kayıtları (satırda isSidechain: true) verilebilir: etkinlikleri ve tokenları role eklenir; içlerindeki
    görev metni proje sahibinin mesajı sayılmaz (alt_ajan_gorevi diye ayrı sayılır).

Zaman (bölüm "zaman"): hepsi dakika, hepsi tahmin.
  - takvim: --bas ile son olay (ya da --bit) arası.
  - sahip_etkin: proje sahibinin mesajlarından; 20 dakikadan kısa aralar çalışma sayılır, tek mesaj 3 dakika.
  - rol başına etkin (rollerin bölümünde "etkin_dakika"): o rolün kayıtlarındaki mesaj ve yanıt satırlarından;
    10 dakikadan kısa aralar çalışma sayılır. Ayrıca bir araç çağrısının başından sonucuna kadar geçen süre, ne kadar
    uzun olursa olsun çalışma sayılır (uzun derleme, test, işleme); proje sahibinin yanıtını bekleyen araçlar hariç.
    uzun_arac / uzun_arac_dakika: 10 dakikadan uzun süren araç çağrılarının sayısı ve toplamı.
  - ekip_etkin: en az bir oturumun etkin olduğu süre (rollerin birleşimi; üst üste binen süre bir kez sayılır).
  - sahip_yokken_ekip: ekip etkinken proje sahibinin etkin olmadığı süre.
  - ekip_bosta_*: ekibin hiç etkin olmadığı sürenin boşluk uzunluğuna göre dağılımı: 60 dakikaya kadar,
    1-3 saat, 3 saatten uzun (uzun boşluklar çoğunlukla gece ya da beklemedir).
  Oturumun açık durması etkinlik sayılmaz; yalnız kayıtta olay olan süre sayılır.

Rapor etiketleri (isteğe bağlı, doğruluğu artırır): lider raporunun ilk sözcüğü
RAPOR, SORU, BİLGİ ya da DÜZELTME. Karar cümleleri "Vekil kararı", "Lider kararı"
ya da "Proje sahibi" kalıbıyla başlar.

EN: VekilEkip (ProxyTeam) measurement script. It derives numbers, and nothing else, from session logs and git history.

No personal data is written: message text, names, addresses and file contents never reach the output.

Usage:
  python3 -I olcum.py --kod ATLAS --bas 2026-11-23T00:00:00+03:00 --depo ~/project \\
      vekil=~/.claude-k2/projects/<project>/<session>.jsonl \\
      lider=~/.claude-k2/projects/<project>/<session>.jsonl \\
      gelistirici=~/.claude/projects/<project>/<session>.jsonl
You can pass several files for the same role (a new session after a context reset).

--kod: a code name for the project (e.g. ATLAS, KUZEY). The output never contains the project name, folder or file
paths, only the code name. Only the owner knows which code name maps to which project; the mapping is not written
to this kit or to the project. --json: print one line of JSON so the output of several projects can be combined
(the birlestir subcommand merges them):
  python3 -I olcum.py birlestir a.json b.json

Token counts: summed from the usage fields in each role's session log (input, output, cache write, cache read).
One response can be split across several log lines, so responses are deduplicated by response id. Subagent usage
is counted if it is logged in the same file; if it is in a separate file, pass that file under the same role too.
No cost is calculated: prices vary by model and plan, and token counts are enough for comparison.

Pattern-based numbers (if a pattern was never used the count is 0, not an error):
  - role: the sender name of a cross-session message must contain "vekil", "lider" or "gelistirici"; any other name counts as "diger".
  - birlestirme (merge): a commit whose subject starts with "Birleştirme". canli_yukseltme (production promotion): a
    commit whose subject contains "canlıya yükseltme" or starts with "Durum: canlı <short id>". yarim_commit
    (work-in-progress commit): subject contains "yarım". yan_kol (side branch): subject contains "yan kol".
  - vekil_karari / lider_karari: the message contains "Vekil kararı" / "Lider kararı" (proxy decision / lead decision).
  - Pasted role prompts are not counted as owner messages; they are counted separately as rol_istemi. The default
    pattern matches a message starting with "Sen ... rolündesin" or "Sen ... oturumusun"; if yours differs, pass --istem '<regex>'.
  - Subagent logs (lines with isSidechain: true) can be passed in: their activity and tokens are added to the role, and
    the task text inside them is not counted as an owner message (it is counted separately as alt_ajan_gorevi).

Time (section "zaman"): all in minutes, all estimates.
  - takvim (calendar): from --bas to the last event (or --bit).
  - sahip_etkin (owner active): from the owner's messages; gaps under 20 minutes count as work, a lone message as 3 minutes.
  - active time per role ("etkin_dakika" in each role's section): from the message and response lines in that role's
    logs; gaps under 10 minutes count as work. In addition, the time from the start of a tool call to its result
    counts as work however long it takes (long builds, tests, processing), except for tools that wait for the owner's reply.
    uzun_arac / uzun_arac_dakika: the number and total duration of tool calls longer than 10 minutes.
  - ekip_etkin (team active): time during which at least one session was active (union of the roles; overlaps count once).
  - sahip_yokken_ekip: time the team was active while the owner was not.
  - ekip_bosta_*: time when no session was active, bucketed by gap length: up to 60 minutes, 1 to 3 hours,
    over 3 hours (long gaps are mostly nights or waiting).
  A session that is merely open does not count as activity; only time with events in the log does.

Report labels (optional, they improve accuracy): the first word of a lead report is
RAPOR, SORU, BİLGİ or DÜZELTME (report, question, info, correction). Decision sentences start with
"Vekil kararı", "Lider kararı" or "Proje sahibi".
"""
import argparse, datetime as dt, json, os, re, subprocess
from collections import Counter, defaultdict

ETIKETLER = ("RAPOR", "SORU", "BİLGİ", "DÜZELTME")


def metin(c):
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(x.get("text", "") for x in c if isinstance(x, dict) and x.get("type") == "text")
    return ""


def gorsel_sayisi(c):
    return sum(1 for x in c if isinstance(x, dict) and x.get("type") == "image") if isinstance(c, list) else 0


def gelen_rol(t):
    m = re.search(r'from-name="([^"]*)"', t)
    ad = (m.group(1) if m else "").lower()
    for r in ("vekil", "lider", "gelistirici", "geliştirici"):
        if r in ad:
            return "gelistirici" if r.startswith("geli") else r
    return "diger"


TOKEN_ALANLARI = (
    ("input_tokens", "token_girdi"),
    ("output_tokens", "token_cikti"),
    ("cache_creation_input_tokens", "token_onbellek_yazma"),
    ("cache_read_input_tokens", "token_onbellek_okuma"),
)


# Yapıştırılan rol istemi: "Sen bu projede vekil rolündesin", "Sen Proje-Lider oturumusun" gibi. --istem ile değiştirilebilir.
# EN: Pasted role prompt, e.g. "Sen bu projede vekil rolündesin", "Sen Proje-Lider oturumusun". Override with --istem.
ISTEM_KALIBI = r"\s*Sen\b[^\n]{1,80}?\b(rolündesin|oturumusun)\b"


# Sonucu beklenen süre çalışma sayılmayan araçlar (proje sahibinin yanıtını bekler).
# EN: Tools whose wait time is not counted as work (they wait for the owner's reply).
BEKLEME_ARACLARI = {"AskUserQuestion", "ExitPlanMode"}


def oturum_say(yol, bas, s, olaylar=None, bit=None, istem=ISTEM_KALIBI, arac_araliklari=None):
    """Bir oturum kaydını sayar. Proje sahibinin mesaj zamanlarını döndürür; olaylar verilirse
    kayıttaki bütün olay zamanlarını oraya ekler (rolün etkin süresi için).

    EN: Counts one session log. Returns the timestamps of the owner's messages; if olaylar is given,
    every event timestamp in the log is appended to it (for the role's active time)."""
    insan_zaman = []
    gorulen_yanit = set()
    acik_arac = {}  # araç çağrısı kimliği → (başlangıç zamanı, araç adı) / EN: tool call id → (start time, tool name)
    for satir in open(yol, encoding="utf-8"):
        try:
            d = json.loads(satir)
        except ValueError:
            continue
        zaman = d.get("timestamp") or ""
        try:
            an = _zaman(zaman)
        except ValueError:
            continue
        # Tarih olarak karşılaştırılır (metin karşılaştırması milisaniyeli zamanı aynı saniyede yanlış sıralar).
        # EN: Compared as datetimes (a string comparison misorders timestamps with milliseconds within the same second).
        if an < _zaman(bas) or (bit and an > _zaman(bit)):
            continue
        # Etkinlik yalnız gerçek mesaj ve yanıt satırlarından ölçülür (ayar ve iç durum satırları sayılmaz).
        # EN: Activity is measured only from real message and response lines (settings and internal state lines are skipped).
        if olaylar is not None and d.get("type") in ("user", "assistant"):
            olaylar.append(zaman)
        m = d.get("message") or {}
        if d.get("type") == "user" and m.get("role") == "user":
            c = m.get("content")
            if isinstance(c, list) and any(isinstance(x, dict) and x.get("type") == "tool_result" for x in c):
                # Araç çağrısının başından sonucuna kadar geçen süre, ne kadar uzun olursa olsun çalışmadır
                # (uzun derleme, test, işleme). Proje sahibini bekleyen araçlar sayılmaz.
                # EN: The time from a tool call to its result is work, however long it takes
                # (long builds, tests, processing). Tools that wait for the owner are not counted.
                for x in c:
                    if not (isinstance(x, dict) and x.get("type") == "tool_result"):
                        continue
                    acilis = acik_arac.pop(x.get("tool_use_id"), None)
                    if not acilis or acilis[1] in BEKLEME_ARACLARI:
                        continue
                    if arac_araliklari is not None:
                        arac_araliklari.append((acilis[0], zaman))
                    sure = (_zaman(zaman) - _zaman(acilis[0])).total_seconds() / 60
                    if sure > 10:
                        s["uzun_arac"] += 1
                        s["uzun_arac_dakika"] += round(sure)
                continue
            # Alt ajan kaydında (isSidechain) "kullanıcı" mesajı, alt ajanı açan oturumun yazdığı görevdir;
            # proje sahibinin mesajı sayılmaz. Etkinliği ve token kullanımı yine sayılır.
            # EN: In a subagent log (isSidechain) the "user" message is the task written by the session that spawned
            # the subagent, not an owner message. Its activity and token usage are still counted.
            if d.get("isSidechain") is True:
                if not d.get("isMeta"):
                    s["alt_ajan_gorevi"] += 1
                continue
            t = metin(c)
            if "<cross-session-message" in t:
                r = gelen_rol(t)
                s[f"gelen_{r}"] += 1
                govde = re.sub(r"<[^>]+>", "", t).strip()
                ilk = govde.split(":", 1)[-1].strip().split(" ", 1)[0].upper() if govde else ""
                for e in ETIKETLER:
                    if ilk.startswith(e):
                        s[f"etiket_{e}"] += 1
                if re.search(r"DÜZELTME|yanlıştı|tahmindi", t):
                    s["gelen_duzeltme"] += 1
                if re.search(r"[Kk]ararın (gerekiyor|bekliyorum)|[Oo]naylar mısın|[Ss]ana (bir )?soru", t):
                    s["gelen_karar_istegi"] += 1
                continue
            if d.get("isMeta") or d.get("isCompactSummary"):
                continue
            if (not t.strip() and not gorsel_sayisi(c)) or (t.strip().startswith("<") and "pasted_content" not in t):
                continue
            if re.match(istem, t):
                s["rol_istemi"] += 1  # yapıştırılan rol istemi: proje sahibinin mesajı ve etkin süresi sayılmaz / EN: pasted role prompt: not an owner message, no owner active time
                continue
            s["insan_mesaji"] += 1
            if gorsel_sayisi(c):
                s["insan_gorsel"] += 1
            insan_zaman.append(d["timestamp"])
        elif d.get("type") == "assistant":
            kullanim = m.get("usage")
            kimlik = m.get("id") or d.get("uuid")
            if isinstance(kullanim, dict) and kimlik not in gorulen_yanit:
                gorulen_yanit.add(kimlik)
                s["yanit"] += 1
                for alan, ad in TOKEN_ALANLARI:
                    v = kullanim.get(alan)
                    if isinstance(v, int):
                        s[ad] += v
            for x in m.get("content") or []:
                if not (isinstance(x, dict) and x.get("type") == "tool_use"):
                    continue
                ad, girdi = x.get("name"), x.get("input") or {}
                if x.get("id"):
                    acik_arac[x["id"]] = (zaman, ad)
                if ad == "SendMessage":
                    s["giden_mesaj"] += 1
                    msg = girdi.get("message", "")
                    s["vekil_karari"] += len(re.findall(r"[Vv]ekil kararı", msg))
                    s["lider_karari"] += len(re.findall(r"[Ll]ider kararı|[Kk]ararı ben verdim", msg))
                elif ad == "AskUserQuestion":
                    s["insana_soru"] += 1
                elif ad == "Agent":
                    s["alt_ajan"] += 1
    return insan_zaman


def _zaman(z):
    return dt.datetime.fromisoformat(z.replace("Z", "+00:00"))


def araliklar(zamanlar, esik, ek):
    """Olay zamanlarından etkin aralıklar: esik dakikadan kısa boşluklar aralığı sürdürür,
    her aralığın sonuna ek dakika eklenir. [(başlangıç, bitiş)] döner.

    EN: Active intervals from event timestamps: gaps shorter than esik minutes keep an interval going,
    and ek minutes are added to the end of each interval. Returns [(start, end)]."""
    out = []
    for z in sorted(_zaman(x) for x in zamanlar):
        if out and (z - out[-1][1]).total_seconds() / 60 < esik:
            out[-1][1] = z
        else:
            out.append([z, z])
    return [(a, b + dt.timedelta(minutes=ek)) for a, b in out]


def birlesim(araliklar_listesi):
    """Üst üste binen aralıkları birleştirir. / EN: Merges overlapping intervals."""
    out = []
    for a, b in sorted(araliklar_listesi):
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return [(a, b) for a, b in out]


def fark(a_list, b_list):
    """a aralıklarından b aralıklarını çıkarır. / EN: Subtracts the b intervals from the a intervals."""
    out = []
    b_list = birlesim(b_list)
    for a, b in birlesim(a_list):
        parca = [(a, b)]
        for x, y in b_list:
            yeni = []
            for p, q in parca:
                if y <= p or x >= q:
                    yeni.append((p, q))
                    continue
                if p < x:
                    yeni.append((p, x))
                if y < q:
                    yeni.append((y, q))
            parca = yeni
        out += parca
    return out


def dakika(araliklar_listesi):
    return round(sum((b - a).total_seconds() for a, b in araliklar_listesi) / 60)


def etkin_dakika(zamanlar, esik=20, ek=3):
    zs = sorted(dt.datetime.fromisoformat(z.replace("Z", "+00:00")) for z in zamanlar)
    if not zs:
        return 0
    top = ek
    for a, b in zip(zs, zs[1:]):
        g = (b - a).total_seconds() / 60
        top += g if g < esik else ek
    return round(top)


def git_say(depo, bas, bit=None):
    def git(*a):
        return subprocess.run(["git", "-C", depo, *a], capture_output=True, text=True).stdout
    aralik = [f"--since={bas}"] + ([f"--until={bit}"] if bit else [])
    konu = git("log", *aralik, "--format=%s").splitlines()
    govde = git("log", *aralik, "--format=%B")
    eklenen = git("log", *aralik, "--diff-filter=A", "--name-only", "--format=", "--", "docs/gorevler", "docs/kararlar").splitlines()
    return {
        "commit": len(konu),
        "birlestirme": sum(1 for k in konu if k.startswith("Birleştirme")),
        "canli_yukseltme": sum(1 for k in konu if re.search(r"canlıya yükseltme|^Durum: canlı [0-9a-f]{7}", k, re.I)),
        "yarim_commit": sum(1 for k in konu if "yarım" in k.lower()),
        "yan_kol": sum(1 for k in konu if "yan kol" in k.lower()),
        "vekil_karari_commit": len(re.findall(r"vekil kararı|vekil onayı", govde, re.I)),
        "proje_sahibi_commit": len(re.findall(r"proje sahibi", govde, re.I)),
        "yeni_gorev": len({e for e in eklenen if "/gorevler/" in e and e.endswith(".md")}),
        "yeni_karar": len({e for e in eklenen if "/kararlar/" in e and e.endswith(".md")}),
    }


def birlestir(dosyalar):
    kayitlar = [json.load(open(f, encoding="utf-8")) for f in dosyalar]
    print("# VekilEkip ölçüm cetveli (birleşik)\n")
    anahtarlar = sorted({(b, k) for r in kayitlar for b, d in r["bolumler"].items() for k in d})
    kodlar = [r["kod"] for r in kayitlar]
    print("| bölüm | anahtar | " + " | ".join(kodlar) + " | toplam |")
    print("|---|---|" + "---|" * (len(kodlar) + 1))
    for b, k in anahtarlar:
        degerler = [r["bolumler"].get(b, {}).get(k, 0) for r in kayitlar]
        print(f"| {b} | {k} | " + " | ".join(str(v) for v in degerler) + f" | {sum(degerler)} |")


def main():
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "birlestir":
        return birlestir(sys.argv[2:])
    p = argparse.ArgumentParser()
    p.add_argument("--kod", required=True, help="projenin kod adı; gerçek ad çıktıya girmez")
    p.add_argument("--json", action="store_true", help="tek satır JSON yaz (birlestir için)")
    p.add_argument("--bas", required=True, help="ISO zaman, ör. 2026-11-23T00:00:00+03:00")
    p.add_argument("--depo", required=True)
    p.add_argument("--istem", default=ISTEM_KALIBI, help="rol isteminin başını tanıyan düzenli ifade")
    p.add_argument("--bit", help="ISO zaman; bundan sonraki olaylar sayılmaz (varsayılan: son olay)")
    p.add_argument("oturumlar", nargs="+", help="rol=yol.jsonl")
    a = p.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9ÇĞİÖŞÜçğıöşü_-]{2,24}", a.kod):
        raise SystemExit("kod adı 2-24 harf, rakam, - ya da _ olmalı")
    bas_utc = dt.datetime.fromisoformat(a.bas).astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    bit_utc = dt.datetime.fromisoformat(a.bit).astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if a.bit else None
    roller = defaultdict(Counter)
    olaylar = defaultdict(list)
    arac = defaultdict(list)
    insan = []
    for o in a.oturumlar:
        rol, yol = o.split("=", 1)
        insan += oturum_say(os.path.expanduser(yol), bas_utc, roller[rol], olaylar[rol], bit_utc, a.istem, arac[rol])
    rol_araliklari = {
        rol: birlesim(araliklar(z, esik=10, ek=1) + [(_zaman(x), _zaman(y)) for x, y in arac[rol]])
        for rol, z in olaylar.items()
    }
    for rol, ar in rol_araliklari.items():
        roller[rol]["etkin_dakika"] = dakika(ar)
    bolumler = {rol: dict(sorted(s.items())) for rol, s in roller.items()}
    bolumler["proje_sahibi"] = {"etkin_dakika": etkin_dakika(insan), "insan_mesaji": len(insan)}
    sahip = araliklar(insan, esik=20, ek=3)
    ekip = birlesim([x for ar in rol_araliklari.values() for x in ar])
    tum = [z for zs in olaylar.values() for z in zs]
    son = _zaman(bit_utc) if bit_utc else (max(_zaman(z) for z in tum) if tum else _zaman(bas_utc))
    bolumler["zaman"] = {
        "takvim_dakika": max(0, round((son - _zaman(bas_utc)).total_seconds() / 60)),
        "sahip_etkin_dakika": dakika(sahip),
        "ekip_etkin_dakika": dakika(ekip),
        "sahip_yokken_ekip_dakika": dakika(fark(ekip, sahip)),
    }
    bosluklar = fark([(_zaman(bas_utc), son)], ekip)
    for ad, alt, ust in (("ekip_bosta_60dk_alti", 0, 60), ("ekip_bosta_1_3sa", 60, 180), ("ekip_bosta_3sa_ustu", 180, 10**9)):
        bolumler["zaman"][ad + "_dakika"] = dakika([(x, y) for x, y in bosluklar if alt < (y - x).total_seconds() / 60 <= ust])
    bolumler["depo"] = git_say(os.path.expanduser(a.depo), a.bas, a.bit)
    if a.json:
        print(json.dumps({"kod": a.kod, "bas": a.bas, "bolumler": bolumler}, ensure_ascii=False))
        return
    print(f"# VekilEkip ölçüm cetveli: {a.kod} ({a.bas} sonrası)\n")
    for b, d in bolumler.items():
        print(f"## {b}")
        for k, v in d.items():
            print(f"- {k}: {v}")
        print()


if __name__ == "__main__":
    main()
