# Ölçüm günlüğü

Bu yöntemin tek oturumla çalışan bir insana göre neye mal olduğu ve ne kazandırdığı henüz bilinmiyor.
Bu sayfa o sorunun yanıtını biriktirir. **İlk ölçüm girişi 4 Aralık 2026 Cuma günü, sonraki üç giriş izleyen üç cuma (11, 18 ve 25 Aralık 2026) yayımlanır.**
Ölçüm bu dört girişle, yaklaşık bir ayda tamamlanır; son girişte sonuç özetlenir.

English: the first measurement entry is published on Friday 4 December 2026, and the next three on the following
Fridays (11, 18 and 25 December 2026). The measurement ends with those four entries, about one month; the last entry sums up the result. The question it
tries to answer: what does this way of working cost, and what does it gain, compared with one person working in a
single session?

## Nasıl ölçülüyor

- Her görev dosyasının sonundaki "Ölçüm" bölümü: süre, tur sayısı, yakalanan hata ve aşaması, proje sahibine giden kararlar.
- `araclar/olcum.py`: oturum kayıtlarından rol başına token, mesaj, alt ajan çağrısı ve tahmini etkin süre; git geçmişinden commit sayıları.
- Projeler kod adıyla anılır. Mesaj metni, ad ya da dosya içeriği buraya girmez.
- Tahmin olan her sayı "tahmin" diye işaretlenir. Ölçülemeyen şey "ölçülmedi" diye yazılır; boş bırakılmaz, uydurulmaz.

## Giriş şablonu

```
### GG.AA.YYYY · dönem: GG.AA – GG.AA (N iş günü)

| Ölçü | Proje A | Proje B | Not |
|---|---|---|---|
| Kapanan görev | | | görev dosyalarından |
| İlk turda kabul edilen görev | | | tur sayısı 1 olanlar |
| Yakalanan hata: plan / inceleme / bağımsız göz / canlı | | | aşamaya göre |
| Proje sahibine giden karar | | | |
| Token: çıktı / önbellek yazma / önbellek okuma | | | olcum.py, üç rol toplamı |
| Proje sahibinin etkin süresi (tahmin) | | | olcum.py; yalnız mesaj yazılan süre |
| Tek oturumla karşılaştırma | | | yapıldıysa: hangi iş, hangi sonuç |

Gözlem (ölçüm değil): ...
Bu dönemde ölçümde değişen tanım ya da düzeltilen hata: ...
```

## Girişler

### 25.11.2026 · başlangıç

Sayı yok; bu giriş başlangıç çizgisidir.

- Yöntem iki projede, tek kişi tarafından, birkaç gündür kullanılıyor. Kurulurken ölçmek akılda yoktu.
- Kayıtlardan geriye dönük ölçme denendi. Zamana dayalı ölçüler tanımlara çok bağlı çıktı: alt ajan kayıtlarının sayılıp sayılmaması,
  uzun süren araç çağrıları ve yapıştırılan rol istemleri sonucu belirgin biçimde değiştirdi. Bu yüzden o sayılar burada yayımlanmıyor;
  ölçüm aracındaki ilgili hatalar düzeltildi.
- Bugünden itibaren görev dosyalarında "Ölçüm" bölümü tutuluyor.
- Gözlem (ölçüm değil): kesintiler azaldı, kararlar kayda geçti, işler daha düzenli ve daha hızlı ilerledi.
- Token maliyetinin tek oturuma göre fazla mı az mı olduğu bilinmiyor.

Takvim: 04.12.2026 Cuma (ilk ölçüm), 11.12.2026, 18.12.2026, 25.12.2026.
