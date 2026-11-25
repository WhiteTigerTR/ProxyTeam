# Durum

Son güncelleme: 2026-03-11

Bu dosyayı yalnız lider yazar. gelistirici devir notunu kendi görev dosyasına, vekil `yerel/vekil/rapor.md` dosyasına yazar.

## Neredeyiz
Ödünç ve iade akışı canlıda. Gecikme hatırlatması (0012) birleştirildi ve dev ortamında; canlıya çıkış proje sahibinin onayını bekliyor.

## Sürmekte olan
| Görev | Kimde | Dal / kopya | Durum |
|---|---|---|---|
| 0012 gecikme hatırlatması | lider | `main` | dev'de, canlı onayı bekliyor |
| 0015 uzun başlık hizası | gelistirici | `is/0015-baslik-hizasi` | sürüyor |

## Sıradaki adımlar
1. Proje sahibi onaylarsa 0012'yi canlıya yükselt, tur at, görüntü al.
2. 0015 raporunu incele.

## Ortamlar
| Ortam | Sürüm | Son yayın | Not |
|---|---|---|---|
| dev | `c40d7e9` | 2026-03-11 | 0012 dahil; tam test geçti (84 test) |
| canlı | `a91b3d0` | 2026-03-08 | 0012 yok |

## Devir notu
lider durmadan, `/clear` öncesi ya da molada burayı günceller ve commit eder.

- **Ne yapılıyordu:** 0012 dev'e çıkarıldı, dev'de tur atıldı (görüntüler: `kanit/0012/dev-tur/`).
- **Yarım dosyalar:** yok.
- **Denenip işe yaramayan:** Dev'de e-postayı gerçek adrese göndermek; deneme posta kutusuna yönlendirildi (karar 0003).
- **Sıradaki somut adım:** `node araclar/canli.mjs denetle` çıkış 0 verince canlıya yükselt.
- **Bekleyen onay:** Proje sahibinden `c40d7e9` için canlı onayı.
