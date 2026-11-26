## Ekip ve hat (VekilEkip)

Bu projede üç Claude Code oturumu çalışır. Mesaj hattı tektir:

```
Proje sahibi → {{VEKIL}} → {{LIDER}} → {{GELISTIRICI}}
```

| Rol | Ne yapar | Kime yazar |
|---|---|---|
| Proje sahibi | Yön verir, kendine ayrılan kararları verir. | Yalnız {{VEKIL}} oturumuna. |
| {{VEKIL}} | Proje sahibinin yerine rutin kararları verir, ona rapor verir. Kod yazmaz. | Yalnız {{LIDER}} oturumuna. |
| {{LIDER}} | İşi böler, görev verir; inceleme, birleştirme, yayın ve bağımsız göz ondadır. | {{GELISTIRICI}} oturumuna; raporu {{VEKIL}} oturumuna. |
| {{GELISTIRICI}} | Yalnız kod yazar; kendi dalında ve kendi çalışma kopyasında (git worktree). | Raporu {{LIDER}} oturumuna. |

Oturumlar ve hesaplar:

{{HESAP_TABLOSU}}

### Hat kuralları
- Proje sahibi başka bir oturuma doğrudan yazarsa o geçerlidir. {{GELISTIRICI}} oturumuna yazdıysa {{GELISTIRICI}} bunu {{LIDER}} oturumuna bildirir; {{LIDER}} de {{VEKIL}} oturumuna bildirir.
- Mesajla yalnız görev ve kısa durum gider. İçerik ve sonuç depodaki dosyalara yazılır.
- {{GELISTIRICI}} ana çalışma kopyasında ve `main` üzerinde çalışmaz; her görev için kendi dalını ve kendi çalışma kopyasını açar (git worktree). `main`e {{LIDER}} birleştirir.
- Ana kopyada kod yazılmaz. Orada {{LIDER}} birleştirir ve kendi belgelerini yazar; {{VEKIL}} yalnız karar kayıtlarını yazar. Her dosyanın, görev dosyasında ise her bölümün tek yazarı vardır. Commit ederken yalnız kendi dosyanı ver (`git add <dosya> && git commit <dosya> -m ...`); başkasının hazırladığı değişikliği commit'ine katma.
- Commit konusu: {{LIDER}} birleştirme commit'inin konusunu "Birleştirme" ile başlatır; canlıya çıkışı kaydeden commit'in konusunda "canlıya yükseltme" geçer. Ölçüm aracı (`araclar/olcum.py`) bu iki kalıbı sayar; kalıp kullanılmazsa iki sayı 0 çıkar.

### Vekil yetkisi
- **{{VEKIL}} karar verir** (kayda "vekil kararı" diye girer): iş sırası ve öncelik; teknik yöntem; ücretsiz ve açık lisanslı araç ya da varlık deneme; dev ortamına yayın; daha önce konmuş ölçütlere dayanan, geri alınabilir tasarım ayrıntısı.
- **Proje sahibine sorulur** ({{VEKIL}} götürür): para; elle indirilecek bağlantı; sır; veri silme; dışarıya gönderme; geri dönüşü zor karar; duyuru ve erişim açma; hukuki metin; son görsel ve tasarım onayı.
- **Canlıya çıkış** bu projede {{CANLI_METNI}}

### Ortak bellek depodur
- `docs/DURUM.md`: güncel durum ve **Devir notu**. Bu dosyayı yalnız {{LIDER}} yazar. {{GELISTIRICI}} devir notunu kendi görev dosyasına, {{VEKIL}} `yerel/vekil/rapor.md` dosyasına yazar. Böylece oturumlar birbirinin notunu ezmez.
- `docs/kararlar/NNNN-ad.md`: numaralı karar kayıtları. Verilmiş karar yeniden tartışılmaz; değişecekse yeni kayıt yazılır.
- `docs/gorevler/NNNN-ad.md`: görev, rapor, {{GELISTIRICI}} devir notu ve inceleme aynı dosyada. Görev sürerken dosyaya {{GELISTIRICI}} kendi dalında yazar; {{LIDER}} "İnceleme" bölümünü dalı birleştirirken ya da birleştirdikten sonra yazar.
- `docs/olaylar.md`: olaylar, dersler, önlemler. {{LIDER}} yazar; olayı gören oturum {{LIDER}} oturumuna bildirir.
- `docs/ekip/geriye-bakis.md`: haftalık geriye bakış. {{LIDER}} yazar; {{VEKIL}} ve proje sahibi görüş verir.
- `yerel/`: depoya girmeyen, bu makineye ait geçici dosyalar ({{VEKIL}} raporu ve devir notu `yerel/vekil/rapor.md`, mola kaydı `yerel/mola.json`, canlı onayı `yerel/canli-onay.json`). Kalıcı olması gereken her şey depoya yazılır.
- Oturum hafızasına ve sohbet geçmişine güvenilmez. Bilinmesi gereken her şey depoya yazılır.

