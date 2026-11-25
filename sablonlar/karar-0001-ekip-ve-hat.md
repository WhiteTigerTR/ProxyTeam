# 0001 — Ekip ve hat (VekilEkip yöntemi)

**Durum:** Geçerli · {{TARIH}} · proje sahibinin kararı
**Dayanak:** yok (ilk kayıt)
**Değiştirdiği:** yok

## Karar
1. **Hat.** Proje sahibi → {{VEKIL}} → {{LIDER}} → {{GELISTIRICI}}. Proje sahibi görüşünü {{VEKIL}} oturumuna söyler.
   {{VEKIL}} yalnız {{LIDER}} oturumuna yazar. {{LIDER}} {{GELISTIRICI}} oturumuna görev verir ve raporunu {{VEKIL}} oturumuna gönderir.
   Proje sahibi doğrudan yazarsa o geçerlidir; {{LIDER}} bunu {{VEKIL}} oturumuna bildirir.
2. **Vekil yetkisi.** Ayrıntı CLAUDE.md "Ekip ve hat" bölümündedir. Her vekil kararı kayda "vekil kararı" diye girer.
   Canlıya çıkış kararı: `.vekilekip.json` → `canli.yetki` (kurulumda "{{CANLI_YETKI}}" seçildi; "sahip" = proje sahibi, "vekil" = {{VEKIL}}).
3. **Ortak bellek depodur.** `docs/DURUM.md`, `docs/kararlar/`, `docs/gorevler/`, `docs/olaylar.md`. Her dosyanın tek yazarı vardır.
4. **Mola.** "Mola ver" ile bütün oturumlar kayıpsız durur; denetim `node araclar/mola.mjs`.
5. **Bağımsız göz.** Kabulden ve "bitti" demeden önce yorumsuz alt ajan bakar.
6. **Hesap düzeni.** {{HESAP_OZETI}}

## Geri dönüş
Yöntem her an bırakılabilir; dosyalar depoda kalır. Değişiklik yeni karar kaydıyla yapılır.
