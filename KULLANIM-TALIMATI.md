# Kullanım talimatı: var olan bir klasöre adım adım kurulum

Bu talimat gerçek bir kurulumdan çıkarıldı. Senaryo: içinde notlar, yedekler ve belgeler olan, henüz git deposu olmayan bir çalışma klasörü; tek Claude hesabı; üç oturum (vekil, lider, geliştirici).

[HIZLI-BASLANGIC.md](HIZLI-BASLANGIC.md) boş ya da zaten git deposu olan bir projeyi varsayar. Klasörünüz doluysa ya da git deposu değilse bu talimatı izleyin. Yöntemin ne olduğunu ve neden işe yaradığını [README.md](README.md) anlatır.

Toplam süre yaklaşık 15 dakikadır. Her adımda şunlar yazılıdır: ne yazacağınız, ne görmeniz gerektiği ve bir şey ters giderse ne yapacağınız.

---

## 0. Başlamadan önce

- Bu sayfa macOS'ta yazıldı (`open -e`, zsh). Linux'ta ve Windows'ta WSL'de aynı adımlar geçerlidir; `open -e` yerine kendi metin düzenleyicinizi kullanın.
- Terminal'de `node --version` 18 ya da üstünü göstermeli.
- Claude Code kurulu olmalı. Takma adınız varsa (örnek `claude-ali`) onu kullanın, yoksa `claude` yazın.
- Kitin yerini bilin. Örneklerde `~/VekilEkip` kullanıldı; kendi yolunuzu yazın.

---

## 1. Klasörü git deposu yapın (3 dk)

```zsh
cd ~/calisma/klasorum
git init -b main
git status
```

**Görmeniz gereken:** "boş Git deposu ilklendirildi" ve klasördeki dosyaların "İzlenmeyen dosyalar" listesi.

**Bu listeye dikkatle bakın.** Git'e giren her şey geçmişte kalıcı olarak durur; sonradan çıkarmak zahmetlidir. Şunlar dışarıda kalmalı:
- yedek klasörleri, veritabanı dosyaları (`.sqlite`, `.db`), büyük PDF ve Word belgeleri;
- kurulum ve denetim çıktıları (sunucu dosyaları, günlükler);
- parola, anahtar ya da kişisel veri içeren her dosya (`.env`, kayıt listeleri).

Dışarıda bırakmak için `.gitignore` yazın. Aşağıdaki desenleri kendi klasör adlarınıza göre değiştirin:

```zsh
cat > .gitignore <<'EOF'
# Yedekler, kurulum ve denetim çıktıları git'e girmez
*-yedek-*/
*-kurulum-*/
denetim-*/
*.docx
*.sqlite
*.db
*.pdf
.env
yerel/
EOF
git status
```

**Görmeniz gereken:** listede yalnız git'te durmasını istediğiniz dosyalar ve `.gitignore`. Klasörler kaybolmalı.

İçeriğinden emin olmadığınız tek bir dosyayı da dışarıda bırakmak için:

```zsh
echo "dosya-adi-*.json" >> .gitignore
```

Not: `cat > .gitignore` dosyayı baştan yazar, `echo ... >>` ise sonuna satır ekler. İkinci kez `cat >` çalıştırırsanız önceki eklemeleriniz silinir.

---

## 2. Kurulum betiğini çalıştırın (3 dk)

```zsh
bash ~/VekilEkip/kurulum/kur.sh
```

| Soru | Yanıt |
|---|---|
| Hedef proje klasörü | Enter (bulunduğunuz klasör) |
| (git deposu değilse) Yine de devam edilsin mi | 1. adımı yaptıysanız bu soru çıkmaz. Çıkarsa `h` deyip 1. adıma dönün. |
| Rol adları | Enter, Enter, Enter (`vekil`, `lider`, `gelistirici`) |
| Hesap düzeni | `1` (tek hesap) |
| Uzak depo adı | Enter (`origin`). Uzak depo yoksa da Enter. |
| Canlıya çıkış kararı kimde | Enter (`1`, proje sahibi). Vekile devretmek için `2`. |
| Dosyalar yazılsın mı | `e` |

