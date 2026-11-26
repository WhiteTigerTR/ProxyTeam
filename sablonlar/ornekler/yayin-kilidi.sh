#!/usr/bin/env bash
# TR: ÖRNEK: Yayın betiğinizin başına konacak kilit. Mola denetimi (araclar/mola.mjs) bu dosyayı görürse
# "yayın sürüyor" der ve molayı geciktirir; yayın yarıda kesilmez.
# Kilit biçimi: "pid=<sayı> surum=<commit> zaman=<ISO>". Betik bitince (başarılı ya da değil) kilit silinir.
#
# EN: EXAMPLE: a lock to put at the top of your deploy script. If the break check (araclar/mola.mjs) sees this file
# it reports "yayın sürüyor" (deploy in progress) and holds the break back; a deploy is never cut off halfway.
# Lock format: "pid=<number> surum=<commit> zaman=<ISO>". The lock is removed when the script exits, whether it succeeded or not.
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
# EN: Version badge: pass the version and the environment to the build and show them in a corner of the page.
# Example: SURUM="$SURUM" ORTAM=dev npm run build
echo "Yayın başlıyor: $SURUM"

# ... yayın adımlarınız burada ...
# 1. dev ortamına yükle, testleri orada koş
# 2. canlı kapısı: yetki proje sahibindeyse onayı olmadan buradan öteye geçilmez
#      node "$KOK/araclar/canli.mjs" denetle "$(git rev-parse HEAD)"   # yayımlanan derlemenin commit'i
# 3. testler geçerse AYNI derlemeyi canlıya yükselt (yeniden derleme yok)
#      node "$KOK/araclar/canli.mjs" kullan
# 4. canlıda sürüm rozetini denetle: curl -fsS https://ornek.com/surum | grep "$SURUM"
#
# EN: ... your deploy steps go here ...
# 1. deploy to the dev environment and run the tests there
# 2. production gate: if the owner holds the authority, nothing goes past this point without their approval
#      node "$KOK/araclar/canli.mjs" denetle "$(git rev-parse HEAD)"   # the commit of the build being deployed
# 3. if the tests pass, promote THE SAME build to production (no rebuild)
#      node "$KOK/araclar/canli.mjs" kullan
# 4. check the version badge in production: curl -fsS https://ornek.com/surum | grep "$SURUM"

echo "Yayın bitti: $SURUM"
