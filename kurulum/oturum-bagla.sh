#!/usr/bin/env bash
# VekilEkip: çok hesaplı düzende oturumları birbirine gösterir. İSTEĞE BAĞLI.
#
# Ne yapar: Claude Code her açık oturum için yapılandırma klasöründe bir kayıt tutar
# (<klasör>/sessions/<pid>.json ve <pid>.key). Bu betik canlı oturumların kayıtlarını öbür klasörlere
# hard link ile bağlar. Böylece bir hesabın oturumu öbür hesabın oturumlarını listede görür ve mesaj gönderebilir.
#
# UYARI: Bu, Claude Code'un belgelenmemiş bir iç yapısına dayanır. Bir sürüm güncellemesiyle bozulabilir.
# Bozulursa yöntemin geri kalanı çalışmaya devam eder: oturumlar arası iş depodaki dosyalarla yürür.
# Tek hesap kullanıyorsanız bu betiğe gerek yoktur.
#
# Kullanım:
#   bash oturum-bagla.sh ~/.claude ~/.claude-k2 [başka klasör ...]
#   bash oturum-bagla.sh --dene ~/.claude ~/.claude-k2      # yalnız ne yapacağını yazar
#
# Her yeni oturum açıldıktan sonra bir kez çalıştırılır. Yan etkisi yalnız sessions/ klasörlerindedir;
# tekrar çalıştırılabilir. Temizlik yalnız bu betiğin kurduğu ve süreci ölmüş bağları siler.
set -euo pipefail

DENE=0
if [ "${1:-}" = "--dene" ]; then DENE=1; shift; fi
if [ "$#" -lt 2 ]; then
  echo "Kullanım: bash $(basename "$0") [--dene] <yapılandırma-klasörü> <yapılandırma-klasörü> [...]" >&2
  exit 2
fi

yap() {
  if [ "$DENE" = 1 ]; then echo "(deneme) $*"; else "$@"; fi
}

KLASORLER=()
for k in "$@"; do
  k="${k%/}"
  if [ ! -d "$k" ]; then
    echo "Hata: yapılandırma klasörü yok: $k" >&2
    exit 1
  fi
  yap mkdir -p "$k/sessions"
  KLASORLER+=("$k/sessions")
done

pid_yasiyor() {
  case "$1" in '' | *[!0-9]*) return 1 ;; esac
  kill -0 "$1" 2>/dev/null
}

# Bu betiğin kurduğu bağlar her klasörde bir listede tutulur (sessions/.vekilekip-baglar).
# Temizlik yalnız bu listedeki ve süreci ölmüş kayıtları siler; Claude Code'un kendi kayıtlarına dokunmaz.
LISTE=".vekilekip-baglar"

temizle() {
  local d="$1" satir pid kalan=""
  [ -f "$d/$LISTE" ] || return 0
  while IFS= read -r satir || [ -n "$satir" ]; do
    [ -n "$satir" ] || continue
    case "$satir" in */* | .*) continue ;; esac # yalnız düz dosya adı
    pid="${satir%%.*}"
    if pid_yasiyor "$pid" && [ -e "$d/$satir" ]; then
      kalan="$kalan$satir"$'\n'
    elif [ -e "$d/$satir" ]; then
      yap rm -f "$d/$satir"
    fi
  done <"$d/$LISTE"
  if [ "$DENE" = 0 ]; then printf '%s' "$kalan" >"$d/$LISTE"; fi
}

# Kaynaktaki canlı kayıtları hedefe hard link olarak bağlar.
bagla() {
  local f n pid
  for f in "$1"/*.json "$1"/*.key; do
    [ -e "$f" ] || continue
    n="$(basename "$f")"; pid="${n%%.*}"
    pid_yasiyor "$pid" || continue
    if [ -e "$2/$n" ] && [ "$f" -ef "$2/$n" ]; then continue; fi
    if [ -e "$2/$n" ]; then
      echo "Atlandı: $2/$n başka bir kayıt (aynı PID adı); dokunulmadı" >&2
      continue
    fi
    yap ln "$f" "$2/$n"
    if [ "$DENE" = 0 ]; then echo "$n" >>"$2/$LISTE"; fi
  done
}

for a in "${KLASORLER[@]}"; do temizle "$a"; done
for a in "${KLASORLER[@]}"; do
  for b in "${KLASORLER[@]}"; do
    [ "$a" = "$b" ] && continue
    bagla "$a" "$b"
  done
done

echo "Canlı oturumlar (${KLASORLER[0]}):"
for f in "${KLASORLER[0]}"/*.json; do
  [ -e "$f" ] || continue
  n="$(basename "$f")"; pid_yasiyor "${n%%.*}" || continue
  if command -v node >/dev/null 2>&1; then
    node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(`  ${d.name ?? "(adsız)"} ${d.status ?? ""} (pid ${d.pid ?? "?"})`)' "$f" 2>/dev/null || echo "  $(basename "$f")"
  else
    echo "  $(basename "$f")"
  fi
done