**Görmeniz gereken:** "Kurulum bitti" ve oluşturulan dosyaların listesi (`CLAUDE.md`, `docs/...`, `araclar/mola.mjs` vb.).

- "Atlananlar:" başlığının altında `= .gitignore (yerel/ zaten var)` satırı normaldir; sizin dosyanız korunmuştur.
- Listede `.yeni` uzantılı bir dosya varsa, klasörde o adla bir dosya zaten vardı. İkisini karşılaştırıp elle birleştirin: `diff CLAUDE.md CLAUDE.md.yeni`.

---

## 3. Gözden geçirin ve ilk commit'i yapın (3 dk)

1. `CLAUDE.md` içindeki "Ekip ve hat" bölümünü okuyun:
   ```zsh
   open -e CLAUDE.md
   ```
   İşinize uymayan maddeyi silin. Örneğin yayınınız ya da dev ortamınız yoksa o maddeleri çıkarın.

2. Mola denetimini çalıştırın:
   ```zsh
   node araclar/mola.mjs
   ```
   İlk çalıştırmada "commit edilmemiş değişiklik (N dosya)" demesi **normaldir**, çünkü henüz commit yok.

3. Commit edin ve molayı yeniden deneyin:
   ```zsh
   git add -A && git commit -m "VekilEkip kuruldu"
   node araclar/mola.mjs && node araclar/mola.mjs bitti
   ```

**Görmeniz gereken:**

```
Güvende: 1 kopya temiz, çalışan iş yok. Kayıt: yerel/mola.json
  main abc1234  /sizin/klasorunuz
Mola bitti: 1 kopya kaydedilen commit'te. Devir notundan devam.
```

İkinci satırda dalınızın adı, commit kimliği ve klasörünüzün yolu yazar.

- `UYARI ... "origin" adlı uzak depo yok` satırı, deponuz yalnız bu bilgisayarda duruyorsa her seferinde çıkar. Zararsızdır.
- İlerleyen günlerde `UYARI docs/DURUM.md: son commit ... önce` görürseniz, lider devir notunu son 30 dakikada güncelleyip commit etmemiştir. Mola yine de geçer; notu güncelletin.
- Commit çıktısında `.gitignore` ile dışarıda bıraktığınız dosyalar **görünmemeli**. Görünüyorsa `git rm --cached <dosya>` ile çıkarın, `.gitignore`'a ekleyin ve yeniden commit edin.

---

## 4. Üç oturumu açın (3 dk)

Terminal'de üç sekme açın (macOS'ta Cmd+T). Her sekmede şunu çalıştırın:

```zsh
cd ~/calisma/klasorum && claude      # ya da kendi takma adınız
```

Oturumlar açılınca adlarını verin:

| Sekme | Komut |
|---|---|
| 1 | `/rename vekil` |
| 2 | `/rename lider` |
| 3 | `/rename gelistirici` |

Rol kancasını kurduysanız (kitteki `sablonlar/ornekler/kanca-rol.mjs`; kendiliğinden kurulmaz) sekmeleri rolüyle açın: `VEKILEKIP_ROL=vekil claude`, `VEKILEKIP_ROL=lider claude`, `VEKILEKIP_ROL=gelistirici claude`. Rol adlarını değiştirmiş olsanız da bu değer hep şu üç sözcükten biridir.

**Önemli:** adlar `kur.sh`'ta seçtiğiniz rol adlarıyla **birebir** aynı olmalı. Rol metinleri oturumlara bu adlarla seslenir; `Vekil-1` ya da önekli bir ad verirseniz mesajlar yerine ulaşmaz. Aynı makinede başka bir projenin oturumları da açıksa onların adları farklı olduğu sürece karışmaz.

---

## 5. Rol metinlerini verin (2 dk)

```zsh
open -e docs/ekip/ilk-mesajlar.md
```

Dosyada her rol için bir açılış metni vardır. Her birini kendi sekmesine yapıştırın: vekil metnini vekile, lider metnini lidere, geliştirici metnini geliştiriciye.

