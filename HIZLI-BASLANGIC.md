# Hızlı başlangıç (10 dakika)

[English](QUICKSTART.en.md) · Türkçe

Yöntemin ne olduğunu ve neden işe yaradığını [KILAVUZ.md](KILAVUZ.md) anlatır. Bu sayfa yalnız kurulumdur. Klasörünüz doluysa ya da git deposu değilse [KULLANIM-TALIMATI.md](KULLANIM-TALIMATI.md) ile ilerleyin.

## 0. Gerekenler

- macOS ya da Linux (Windows'ta WSL). git, bash, Node.js 18 ya da üstü (`node --version`). Ölçüm aracı için Python 3 (`python3 --version`); ölçmeyecekseniz gerekmez.
- Claude Code (`claude --version`).
- Bir git deposu olan proje klasörü. Yoksa: `git init`.

## 1. Hesap düzenini seçin (1 dakika)

- **Tek hesap:** üç oturum aynı hesapta, üç terminal sekmesinde. Kolay; kota tek hesaptan harcanır.
- **Çok hesap:** zaten sahip olduğunuz hesapları farklı rollerde kullanırsınız; her hesap ayrı yapılandırma klasörüyle açılır (`CLAUDE_CONFIG_DIR`). Kurulumu biraz daha uzun. Bu düzen kullanım sınırlarını aşmak için değildir.

Emin değilseniz tek hesapla başlayın. `kur.sh` yeniden çalıştırılabilir ve var olan dosyalara dokunmaz: değişen her dosyanın yenisini `.yeni` olarak bırakır. `CLAUDE.md` için de öyle: "Ekip ve hat" bölümü güncellenmiş, kendi bölümleriniz korunmuş hali `CLAUDE.md.yeni` olur. Karşılaştırıp siz birleştirirsiniz.

## 2. Kurulumu çalıştırın (3 dakika)

Bash'ten de zsh'tan da aynı biçimde:

```bash
bash /yol/VekilEkip/kurulum/kur.sh
```

Sorular sırayla:

| Soru | Örnek yanıt |
|---|---|
| Hedef proje klasörü | `~/projeler/proje` |
| (git deposu değilse) Yine de devam edilsin mi | `h` (önce `git init` yapın) |
| Rol adları | Enter (vekil, lider, gelistirici) |
| Hesap düzeni | `1` ya da `2` |
| (çok hesap) Kaç hesap, takma adlar, klasörler | `2`, `claude-ali` → `~/.claude`, `claude-veli` → `~/.claude-k2` |
| (çok hesap) Hangi rol hangi hesapta | vekil 1, lider 1, gelistirici 2 |
| Uzak depo adı | `origin` |
| Canlıya çıkış kararı kimde | `1` (proje sahibi; önerilen) ya da `2` (vekil) |
| Dosyalar yazılsın mı | `e` |
| (çok hesap) Takma adları kabuğunuzun başlangıç dosyasına (`~/.zshrc` ya da `~/.bashrc`) ekleyeyim mi | `e` ya da `h` (hayır derseniz satırları kendiniz ekleyin). Kabuk tanınmazsa ya da satırlar zaten varsa sorulmaz. |

Betik var olan hiçbir dosyanın üstüne yazmaz. Çakışan dosya `.yeni` uzantısıyla bırakılır; karşılaştırıp elle birleştirin:

```bash
diff CLAUDE.md CLAUDE.md.yeni
```

## 3. Gözden geçirin ve commit edin (3 dakika)

1. `CLAUDE.md` içindeki "Ekip ve hat" bölümünü okuyun. Projenize uymayan maddeyi silin (örneğin yayınınız yoksa "Yayın").
2. `.vekilekip.json` içindeki süreç kalıplarına bakın. Projenizde uzun süren başka bir süreç varsa ekleyin. Aynı dosyada `canli.yetki` kurulumda seçtiğiniz değeri taşır (`sahip` ya da `vekil`).
3. Commit edin: `git add -A && git commit -m "VekilEkip kuruldu"` (`yerel/` depoya girmez).
4. Mola denetimini deneyin:
   ```bash
   node araclar/mola.mjs        # çıkış 0: güvende
   node araclar/mola.mjs bitti
   ```
   Commit etmeden çalıştırırsanız "commit edilmemiş değişiklik" der ve çıkış 1 verir; `bitti` de "kayıtlı bir mola yok" der. İkisi de beklenen davranıştır.
   İlerleyen günlerde `UYARI docs/DURUM.md: son commit ... önce` görürseniz lider devir notunu güncelleyip commit etmemiştir; mola yine de geçer.

## 4. Oturumları açın (3 dakika)

**Tek hesap:**

```bash
cd ~/projeler/proje && claude      # üç ayrı terminal sekmesinde
```

Her sekmede `/rename vekil`, `/rename lider`, `/rename gelistirici`.

**Çok hesap:**

```bash
cd ~/projeler/proje && claude-ali     # vekil ve lider sekmeleri
cd ~/projeler/proje && claude-veli    # geliştirici sekmesi
```

İlk açılışta her hesap için giriş istenir. Sonra `/rename`.
İsteğe bağlı, oturumların birbirini görmesi için (belgelenmemiş iç yapıya dayanır, bozulabilir):

```bash
bash /yol/VekilEkip/kurulum/oturum-bagla.sh ~/.claude ~/.claude-k2
```

Her yeni oturum açıldıktan sonra bir kez çalıştırın.

## 5. Rol istemlerini yapıştırın (1 dakika)

`docs/ekip/ilk-mesajlar.md` dosyasındaki üç metni ilgili oturuma yapıştırın. Her `/clear` sonrasında da aynısını yapın.

## 6. Telefondan izleme (isteğe bağlı)

Her oturumda Claude Code'un Remote Control özelliğini açın: `/remote-control` (komut sürümünüzde yoksa `/help` ile adına bakın).
Telefondan izleyin; görüşünüzü **yalnız vekil** oturumuna yazın.

Çok hesapta: telefondaki Claude uygulaması tek hesabı gösterir. Öbür hesabı telefonun tarayıcısında açık tutun.

---

## İlk gün için üç kural

1. Görüşünüzü yalnız vekile söyleyin.
2. Büyük iş bitince: devir notu, commit, `/clear`.
3. Kanıtsız "çalıştı" kabul etmeyin: görüntü, kayıt ya da sayı isteyin.

Mola: vekile "Mola ver." yazın. Dönüşte: "Mola bitti."

Canlıya çıkış (yetki sizdeyse): kendi terminalinizde `node araclar/canli.mjs onayla`. Oturumlar bu onayı veremez.

Kuralları denetime çevirmek için: `sablonlar/ornekler/` içindeki rol ve sır kancaları (kurulmaz; [kılavuzda](KILAVUZ.md) "Önerilen eklemeler").
