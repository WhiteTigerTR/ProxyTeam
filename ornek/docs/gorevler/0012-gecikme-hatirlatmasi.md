# Görev 0012 — Gecikme hatırlatması

**Veren:** lider · **Yapan:** gelistirici · **Tarih:** 2026-03-10
**Dal:** `is/0012-gecikme-hatirlatmasi` · **Çalışma kopyası:** `../odunc-0012` (git worktree)
**İlgili kararlar:** 0002, 0004

## Görev
İade tarihi geçen her ödünç için üyeye günde bir kez hatırlatma e-postası gönder. E-postada kitabın adı ve gecikme gün sayısı yazsın.

## Kabul ölçütleri
- [x] İade tarihi geçmemiş ödünce e-posta gitmez.
- [x] Aynı ödünç için aynı gün ikinci e-posta gitmez.
- [x] İade edilen kitap için e-posta gitmez.
- [x] Birim testleri yazıldı ve geçiyor.
- [x] E-postanın görüntüsü alındı (telefon genişliğinde).

## Kapsam dışı
SMS (karar 0004). Kütüphaneciye özet rapor (ayrı görev).

## Bakılacak dosyalar
- `odunc/model.py`, `bildirim/eposta.py`

---

## Rapor (gelistirici yazar)

### Tur 1
- **Yapılan:** `bildirim/gecikme.py` eklendi; günlük iş `gorevler/gunluk.py` içine bağlandı.
- **Kanıt:** 9 birim testi geçti (`test_gecikme.py`). Görüntü: `kanit/0012/eposta-tur1.png`.
- **Yapılmayan / bilinen kusur:** yok.
- **Commit:** `3f1c9a2`

### Tur 2
- **Yapılan:** Gecikme gün sayısı üyenin saat dilimine göre hesaplanıyor. Gece yarısı sınırı için 2 test eklendi.
- **Kanıt:** 11 birim testi geçti. Görüntü: `kanit/0012/eposta-tur2.png` (gecikme "3 gün", beklenen 3).
- **Yapılmayan / bilinen kusur:** Çok uzun kitap adı telefonda iki satıra taşıyor; okunuyor ama hizası bozuk.
- **Commit:** `8b2e417`

---

## Devir notu (gelistirici yazar; mola ya da `/clear` öncesi)
- **Ne yapılıyordu:** Görev bitti, inceleme bekliyor.
- **Yarım dosyalar:** yok.
- **Denenip işe yaramayan:** Gün farkını sunucu saatiyle hesaplamak (tur 1'deki hata buydu).
- **Sıradaki somut adım:** Liderden sonuç gelene kadar bekle.

---

## İnceleme (lider yazar)

### Tur 1
- **Kod incelemesi:** Alt ajan iki bulgu verdi: (1) gün farkı sunucu saatiyle hesaplanıyor, (2) test verisinde gece yarısı sınırı yok.
- **Bağımsız göz:** Malzeme: `eposta-tur1.png`, kabul ölçütleri, rapordaki "bilinen kusur: yok" cümlesi. Yanıt: "Düzeltme gerekli: görüntüde gecikme '2 gün' yazıyor, test verisine göre 3 olmalı. Anlatılan sonuç görüntüyle uyuşmuyor." Emin olma derecesi: yüksek.
- **Benim sonucumla fark:** Ben görüntüye bakıp kabul etmeye yakındım; sayıyı ölçütle karşılaştırmamıştım. Fark vekile bildirildi.
- **Sonuç:** düzeltme turu.

### Tur 2
- **Kod incelemesi:** İki bulgu da kapandı.
- **Bağımsız göz:** Yeni alt ajan, `eposta-tur2.png`. Yanıt: "Kabul edilebilir. Uzun başlıkta hiza kusuru var; raporda da yazıyor."
- **Sonuç:** birleştirildi. Hiza kusuru için görev 0015 açıldı.
- **Birleştirme commit'i:** `c40d7e9`

---

## Ölçüm (lider yazar; görev kapanırken, bir dakika)
- **Açılış / kapanış:** 2026-03-10 09:40 / 2026-03-11 16:10
- **Tur sayısı:** 2
- **Yakalanan hata:** gecikme gün sayısı yanlış (2 yerine 3 olmalıydı); bağımsız göz, birleştirmeden önce
- **Proje sahibine gidilen:** 1 kez (SMS için para kararı)
- **Tek oturumla tahmini süre:** yazılmadı