Her `/clear` sonrasında aynı metni yeniden yapıştırırsınız. Elle yazmayın; her seferinde biraz farklı yazılır ve oturumlar farklı davranır.

---

## 6. Hattı sınayın (1 dk)

Vekil sekmesine şunu yazın:

> Oturumları listele ve lider'e "merhaba, hazır mısın?" mesajı gönder.

**Görmeniz gereken:**
- Vekilin listesinde `vekil` (bu oturum), `lider` ve `gelistirici` görünür.
- Birkaç saniye sonra liderden "hazırım" yanıtı gelir.

Lider listede yoksa:
- O sekmede `/rename` adını kontrol edin.
- Oturumun aynı hesapla açıldığından emin olun (tek hesap düzeninde bütün sekmeler aynı takma adla açılmalı).
- Sekmeyi kapatıp yeniden açın ve 4. adımı yineleyin.

Tek hesap düzeninde oturumlar birbirini doğrudan görür; bağlama betiğine (`oturum-bagla.sh`) gerek yoktur. Bu, gerçek bir kurulumda doğrulandı.

---

## 7. Telefondan izleme (isteğe bağlı)

- Her sekmede uzaktan bağlantıyı açın: `/remote-control`. Komutun adı sürümünüzde farklıysa `/help` ile bakın.
- Telefonda Claude uygulamasına aynı hesapla girin; üç oturum listede görünür.
- İzlemek için hepsine bakabilirsiniz, ama **görüşünüzü yalnız vekile yazın**.

---

## Kurulumdan sonra: gündelik kullanım

| Ne zaman | Ne yaparsınız |
|---|---|
| Bir istek, görüş ya da karar | Yalnız **vekil** sekmesine yazın. Vekil lidere iletir, lider geliştiriciye. |
| Vekil bir şey sorduğunda | Vekile yanıt verin. Lider ya da geliştirici size doğrudan sorarsa yanıtı yine vekile yazın. |
| Bir rapor geldiğinde | Durum, bitenler, vekil kararları, sizden beklenen, risk. Önce "sizden beklenen"e bakın. |
| Biri "çalıştı" dediğinde | Kanıt isteyin: görüntü, kayıt ya da sayı. Kanıtsız kabul etmeyin. |
| Büyük bir iş bitince | O oturum kendi devir notunu yazsın (lider `docs/DURUM.md`, geliştirici görev dosyası, vekil kendi raporu), commit atılsın, sonra o sekmede `/clear` ve rol metni yeniden yapıştırılsın. |
| Canlıya çıkılacağı zaman (yetki sizdeyse) | Vekil onayınızı ister. Kendi terminalinizde `node araclar/canli.mjs onayla` çalıştırın ve gösterilen kısa kimliği yazın. Oturumlar bu onayı veremez. |
| Bilgisayardan uzaklaşırken | Vekile "Mola ver." yazın; "güvende" yanıtını bekleyin. |
| Dönünce | Vekile "Mola bitti." yazın. |
| Bir olay olduğunda (sır sızıntısı, yanlış rapor, yanlış ortam) | Vekile söyleyin; vekil lidere iletir, lider `docs/olaylar.md` dosyasına yazar. |
| Haftada bir | `docs/ekip/geriye-bakis.md` ile kısa bir değerlendirme: hangi kural işe yaradı, hangisi gereksiz. |

---

## Kontrol listesi

- [ ] `git status` listesinde yedek, kurulum, sır ve büyük belge yok
- [ ] `kur.sh` "Kurulum bitti" dedi; `.yeni` dosyalar birleştirildi
- [ ] `CLAUDE.md` "Ekip ve hat" bölümü işe göre düzenlendi; canlıya çıkış kararının kimde olduğu doğru yazıyor
- [ ] İlk commit atıldı; `node araclar/mola.mjs` "Güvende" diyor
- [ ] Üç sekme `vekil`, `lider`, `gelistirici` adlarıyla açık
- [ ] Rol metinleri yapıştırıldı
- [ ] Vekil, lidere mesaj gönderdi ve yanıt aldı
