# Değişiklikler

[English](CHANGELOG.en.md) · Türkçe

Kitte neyin değiştiğini ve kiti daha önce kurmuş bir projede ne yapmanız gerektiğini yazar. En yeni giriş en üsttedir.
`kur.sh` yeniden çalıştırılabilir: var olan dosyaya dokunmaz, değişen her dosyanın yenisini `.yeni` olarak bırakır.

## 27.11.2026

| Değişiklik | Kurulu projede ne yapmalı |
|---|---|
| Kurulum belgelerine "kiti indir" adımı eklendi; örneklerdeki yol `~/ProxyTeam` oldu. | Bir şey gerekmez. |
| Ölçüm günlüğü: her giriş hangi araç sürümüyle ölçüldüğünü yazar; sayılar olduğu gibi yayımlanır. | Kendi ölçümünüzü yayımlıyorsanız girişe kitin commit kimliğini yazın. |
| Bu dosya ve iki dildeki belgelerin eşliğini denetleyen test eklendi. | Bir şey gerekmez. |
| Karşılama sayfasına "içinde ne var" tablosu eklendi; kılavuzun özet listesine ölçüm maddesi girdi; raporun "iki dakikada okunması" hedef olarak yazıldı. | Bir şey gerekmez. |
| Karşılama sayfasındaki mola satırı düzeltildi: betik "yarım iş kalmadığını" değil, kaydedilmemiş iş ve çalışan süreç kalmadığını doğrular. Örnek klasörüne etiketli mesaj ve durum tablosu örneği eklendi (`ornek/mesajlar.md`). | Bir şey gerekmez. |

## 26.11.2026

| Değişiklik | Kurulu projede ne yapmalı |
|---|---|
| `araclar/olcum.py`: oturum çalışırken gelen mesajlar sayılıyor; iznini proje sahibinin verdiği araç çağrılarının süresi çalışma sayılmıyor (`izin_bekleme_dakika`); kesinti satırı mesaj sayılmıyor; adı `_` ile başlayan dosyalar görev ve karar sayılmıyor; etiket mesajın başında da tanınıyor, yalnız büyük harfle. | Yeni `olcum.py` dosyasını alın. **Eski araçla alınmış sayılar yenisiyle karşılaştırılamaz**; gerekiyorsa eski dönemi yeni araçla yeniden ölçün. |
| Mola sırası değişti: önce denetim ve çıktısı vekile, sonra engeller ve devir notu, sonra yeniden denetim; vekil kaydı kendisi doğrular. | `CLAUDE.md` içindeki "Ekip ve hat" bölümünü ve `docs/ekip/ilk-mesajlar.md` dosyasını **birlikte** güncelleyin; yalnız biri güncellenirse oturumlar çelişen talimat alır. |
| Rapor etiketleri (`RAPOR`, `SORU`, `BİLGİ`, `DÜZELTME`) ve karar kalıpları rol metinlerine girdi. | Aynı iki dosyayla gelir. Etiket kullanılmayan projede ölçümün etiket sayıları 0 çıkar. |
| Yeni kurallar: yeni kişisel veri toplayan değişiklik proje sahibine gider; vekil ve lider aynı hesaptaysa lider büyük alt ajan dalgasından önce vekile sorar. Durum tablosu için hazır metin. | Aynı iki dosyayla gelir. |
| Commit konusu kuralı şablona yazıldı ("Birleştirme…", "canlıya yükseltme"). | İsteğe bağlı. Kullanılmazsa ölçümde bu iki sayı 0 çıkar. |
| `kur.sh`, `.gitignore` dosyasına `__pycache__/` satırını da yazar. | `.gitignore` dosyanıza `__pycache__/` ekleyin; yoksa ölçüm testinden sonra mola engellenir. |
| Rol kancası onay cümlesini içeren kabuk komutunu durdurur; sır kancasının komut listesi genişledi; yayın kilidi tek adımda alınır. | Bu örnek dosyaları kopyaladıysanız yeniden kopyalayın. Kopyalamadıysanız etkisi yok. |
| Belgeler ve kod açıklamaları iki dilli oldu. `README.md` karşılama sayfası; kılavuz `KILAVUZ.md` ve `GUIDE.en.md`. | Bir şey gerekmez. |

## 25.11.2026

İlk yayın. Asıl kite göre eklenenler: canlıya çıkış kapısı (`araclar/canli.mjs`), ölçüm aracı, devir notu denetimi, tek yazar kuralı, rol ve onay kancası örnekleri.

| Değişiklik | Kurulu projede ne yapmalı |
|---|---|
| `.vekilekip.json` dosyasına yeni alanlar geldi (`devirNotu`, `canli`). | **Önce `araclar/mola.mjs` dosyasını güncelleyin, sonra ayar dosyasını.** Eski `mola.mjs` bilinmeyen alanı reddeder ve mola denetimi çalışmaz. |
| Canlıya çıkış ayrı bir ayar oldu (`canli.yetki`, varsayılan `sahip`). | Vekilin canlıya çıktığı projede `canli.yetki: "vekil"` seçin; yoksa yayın akışı onay bekler. |
| `docs/DURUM.md` dosyasını yalnız lider yazar; geliştiricinin devir notu görev dosyasında, vekilinki `yerel/vekil/rapor.md` dosyasında. | `CLAUDE.md` bölümünü ve `docs/ekip/ilk-mesajlar.md` dosyasını birlikte güncelleyin; lidere bir kez söyleyin. |
