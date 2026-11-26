"""TR: Ölçüm cetvelinin testleri. Koşu: python3 araclar/olcum_test.py

EN: Tests of the measurement script. Run: python3 araclar/olcum_test.py
"""
import datetime as dt, json, os, subprocess, sys, tempfile, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import olcum  # noqa: E402

BURASI = os.path.dirname(os.path.abspath(__file__))


def z(dakika):
    """2026-01-05 10:00 UTC'den itibaren dakika → ISO zaman. / EN: Minutes after 2026-01-05 10:00 UTC → ISO timestamp."""
    return (dt.datetime(2026, 1, 5, 10, 0, tzinfo=dt.timezone.utc) + dt.timedelta(minutes=dakika)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


class Araliklar(unittest.TestCase):
    def test_kisa_bosluk_surer_uzun_bosluk_keser(self):
        ar = olcum.araliklar([z(0), z(5), z(8), z(40)], esik=10, ek=1)
        self.assertEqual(len(ar), 2)
        self.assertEqual(olcum.dakika(ar), (8 + 1) + (0 + 1))

    def test_etkin_dakika_ile_ayni_sonuc(self):
        zs = [z(0), z(10), z(19), z(60), z(61)]
        self.assertEqual(olcum.dakika(olcum.araliklar(zs, esik=20, ek=3)), olcum.etkin_dakika(zs))

    def test_birlesim_ve_fark(self):
        a = olcum.araliklar([z(0), z(5)], esik=10, ek=0)  # 0-5
        b = olcum.araliklar([z(3), z(9)], esik=10, ek=0)  # 3-9
        self.assertEqual(olcum.dakika(olcum.birlesim(a + b)), 9)
        self.assertEqual(olcum.dakika(olcum.fark(b, a)), 4)  # 5-9
        self.assertEqual(olcum.dakika(olcum.fark(a, a)), 0)
        self.assertEqual(olcum.dakika(olcum.fark(a, [])), 5)

    def test_bos(self):
        self.assertEqual(olcum.araliklar([], 10, 1), [])
        self.assertEqual(olcum.dakika([]), 0)


class UctanUca(unittest.TestCase):
    def test_zaman_bolumu(self):
        with tempfile.TemporaryDirectory() as k:
            subprocess.run(["git", "init", "-q", k], check=True)

            def kayit(ad, satirlar):
                yol = os.path.join(k, ad)
                with open(yol, "w", encoding="utf-8") as f:
                    for s in satirlar:
                        f.write(json.dumps(s) + "\n")
                return yol

            insan = lambda d, t: {"type": "user", "timestamp": z(d), "message": {"role": "user", "content": t}}
            yanit = lambda d: {"type": "assistant", "timestamp": z(d), "message": {"id": f"m{d}", "content": [], "usage": {"input_tokens": 1, "output_tokens": 2}}}
            # vekil: sahip 0. ve 5. dakikada yazar, vekil 0-6 arası çalışır; rol istemi sayılmaz
            # EN: proxy: the owner writes at minutes 0 and 5, the proxy works from 0 to 6; the role prompt is not counted
            v = kayit("vekil.jsonl", [insan(-1, "Sen bu projede vekil rolündesin. ..."), insan(0, "başla"), yanit(1), insan(5, "devam"), yanit(6)])
            # geliştirici: 30-50 arası çalışır (sahip yokken)
            # EN: developer: works from 30 to 50 (while the owner is away)
            g = kayit("gel.jsonl", [yanit(30), yanit(38), yanit(46), yanit(50), yanit(200)])
            # alt ajan kaydı: görev metni sahibin mesajı değildir; ayar satırı etkinlik sayılmaz
            # EN: subagent log: the task text is not an owner message; a settings line is not activity
            alt = {"type": "user", "timestamp": z(60), "isSidechain": True, "message": {"role": "user", "content": "Bağımsız bir gözden geçirici olarak çalışıyorsun."}}
            alt_sonuc = {"type": "user", "timestamp": z(60), "isSidechain": True, "message": {"role": "user", "content": [{"type": "tool_result", "content": "x"}]}}
            ayar = {"type": "mode", "timestamp": z(90)}
            gl = kayit("gel-alt.jsonl", [alt, alt_sonuc, ayar])
            # başka biçimde rol istemi: proje sahibinin mesajı sayılmaz
            # EN: a role prompt in a different form: not counted as an owner message
            g2 = kayit("gel2.jsonl", [insan(70, "Sen Proje-Gelistirici oturumusun. Önce git log -5 ...")])
            c = subprocess.run(
                [sys.executable, "-I", os.path.join(BURASI, "olcum.py"), "--kod", "DENEME", "--json", "--bas", z(-2), "--bit", z(100), "--depo", k, f"vekil={v}", f"gelistirici={g}", f"gelistirici={gl}", f"gelistirici={g2}"],
                capture_output=True, text=True, check=True,
            )
            r = json.loads(c.stdout)["bolumler"]
            self.assertEqual(r["vekil"]["rol_istemi"], 1)
            self.assertEqual(r["vekil"]["insan_mesaji"], 2)
            self.assertEqual(r["proje_sahibi"]["etkin_dakika"], 8)  # 0-5, +3
            self.assertEqual(r["gelistirici"]["alt_ajan_gorevi"], 1)  # araç sonucu sayılmaz / EN: a tool result is not counted
            self.assertEqual(r["gelistirici"]["rol_istemi"], 1)
            self.assertEqual(r["proje_sahibi"]["insan_mesaji"], 2)
            self.assertEqual(r["gelistirici"]["etkin_dakika"], 21 + 1 + 1)  # 30-50, alt ajan 60, istem 70 (her biri +1); 200 --bit sonrası, 90 ayar satırı / EN: 30-50, subagent at 60, prompt at 70 (+1 each); 200 is after --bit, 90 is a settings line
            self.assertEqual(r["zaman"]["takvim_dakika"], 102)
            self.assertEqual(r["zaman"]["sahip_etkin_dakika"], 8)
            self.assertEqual(r["zaman"]["ekip_etkin_dakika"], 8 + 21 + 1 + 1)  # vekil -1..7, gel 30..51, alt ajan 60..61, istem 70..71 / EN: proxy -1..7, developer 30..51, subagent 60..61, prompt 70..71
            # vekil -1..0 (sahip daha yazmamış) + geliştirici 30..51 + alt ajan 60..61
            # EN: proxy -1..0 (the owner has not written yet) + developer 30..51 + subagent 60..61
            self.assertEqual(r["zaman"]["sahip_yokken_ekip_dakika"], 1 + 21 + 1 + 1)

    def test_uzun_arac_cagrisi_calisma_sayilir_soru_beklemesi_sayilmaz(self):
        with tempfile.TemporaryDirectory() as k:
            subprocess.run(["git", "init", "-q", k], check=True)
            yol = os.path.join(k, "lider.jsonl")
            arac = lambda d, i, ad: {"type": "assistant", "timestamp": z(d), "message": {"id": f"m{d}", "content": [{"type": "tool_use", "id": i, "name": ad, "input": {}}]}}
            sonuc = lambda d, i: {"type": "user", "timestamp": z(d), "message": {"role": "user", "content": [{"type": "tool_result", "tool_use_id": i, "content": "x"}]}}
            with open(yol, "w", encoding="utf-8") as f:
                for x in [arac(0, "a1", "Bash"), sonuc(40, "a1"), arac(300, "a2", "AskUserQuestion"), sonuc(340, "a2")]:
                    f.write(json.dumps(x) + "\n")
            c = subprocess.run([sys.executable, "-I", os.path.join(BURASI, "olcum.py"), "--kod", "DENEME", "--json", "--bas", z(0), "--depo", k, f"lider={yol}"], capture_output=True, text=True, check=True)
            r = json.loads(c.stdout)["bolumler"]
            self.assertEqual(r["lider"]["uzun_arac"], 1)
            self.assertEqual(r["lider"]["uzun_arac_dakika"], 40)
            # 0..40 araç + 1; soru beklemesi 300..340 sayılmaz, yalnız iki olay (+1 ve +1)
            # EN: tool 0..40, plus 1; the wait on a question (300..340) is not counted, only its two events (+1 and +1)
            self.assertEqual(r["lider"]["etkin_dakika"], 41 + 1 + 1)
            z_ = r["zaman"]
            self.assertEqual(z_["takvim_dakika"], 340)
            # boşluklar: 41..300 (259 dk, 3 saatten uzun) ve 301..340 (39 dk)
            # EN: gaps: 41..300 (259 min, over 3 hours) and 301..340 (39 min)
            self.assertEqual(z_["ekip_bosta_3sa_ustu_dakika"], 259)
            self.assertEqual(z_["ekip_bosta_60dk_alti_dakika"], 39)
            self.assertEqual(z_["ekip_bosta_1_3sa_dakika"], 0)

    def test_bozuk_kod_adi_dosya_okumadan_durur(self):
        c = subprocess.run([sys.executable, "-I", os.path.join(BURASI, "olcum.py"), "--kod", "x", "--bas", z(0), "--depo", ".", "vekil=/yok.jsonl"], capture_output=True, text=True)
        self.assertNotEqual(c.returncode, 0)
        self.assertIn("kod adı", c.stderr)



class KayitBicimleri(unittest.TestCase):
    """Sıraya alınan mesajlar, izin beklemesi, kesinti ve şablon dosyaları.
    EN: Queued messages, permission waits, interrupts and template files."""

    def say(self, satirlar):
        with tempfile.TemporaryDirectory() as k:
            yol = os.path.join(k, "o.jsonl")
            with open(yol, "w", encoding="utf-8") as f:
                for x in satirlar:
                    f.write(json.dumps(x) + "\n")
            s, olaylar, arac = olcum.Counter(), [], []
            insan = olcum.oturum_say(yol, z(-60), s, olaylar, None, olcum.ISTEM_KALIBI, arac)
            return s, insan, arac

    @staticmethod
    def sirali(d, metin, tur="human", mod="prompt", **ek):
        return {"type": "attachment", "timestamp": z(d), "attachment": {"type": "queued_command", "prompt": metin, "commandMode": mod, "origin": {"kind": tur} if tur else None, **ek}}

    @staticmethod
    def insan(d, metin):
        return {"type": "user", "timestamp": z(d), "message": {"role": "user", "content": metin}}

    def test_sirali_insan_mesaji_sayilir(self):
        s, insan, _ = self.say([self.insan(0, "başla"), self.sirali(3, "şunu da ekle")])
        self.assertEqual(s["insan_mesaji"], 2)
        self.assertEqual(len(insan), 2)

    def test_sirali_oturum_mesaji_role_ve_etikete_yazilir(self):
        m = '<cross-session-message from-name="Proje-Lider">RAPOR: görev bitti</cross-session-message>'
        s, insan, _ = self.say([self.sirali(1, m, tur="peer")])
        self.assertEqual(s["gelen_lider"], 1)
        self.assertEqual(s["etiket_RAPOR"], 1)
        self.assertEqual(s["insan_mesaji"], 0)
        self.assertEqual(insan, [])

    def test_etiket_basta_da_addan_sonra_da_taninir(self):
        sar = lambda g: f'<cross-session-message from-name="Proje-Lider">{g}</cross-session-message>'
        s, _, _ = self.say([self.insan(0, sar("SORU: hangisi?")), self.insan(1, sar("Lider: BİLGİ test sürüyor")), self.insan(2, sar("Not: rapor yarın"))])
        self.assertEqual((s["etiket_SORU"], s["etiket_BİLGİ"], s["etiket_RAPOR"]), (1, 1, 0))
        self.assertEqual(s["gelen_lider"], 3)

    def test_gorev_bildirimi_ve_alt_ajan_satiri_sayilmaz(self):
        s, insan, _ = self.say([
            self.sirali(1, "<task-notification>bitti</task-notification>", tur="task-notification", mod="task-notification"),
            self.sirali(2, "bildirim", tur=None, mod="task-notification"),
            {**self.sirali(3, "alt ajana gelen"), "isSidechain": True},
        ])
        self.assertEqual(s["insan_mesaji"], 0)
        self.assertEqual(insan, [])

    def test_iki_bicimde_duran_mesaj_bir_kez_sayilir(self):
        s, _, _ = self.say([self.sirali(1, "aynı mesaj"), self.insan(2, "aynı mesaj"), self.insan(5, "aynı mesaj")])
        self.assertEqual(s["insan_mesaji"], 2)  # sıradaki + 2. dakikadaki tek mesaj; 5. dakikadaki ayrı bir mesaj

    def test_sirali_rol_istemi_ve_kesinti_mesaj_sayilmaz(self):
        s, insan, _ = self.say([
            self.sirali(1, "Sen bu projede lider rolündesin. ..."),
            self.insan(2, "[Request interrupted by user]"),
            self.sirali(3, "[Request interrupted by user for tool use]"),
        ])
        self.assertEqual(s["insan_mesaji"], 0)
        self.assertEqual(s["rol_istemi"], 1)
        self.assertEqual(s["kesinti"], 2)
        self.assertEqual(insan, [])

    def test_sahibin_verdigi_izin_calisma_sayilmaz(self):
        cagri = lambda d, kimlik: {"type": "assistant", "timestamp": z(d), "message": {"id": f"m{kimlik}", "content": [{"type": "tool_use", "id": kimlik, "name": "Bash", "input": {}}]}}
        sonuc = lambda d, kimlik, karar: {"type": "user", "timestamp": z(d), "message": {"role": "user", "content": [{"type": "tool_result", "tool_use_id": kimlik}]}, **({"permissionDecision": karar} if karar else {})}
        s, _, arac = self.say([
            cagri(0, "a"), sonuc(480, "a", {"decision": "accept", "source": "user_temporary"}),  # sekiz saat izin bekledi
            cagri(500, "b"), sonuc(530, "b", {"decision": "accept", "source": "config"}),  # 30 dakikalık derleme
            cagri(600, "c"), sonuc(615, "c", None),  # izin bilgisi olmayan eski kayıt
        ])
        self.assertEqual(s["izin_bekleme"], 1)
        self.assertEqual(s["izin_bekleme_dakika"], 480)
        self.assertEqual(len(arac), 2)  # yalnız b ve c çalışma aralığı
        self.assertEqual(s["uzun_arac"], 2)
        self.assertEqual(s["uzun_arac_dakika"], 45)

    def test_sablon_dosyalari_gorev_ve_karar_sayilmaz(self):
        with tempfile.TemporaryDirectory() as k:
            git = lambda *a: subprocess.run(["git", "-C", k, "-c", "user.name=t", "-c", "user.email=t@example.com", *a], check=True, capture_output=True)
            git("init", "-q")
            for yol in ("docs/gorevler/_sablon.md", "docs/gorevler/0001-ilk.md", "docs/kararlar/_sablon.md", "docs/kararlar/0001-ekip.md"):
                os.makedirs(os.path.dirname(os.path.join(k, yol)), exist_ok=True)
                open(os.path.join(k, yol), "w").write("x\n")
            git("add", "-A")
            git("commit", "-q", "-m", "kurulum")
            d = olcum.git_say(k, "2000-01-01T00:00:00+00:00")
            self.assertEqual((d["yeni_gorev"], d["yeni_karar"]), (1, 1))


if __name__ == "__main__":
    unittest.main()
