# Hat mesajları — 10 Mart 2026

Gerçek projede bu mesajlar oturumlar arasında gider, dosyaya yazılmaz; burada örnek olsun diye duruyor.
Her mesajın ilk sözcüğü büyük harfle bir etikettir. Okuyan, yanıt bekleyeni (`SORU`) ve önceki bir sözü geri alanı (`DÜZELTME`) hemen ayırır.

## Durum tablosu (vekil sorar, lider yanıtlar)

Vekil:

```
Durum tablosu ver: her açık iş için iş, yüzde, kalan süre ve bu tahminin dayanağı; ardından sonraki üç iş.
gelistirici satırını kendin doldurma; ona sor ve kendi sözünü yaz.
```

Lider:

```
BİLGİ
| İş | Kimde | Yüzde | Kalan süre | Dayanak | Tahmin kimin |
|---|---|---|---|---|---|
| 0012 düzeltme turu | gelistirici | %80 | ~1 sa | Gün hesabı düzeltildi, 9 test geçiyor; gece yarısı sınırı için 2 test yazılıyor, koşulmadı. | gelistirici, kendi sözü |
| 0012 inceleme, tur 2 | lider | %0 | ~30 dk | Rapor gelmeden başlamaz; kod incelemesi ve bağımsız göz yapılacak. | lider |
Lider görüşü: 1 saate tam koşu dahil değil; 84 testlik koşu ~20 dk sürüyor. Düzeltme turu için ~1,5 sa bekliyorum.
Sonraki üç iş: 1) 0012 dev'de tur 2) canlı onayı için rapor 3) kütüphaneciye özet rapor görevinin tanımı
```

## DÜZELTME (lider → vekil)

```
DÜZELTME: Önceki mesajda 0012 için "görüntü ölçütlere uyuyor, kabule yakın" demiştim. Yanlıştı.
Bağımsız göz görüntüde gecikmeyi "2 gün" buldu; test verisine göre 3 olmalı.
Neden: gün farkı sunucu saatiyle hesaplanıyor. Sonuç kabul değil, düzeltme turu.
```

## SORU (lider → vekil) ve karar

```
SORU: 0012 tur 2'de uzun kitap adı telefonda iki satıra taşıyor; okunuyor ama hizası bozuk. İki seçenek var.
A) Adı 40 karakterde kes: hiza düzelir, uzun adın sonu görünmez.
B) Olduğu gibi birleştir, ayrı görev aç: yayın beklemez, kusur bu haliyle canlıya çıkar.
Önerim B. Kararın?
```

Vekil:

```
Vekil kararı: B. Geri alınabilir, yayını bekletmiyor. Kusuru rapora risk olarak yazıyorum; görevi aç.
```
