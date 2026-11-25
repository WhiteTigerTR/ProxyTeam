#!/usr/bin/env bash
# ÖRNEK: Yayın betiğinizin başına konacak kilit. Mola denetimi (araclar/mola.mjs) bu dosyayı görürse
# "yayın sürüyor" der ve molayı geciktirir; yayın yarıda kesilmez.
# Kilit biçimi: "pid=<sayı> surum=<commit> zaman=<ISO>". Betik bitince (başarılı ya da değil) kilit silinir.
set -euo pipefail

KOK="$(git rev-parse --show-toplevel)"
KILIT="$KOK/yerel/yayin.kilit"
mkdir -p "$(dirname "$KILIT")"

if [ -e "$KILIT" ]; then
  echo "Başka bir yayın sürüyor ya da yarıda kalmış: $KILIT" >&2
  echo "İçerik: $(tr -d '\n' <"$KILIT")" >&2
  exit 1
fi

SURUM="$(git rev-parse --short HEAD)"
printf 'pid=%s surum=%s zaman=%s\n' "$$" "$SURUM" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$KILIT"
trap 'rm -f "$KILIT"' EXIT

# Sürüm rozeti: derlemeye sürümü ve ortamı verin; sayfanın bir köşesinde görünsün.
# Örnek: SURUM="$SURUM" ORTAM=dev npm run build
echo "Yayın başlıyor: $SURUM"

# ... yayın adımlarınız burada ...
# 1. dev ortamına yükle, testleri orada koş
# 2. canlı kapısı: yetki proje sahibindeyse onayı olmadan buradan öteye geçilmez
#      node "$KOK/araclar/canli.mjs" denetle "$(git rev-parse HEAD)"   # yayımlanan derlemenin commit'i
# 3. testler geçerse AYNI derlemeyi canlıya yükselt (yeniden derleme yok)
#      node "$KOK/araclar/canli.mjs" kullan
# 4. canlıda sürüm rozetini denetle: curl -fsS https://ornek.com/surum | grep "$SURUM"

echo "Yayın bitti: $SURUM"