### Oturum başı
`git log -5`, `docs/DURUM.md`, kendi devir notun ({{LIDER}}: `docs/DURUM.md`; {{GELISTIRICI}}: görev dosyası; {{VEKIL}}: `yerel/vekil/rapor.md`) ve işe dokunan karar kaydı okunur. Sonra devir notundaki adımdan devam edilir.

### Bağlam temizliği
Her büyük görev bitince ya da bir saatten uzun aradan önce: kendi devir notu → depodaki dosyayı commit → `/clear`. Temizlenen oturum "Oturum başı" adımıyla açılır. Rol istemi `docs/ekip/ilk-mesajlar.md` dosyasından kopyalanır.

### Mola
- "Mola ver" denince bütün oturumlar kayıpsız durur (hedef: yaklaşık 5 dakika): uzun süreçler durdurulur, herkes kendi devir notunu yazar, yarım iş "yarım" diye commit edilir.
- {{LIDER}} `node araclar/mola.mjs` çalıştırır. Çıkış 0 ise {{VEKIL}} oturumuna "güvende" ve tek satır durum yazar; {{VEKIL}} bunu proje sahibine iletir.
- Yayın yarıda kesilmez: ya biter ya önceki sürüme dönülür.
- "Mola bitti" denince {{LIDER}} `node araclar/mola.mjs bitti` çalıştırır; herkes kendi devir notundan devam eder.

### Bağımsız göz
Görsel ya da tasarım kabulünden ve "bitti" demeden önce {{LIDER}}, yorumsuz bir alt ajana yalnız malzemeyi verir: görüntüler, ölçütler, adsız A/B. Kendi sonucunu vermez. İstem: `docs/ekip/bagimsiz-goz.md`.
Betikle ya da testle ölçülebilen şey önce öyle ölçülür; göz, ölçülemeyene bakar. Canlıya çıkış ve geri dönüşü zor kararda göz mümkünse farklı bir modelle çalıştırılır: aynı model aynı kör noktayı paylaşır.

### Yayın
- `main`e giren iş önce dev ortamına gider; testler orada koşar; aynı derleme canlıya yükseltilir, yeniden derlenmez. İki ortamda da sürüm rozeti görünür.
- Canlıya yükseltmeden hemen önce `node araclar/canli.mjs denetle <yayımlanacak commit>` çalışır; çıkış 0 değilse canlıya çıkılmaz. Yayın bitince `node araclar/canli.mjs kullan`.
- Yayın denenmeden bitmez: gerçek ortamda tur atılır, görüntü alınır, bağımsız göz bakar.

### Sır
- Sır dosyaları yalnız araçlarca okunur. İçerik gösteren komut (`cat`, `head`, `grep`, `less`) kullanılmaz; yalnız `wc -c` ya da `test -s` ile yoklanır.
- Sır kullanıcıdan `read -s` ile alınır; sohbete yazdırılmaz.
- Sızıntı olursa hemen bildirilir, sır yenilenir, `docs/olaylar.md` dosyasına yazılır.

### Doğrulama
- Kanıtsız "çalıştı" yok. Her iddianın yanında kayıt, görüntü ya da sayı durur.
- Proje sahibinin "girdim", "gördüm" gibi sözü de kayıtla doğrulanmadan aktarılmaz (hangi ortam, hangi sürüm).
- Sonuç görüntüde ne görünüyorsa o yazılır; bir derece bile iyimser anlatılmaz.

### Kota
- Pahalı incelemeler {{LIDER}} oturumundaki alt ajanlarda yapılır. {{GELISTIRICI}} yalnız kod yazar.
- Tam test birleştirmeden sonra bir kez koşar.
- Aynı klasörde iki test koşusu olmaz.

### Rapor biçimi
- {{VEKIL}} → proje sahibi: Durum (tek satır) / Bitenler (görüntüyle) / Vekil kararları / Senden beklenen / Risk. Telefonda iki dakikada okunacak uzunlukta. Şablon: `docs/ekip/vekil-rapor.md`.
- {{LIDER}} → {{VEKIL}}: Durum / Bitenler (kanıtla) / Vekil kararı gereken / Proje sahibine gidecek / Risk. Metni `docs/ekip/ilk-mesajlar.md` içindedir.
