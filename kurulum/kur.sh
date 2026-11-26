#!/usr/bin/env bash
# TR: VekilEkip kurulumu. Etkileşimlidir; soruları sırayla sorar.
#
# Çağrı (bash ve zsh'tan aynı):
#   bash ~/ProxyTeam/kurulum/kur.sh
#
# Ne yapar:
#   - Hedef projeye şablonları, mola denetimini ve ayarını kopyalar.
#   - Var olan dosyanın üstüne yazmaz; yeni içeriği <dosya>.yeni olarak bırakır ve söyler.
#   - Kullanıcı dosyalarına (~/.zshrc, ~/.bashrc, ~/.claude*) kendiliğinden dokunmaz. Çok hesap düzeninde
#     takma ad satırlarını gösterir, "ekleyeyim mi?" diye sorar; onay yoksa yalnız ekrana yazar.
#
# EN: VekilEkip (ProxyTeam) installer. Interactive; it asks its questions one by one (in Turkish).
#
# Run it (same from bash and zsh):
#   bash ~/ProxyTeam/kurulum/kur.sh
#
# What it does:
#   - Copies the templates, the break check and its config into the target project.
#   - Never overwrites an existing file; it leaves the new content as <file>.yeni and tells you.
#   - Does not touch your own files (~/.zshrc, ~/.bashrc, ~/.claude*) on its own. In the multi-account setup it
#     shows the alias lines and asks whether to add them; without a yes it only prints them.

# zsh ya da sh ile çalıştırıldıysa bash ile yeniden başlat; "source" ile çağrıldıysa dur.
# EN: If run with zsh or sh, restart under bash; if sourced, stop.
if [ -n "${ZSH_VERSION:-}" ]; then
  case "${ZSH_EVAL_CONTEXT:-}" in *file*) echo "Bu betik source ile değil, 'bash kur.sh' ile çalıştırılır." >&2; return 1 ;; esac
fi
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
if [ "${BASH_SOURCE[0]}" != "$0" ]; then
  echo "Bu betik source ile değil, 'bash kur.sh' ile çalıştırılır." >&2
  return 1
fi

set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
SABLON="$KIT/sablonlar"
TARIH="$(date +%Y-%m-%d)"

OLUSAN=()
YENI=()
ATLANAN=()

# ---- yardımcılar / EN: helpers ----

bilgi() { printf '%s\n' "$*" >&2; }

# sor "Soru" "varsayılan" → yanıtı yazar (boşsa varsayılan). Girdi bitmişse varsayılanı alır.
# EN: sor "Question" "default" → prints the answer (the default if empty). At end of input it takes the default.
sor() {
  local soru="$1" vars="${2:-}" c=""
  if [ -n "$vars" ]; then printf '%s [%s]: ' "$soru" "$vars" >&2; else printf '%s: ' "$soru" >&2; fi
  IFS= read -r c || c=""
  if [ ! -t 0 ]; then printf '%s\n' "$c" >&2; fi
  if [ -z "$c" ]; then c="$vars"; fi
  printf '%s' "$c"
}

# evet_mi "Soru" e|h → 0 evet, 1 hayır.
# EN: evet_mi "Question" e|h → 0 for yes, 1 for no (e = evet/yes, h = hayır/no).
evet_mi() {
  local vars="$2" ipucu c
  if [ "$vars" = "e" ]; then ipucu="E/h"; else ipucu="e/H"; fi
  c="$(sor "$1 ($ipucu)" "")"
  c="$(printf '%s' "${c:-$vars}" | tr '[:upper:]' '[:lower:]')"
  case "$c" in e | evet | y | yes) return 0 ;; *) return 1 ;; esac
}

ad_gecerli() { [[ "$1" =~ ^[a-z0-9][a-z0-9-]{0,30}$ ]]; }
takma_ad_gecerli() { [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$ ]]; }
uzak_gecerli() { [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,40}$ ]]; }
duzen_gecerli() { [ "$1" = 1 ] || [ "$1" = 2 ]; }
sayi_gecerli() { [[ "$1" =~ ^[2-5]$ ]]; }
hesap_no_gecerli() { [[ "$1" =~ ^[1-9]$ ]] && [ "$1" -le "$HESAP_SAYISI" ]; }
klasor_gecerli() { [[ "$1" =~ ^[A-Za-z0-9._/~+-]+$ ]]; }

# Geçerli yanıt gelene kadar sorar; girdi bitmişse ve yanıt geçersizse durur.
# EN: Keeps asking until the answer is valid; gives up if input has ended and the answer is still invalid.
sor_gecerli() {
  local soru="$1" vars="$2" denetci="$3" c deneme=0
  while :; do
    c="$(sor "$soru" "$vars")"
    if "$denetci" "$c"; then printf '%s' "$c"; return 0; fi
    deneme=$((deneme + 1))
    bilgi "  Geçersiz yanıt: '$c'"
    if [ "$deneme" -ge 3 ]; then bilgi "Üç geçersiz yanıt; kurulum durdu."; exit 1; fi
  done
}

# ~/x → $HOME/x (yalnız baştaki ~). / EN: leading ~ only.
genislet() {
  case "$1" in "~") printf '%s' "$HOME" ;; "~/"*) printf '%s' "$HOME/${1#\~/}" ;; *) printf '%s' "$1" ;; esac
}

# $HOME/x → ~/x (gösterim için). / EN: for display.
kisalt() {
  case "$1" in "$HOME") printf '~' ;; "$HOME/"*) printf '~/%s' "${1#"$HOME"/}" ;; *) printf '%s' "$1" ;; esac
}

# Şablondaki {{AD}} yer tutucularını VE_AD ortam değişkeniyle değiştirir (düz metin; özel karakter yorumlanmaz).
# EN: Replaces {{AD}} placeholders in a template with the VE_AD environment variable (plain text; no special characters are interpreted).
doldur() {
  awk 'BEGIN { n = split("VEKIL LIDER GELISTIRICI UZAK TARIH HESAP_TABLOSU HESAP_OZETI KARAR_NO CANLI_YETKI CANLI_METNI", k, " ") }
  {
    satir = $0
    for (i = 1; i <= n; i++) {
      anahtar = "{{" k[i] "}}"; deger = ENVIRON["VE_" k[i]]; cikis = ""
      while ((p = index(satir, anahtar)) > 0) { cikis = cikis substr(satir, 1, p - 1) deger; satir = substr(satir, p + length(anahtar)) }
      satir = cikis satir
    }
    print satir
  }' "$1"
}

# yerlestir <içerik dosyası> <hedef>: hedef yoksa yazar; varsa ve aynıysa atlar; farklıysa <hedef>.yeni yazar.
# EN: yerlestir <content file> <target>: writes the target if missing; skips it if identical; otherwise writes <target>.yeni.
yerlestir() {
  local kaynak="$1" hedef="$2" goreli="${2#"$PROJE"/}"
  mkdir -p "$(dirname "$hedef")"
  if [ ! -e "$hedef" ]; then
    cp "$kaynak" "$hedef"
    OLUSAN+=("$goreli")
  elif cmp -s "$kaynak" "$hedef"; then
    ATLANAN+=("$goreli (aynı)")
  else
    cp "$kaynak" "$hedef.yeni"
    YENI+=("$goreli.yeni")
  fi
}

# sablon_yerlestir <şablon> <hedef>: yer tutucuları doldurup yerleştirir.
# EN: sablon_yerlestir <template> <target>: fills in the placeholders, then places the file.
sablon_yerlestir() {
  local gecici
  gecici="$(mktemp "${TMPDIR:-/tmp}/vekilekip.XXXXXX")"
  doldur "$1" >"$gecici"
  yerlestir "$gecici" "$2"
  rm -f "$gecici"
}

# ---- sorular / EN: questions ----

bilgi ""
bilgi "VekilEkip kurulumu"
bilgi "Proje sahibi → vekil → lider → geliştirici düzenini bir projeye kurar."
bilgi "Var olan dosyalara yazılmaz; çakışanlar .yeni uzantısıyla bırakılır."
bilgi ""

PROJE="$(sor "Hedef proje klasörü" "$PWD")"
PROJE="$(genislet "$PROJE")"
if [ ! -d "$PROJE" ]; then bilgi "Hata: klasör yok: $PROJE"; exit 1; fi
PROJE="$(cd "$PROJE" && pwd -P)"
case "$PROJE/" in "$KIT/"*) bilgi "Hata: hedef, kitin kendi klasörü olamaz."; exit 1 ;; esac

GIT_KOK=""
if GIT_KOK="$(git -C "$PROJE" rev-parse --show-toplevel 2>/dev/null)"; then
  GIT_KOK="$(cd "$GIT_KOK" && pwd -P)"
  if [ "$GIT_KOK" != "$PROJE" ]; then
    bilgi "UYARI: $PROJE deponun kökü değil (kök: $GIT_KOK). Dosyalar yine de bu klasöre yazılır."
  fi
else
  GIT_KOK=""
  bilgi "UYARI: $PROJE bir git deposu değil. Yöntem git'e dayanır: ortak bellek, worktree ve mola denetimi."
  bilgi "       Önce 'git init' yapmanız önerilir."
  if ! evet_mi "Yine de devam edilsin mi?" h; then bilgi "Kurulum durdu."; exit 1; fi
fi

bilgi ""
bilgi "Rol adları (oturum adı olarak da kullanılır; küçük harf, rakam, tire):"
VEKIL="$(sor_gecerli "  Vekil" "vekil" ad_gecerli)"
LIDER="$(sor_gecerli "  Lider" "lider" ad_gecerli)"
GELISTIRICI="$(sor_gecerli "  Geliştirici" "gelistirici" ad_gecerli)"
if [ "$VEKIL" = "$LIDER" ] || [ "$VEKIL" = "$GELISTIRICI" ] || [ "$LIDER" = "$GELISTIRICI" ]; then
  bilgi "Hata: rol adları birbirinden farklı olmalı."; exit 1
fi

bilgi ""
bilgi "Hesap düzeni:"
bilgi "  1) Tek hesap: üç oturum aynı hesapta, ayrı terminal sekmelerinde. Kota tek hesaptan harcanır."
bilgi "  2) Birden çok hesap: her hesap ayrı yapılandırma klasörüyle (CLAUDE_CONFIG_DIR) ve takma adla açılır."
DUZEN="$(sor_gecerli "Seçim (1 ya da 2)" "1" duzen_gecerli)"

HESAP_SAYISI=1
HESAP_ADLARI=()
HESAP_KLASORLERI=()
ROL_HESABI=(1 1 1)
if [ "$DUZEN" = 2 ]; then
  HESAP_SAYISI="$(sor_gecerli "Kaç hesap (2-5)" "2" sayi_gecerli)"
  i=1
  while [ "$i" -le "$HESAP_SAYISI" ]; do
    if [ "$i" = 1 ]; then vk="~/.claude"; else vk="~/.claude-k$i"; fi
    ad="$(sor_gecerli "  Hesap $i takma adı" "claude-$i" takma_ad_gecerli)"
    kl="$(sor_gecerli "  Hesap $i yapılandırma klasörü" "$vk" klasor_gecerli)"
    kl="$(genislet "$kl")"; kl="${kl%/}"
    for onceki in "${HESAP_ADLARI[@]+"${HESAP_ADLARI[@]}"}"; do
      if [ "$onceki" = "$ad" ]; then bilgi "Hata: takma ad iki kez verildi: $ad"; exit 1; fi
    done
    for onceki in "${HESAP_KLASORLERI[@]+"${HESAP_KLASORLERI[@]}"}"; do
      if [ "$onceki" = "$kl" ]; then bilgi "Hata: klasör iki kez verildi: $kl"; exit 1; fi
    done
    HESAP_ADLARI+=("$ad")
    HESAP_KLASORLERI+=("$kl")
    i=$((i + 1))
  done
  bilgi "Hangi rol hangi hesapta açılsın? (1-$HESAP_SAYISI)"
  ROL_HESABI[0]="$(sor_gecerli "  $VEKIL" "1" hesap_no_gecerli)"
  ROL_HESABI[1]="$(sor_gecerli "  $LIDER" "1" hesap_no_gecerli)"
  ROL_HESABI[2]="$(sor_gecerli "  $GELISTIRICI" "2" hesap_no_gecerli)"
fi

UZAK_VARS="origin"
if [ -n "$GIT_KOK" ]; then
  ilk_uzak="$(git -C "$PROJE" remote 2>/dev/null | head -n 1 || true)"
  if [ -n "$ilk_uzak" ]; then UZAK_VARS="$ilk_uzak"; fi
fi
UZAK="$(sor_gecerli "Commit'lerin gönderildiği uzak depo adı" "$UZAK_VARS" uzak_gecerli)"

bilgi ""
bilgi "Canlıya çıkış kararı kimde olsun? (sonradan .vekilekip.json → canli.yetki ile değişir)"
bilgi "  1) Proje sahibi: siz kendi terminalinizde onaylamadan canlıya çıkılmaz. (önerilen)"
bilgi "  2) Vekil: vekil karar verir, karar kaydına yazar. Geri alması kolay, riski düşük projeler için."
CANLI_SECIM="$(sor_gecerli "Seçim (1 ya da 2)" "1" duzen_gecerli)"
if [ "$CANLI_SECIM" = 1 ]; then
  CANLI_YETKI="sahip"
  CANLI_METNI="**proje sahibinin** kararıdır. Proje sahibi kendi terminalinde \`node araclar/canli.mjs onayla\` ile o commit'i onaylar; \`node araclar/canli.mjs denetle\` geçmeden canlıya çıkılmaz. Oturumlar onayı kendileri vermez."
else
  CANLI_YETKI="vekil"
  CANLI_METNI="**$VEKIL** kararıdır: proje sahibi bu projede yetkiyi devretti (\`.vekilekip.json\` → \`canli.yetki\`). Her canlıya çıkış \"vekil kararı\" olarak karar kaydına yazılır ve raporda bildirilir."
fi

# ---- yer tutucular / EN: placeholders ----

ROLLER=("$VEKIL" "$LIDER" "$GELISTIRICI")
if [ "$DUZEN" = 1 ]; then
  TABLO="| Oturum | Hesap | Nasıl açılır |"$'\n'"|---|---|---|"
  for r in "${ROLLER[@]}"; do TABLO="$TABLO"$'\n'"| $r | tek hesap | ayrı terminal sekmesinde \`claude\`, sonra \`/rename $r\` |"; done
  TABLO="$TABLO"$'\n\n'"Tek hesap: kota üç oturum arasında paylaşılır. Oturumlar aynı hesapta olduğu için birbirini doğrudan görür."
  OZET="Tek hesap; üç oturum ayrı sekmelerde. Kota tek hesaptan harcanır."
else
  TABLO="| Oturum | Takma ad | Yapılandırma klasörü |"$'\n'"|---|---|---|"
  for j in 0 1 2; do
    h=$((ROL_HESABI[j] - 1))
    TABLO="$TABLO"$'\n'"| ${ROLLER[j]} | \`${HESAP_ADLARI[h]}\` | \`$(kisalt "${HESAP_KLASORLERI[h]}")\` |"
  done
  bag_arg=""
  for kl in "${HESAP_KLASORLERI[@]}"; do bag_arg="$bag_arg $(kisalt "$kl")"; done
  TABLO="$TABLO"$'\n\n'"Her oturum açıldıktan sonra \`/rename <oturum adı>\` yazılır. Hesaplar birbirinin oturumunu kendiliğinden görmez."
  TABLO="$TABLO İsteğe bağlı bağlama: VekilEkip kitindeki \`bash kurulum/oturum-bagla.sh$bag_arg\` (belgelenmemiş iç yapıya dayanır, bozulabilir; bozulursa iş depodaki dosyalarla sürer)."
  OZET="$HESAP_SAYISI hesap; her biri ayrı yapılandırma klasörü ve takma adla açılır. Oturum bağlama isteğe bağlıdır."
fi

KARAR_DOSYASI=""
for f in "$PROJE"/docs/kararlar/[0-9][0-9][0-9][0-9]-ekip-ve-hat.md; do
  if [ -e "$f" ]; then KARAR_DOSYASI="$f"; break; fi
done
if [ -z "$KARAR_DOSYASI" ]; then
  en_buyuk=0
  for f in "$PROJE"/docs/kararlar/[0-9][0-9][0-9][0-9]-*.md; do
    [ -e "$f" ] || continue
    n="$(basename "$f")"; n="${n%%-*}"; n=$((10#$n))
    if [ "$n" -gt "$en_buyuk" ]; then en_buyuk="$n"; fi
  done
  KARAR_DOSYASI="$PROJE/docs/kararlar/$(printf '%04d' $((en_buyuk + 1)))-ekip-ve-hat.md"
fi
KARAR_NO="$(basename "$KARAR_DOSYASI")"; KARAR_NO="${KARAR_NO%%-*}"

export VE_VEKIL="$VEKIL" VE_LIDER="$LIDER" VE_GELISTIRICI="$GELISTIRICI" VE_UZAK="$UZAK" VE_TARIH="$TARIH"
export VE_HESAP_TABLOSU="$TABLO" VE_HESAP_OZETI="$OZET" VE_KARAR_NO="$KARAR_NO"
export VE_CANLI_YETKI="$CANLI_YETKI" VE_CANLI_METNI="$CANLI_METNI"

# ---- özet ve onay / EN: summary and confirmation ----

bilgi ""
bilgi "Özet:"
bilgi "  Proje:       $PROJE"
bilgi "  Roller:      $VEKIL → $LIDER → $GELISTIRICI"
if [ "$DUZEN" = 1 ]; then
  bilgi "  Hesap:       tek hesap"
else
  i=0
  while [ "$i" -lt "$HESAP_SAYISI" ]; do
    bilgi "  Hesap $((i + 1)):     ${HESAP_ADLARI[i]} → $(kisalt "${HESAP_KLASORLERI[i]}")"
    i=$((i + 1))
  done
fi
bilgi "  Uzak depo:   $UZAK"
bilgi "  Canlı kararı: $([ "$CANLI_YETKI" = sahip ] && printf 'proje sahibi' || printf '%s' "$VEKIL")"
if ! evet_mi "Dosyalar yazılsın mı?" e; then bilgi "Kurulum durdu; hiçbir dosya yazılmadı."; exit 1; fi

# ---- dosyalar / EN: files ----

GECICI="$(mktemp -d "${TMPDIR:-/tmp}/vekilekip.XXXXXX")"
trap 'rm -rf "$GECICI"' EXIT

# CLAUDE.md: yoksa oluşturulur; varsa ve bölüm yoksa eklenmiş hali .yeni olarak bırakılır.
# EN: CLAUDE.md: created if missing; if it exists without the section, a copy with the section added is left as .yeni.
doldur "$SABLON/CLAUDE-ekip.md" >"$GECICI/ekip.md"
if [ ! -e "$PROJE/CLAUDE.md" ]; then
  { printf '# %s\n\nBu dosyayı Claude Code her oturumda okur. Projenin kendi kurallarını buraya ekleyin.\n\n' "$(basename "$PROJE")"; cat "$GECICI/ekip.md"; } >"$PROJE/CLAUDE.md"
  OLUSAN+=("CLAUDE.md")
elif grep -q '^## Ekip ve hat' "$PROJE/CLAUDE.md"; then
  # Bölüm zaten var: var olan dosyaya dokunmadan, bölümü yenisiyle değiştirilmiş halini hazırla.
  # EN: The section is already there: leave the file alone and prepare a copy with the section replaced by the new one.
  # Bölüm, "## Ekip ve hat" satırından bir sonraki "## " başlığına (ya da dosya sonuna) kadardır.
  awk -v yeni="$GECICI/ekip.md" '
    /^## Ekip ve hat/ && !oldu { while ((getline s < yeni) > 0) print s; atla = 1; oldu = 1; next }
    atla && /^## / { atla = 0; print "" }
    !atla { print }' "$PROJE/CLAUDE.md" >"$GECICI/claude.yeni"
  if cmp -s "$GECICI/claude.yeni" "$PROJE/CLAUDE.md"; then
    ATLANAN+=("CLAUDE.md (\"Ekip ve hat\" bölümü güncel)")
  else
    cp "$GECICI/claude.yeni" "$PROJE/CLAUDE.md.yeni"
    YENI+=("CLAUDE.md.yeni (var olan CLAUDE.md, \"Ekip ve hat\" bölümü güncellenmiş)")
  fi
else
  { cat "$PROJE/CLAUDE.md"; printf '\n'; cat "$GECICI/ekip.md"; } >"$PROJE/CLAUDE.md.yeni"
  YENI+=("CLAUDE.md.yeni (var olan CLAUDE.md + \"Ekip ve hat\" bölümü)")
fi

sablon_yerlestir "$SABLON/DURUM.md" "$PROJE/docs/DURUM.md"
sablon_yerlestir "$SABLON/karar-0001-ekip-ve-hat.md" "$KARAR_DOSYASI"
sablon_yerlestir "$SABLON/karar.md" "$PROJE/docs/kararlar/_sablon.md"
sablon_yerlestir "$SABLON/gorev.md" "$PROJE/docs/gorevler/_sablon.md"
sablon_yerlestir "$SABLON/olaylar.md" "$PROJE/docs/olaylar.md"
sablon_yerlestir "$SABLON/ilk-mesajlar.md" "$PROJE/docs/ekip/ilk-mesajlar.md"
sablon_yerlestir "$SABLON/bagimsiz-goz.md" "$PROJE/docs/ekip/bagimsiz-goz.md"
sablon_yerlestir "$SABLON/vekil-rapor.md" "$PROJE/docs/ekip/vekil-rapor.md"
sablon_yerlestir "$SABLON/geriye-bakis.md" "$PROJE/docs/ekip/geriye-bakis.md"
sablon_yerlestir "$SABLON/vekil-rapor.md" "$PROJE/yerel/vekil/rapor.md"
sablon_yerlestir "$SABLON/vekilekip.json" "$PROJE/.vekilekip.json"
yerlestir "$KIT/araclar/mola.mjs" "$PROJE/araclar/mola.mjs"
yerlestir "$KIT/araclar/mola.test.mjs" "$PROJE/araclar/mola.test.mjs"
yerlestir "$KIT/araclar/canli.mjs" "$PROJE/araclar/canli.mjs"
yerlestir "$KIT/araclar/canli.test.mjs" "$PROJE/araclar/canli.test.mjs"
yerlestir "$KIT/araclar/olcum.py" "$PROJE/araclar/olcum.py"
yerlestir "$KIT/araclar/olcum_test.py" "$PROJE/araclar/olcum_test.py"

# .gitignore: yerel/ ve Python önbelleği depoya girmez (önbellek girerse ölçüm testinden sonra mola engellenir).
# EN: yerel/ and the Python cache stay out of the repository (if the cache got in, the break would be blocked
# after the measurement tests run).
EKSIK=""
if [ ! -e "$PROJE/.gitignore" ]; then
  printf 'yerel/\n__pycache__/\n' >"$PROJE/.gitignore"
  OLUSAN+=(".gitignore")
else
  grep -Eq '^/?yerel/?$' "$PROJE/.gitignore" || EKSIK="${EKSIK}yerel/\n"
  grep -Eq '^(\*\*/)?__pycache__/?$' "$PROJE/.gitignore" || EKSIK="${EKSIK}__pycache__/\n"
  if [ -z "$EKSIK" ]; then
    ATLANAN+=(".gitignore (yerel/ ve __pycache__/ zaten var)")
  else
    { cat "$PROJE/.gitignore"; printf '\n# VekilEkip: depoya girmeyen yerel dosyalar\n'; printf "$EKSIK"; } >"$PROJE/.gitignore.yeni"
    YENI+=(".gitignore.yeni (eksik satırlar eklendi: yerel/, __pycache__/)")
  fi
fi

# ---- takma adlar (çok hesap) / EN: aliases (multiple accounts) ----

if [ "$DUZEN" = 2 ]; then
  SATIRLAR="# VekilEkip: Claude hesapları"
  i=0
  while [ "$i" -lt "$HESAP_SAYISI" ]; do
    kl="${HESAP_KLASORLERI[i]}"
    case "$kl" in "$HOME/"*) kl_yaz="\$HOME/${kl#"$HOME"/}" ;; *) kl_yaz="$kl" ;; esac
    if [ "$kl" = "$HOME/.claude" ]; then
      SATIRLAR="$SATIRLAR"$'\n'"alias ${HESAP_ADLARI[i]}='env -u CLAUDE_CONFIG_DIR claude'"
    else
      SATIRLAR="$SATIRLAR"$'\n'"alias ${HESAP_ADLARI[i]}='CLAUDE_CONFIG_DIR=\"$kl_yaz\" claude'"
    fi
    i=$((i + 1))
  done
  SATIRLAR="$SATIRLAR"$'\n'"# VekilEkip: son"

  RC=""
  case "$(basename "${SHELL:-}")" in zsh) RC="$HOME/.zshrc" ;; bash) RC="$HOME/.bashrc" ;; esac

  bilgi ""
  bilgi "Takma ad satırları:"
  bilgi ""
  bilgi "$SATIRLAR"
  bilgi ""
  if [ -z "$RC" ]; then
    bilgi "Kabuğunuz tanınmadı; satırları kendi başlangıç dosyanıza elle ekleyin."
  elif [ -f "$RC" ] && grep -q '^# VekilEkip: Claude hesapları' "$RC"; then
    bilgi "$(kisalt "$RC") içinde VekilEkip satırları zaten var; dokunulmadı. Gerekirse elle düzeltin."
  elif evet_mi "Bu satırları $(kisalt "$RC") sonuna ekleyeyim mi?" h; then
    printf '\n%s\n' "$SATIRLAR" >>"$RC"
    bilgi "Eklendi. Yeni bir terminal açın ya da: source $(kisalt "$RC")"
  else
    bilgi "Eklenmedi. İsterseniz yukarıdaki satırları $(kisalt "$RC") dosyasına kendiniz ekleyin."
  fi
  for kl in "${HESAP_KLASORLERI[@]}"; do
    if [ ! -d "$kl" ]; then bilgi "Not: $(kisalt "$kl") henüz yok. Takma adla ilk açılışta Claude Code giriş ister ve klasörü kurar."; fi
  done
fi

# ---- sonuç / EN: result ----

bilgi ""
bilgi "Kurulum bitti: $PROJE"
if [ "${#OLUSAN[@]}" -gt 0 ]; then
  bilgi "Oluşturulan dosyalar:"
  for f in "${OLUSAN[@]}"; do bilgi "  + $f"; done
fi
if [ "${#YENI[@]}" -gt 0 ]; then
  bilgi "Var olan dosyalara dokunulmadı; yeni içerik .yeni olarak bırakıldı (karşılaştırıp elle birleştirin):"
  for f in "${YENI[@]}"; do bilgi "  ~ $f"; done
fi
if [ "${#ATLANAN[@]}" -gt 0 ]; then
  bilgi "Atlananlar:"
  for f in "${ATLANAN[@]}"; do bilgi "  = $f"; done
fi

bilgi ""
bilgi "Sıradaki adımlar:"
bilgi "  1. Dosyaları gözden geçirin; .yeni dosyaları birleştirin."
bilgi "  2. .vekilekip.json içindeki süreç kalıplarını projenize göre düzenleyin; deneyin: node araclar/mola.mjs"
if [ -f "$PROJE/package.json" ]; then
  bilgi "     İsterseniz package.json \"scripts\" alanına: \"mola\": \"node araclar/mola.mjs\""
fi
bilgi "  3. Commit edin (yerel/ depoya girmez)."
if [ "$DUZEN" = 1 ]; then
  bilgi "  4. Üç terminal sekmesi açın; her birinde proje klasöründe 'claude' çalıştırıp /rename ile $VEKIL, $LIDER, $GELISTIRICI adını verin."
else
  bilgi "  4. Her rolü kendi takma adıyla proje klasöründe açın, /rename ile adlandırın."
  bilgi "     İsteğe bağlı: bash $KIT/kurulum/oturum-bagla.sh$bag_arg"
fi
bilgi "  5. Her oturuma docs/ekip/ilk-mesajlar.md içindeki rol metnini yapıştırın."
if [ "$CANLI_YETKI" = sahip ]; then
  bilgi "  6. Canlıya çıkmadan önce kendi terminalinizde: node araclar/canli.mjs onayla"
fi
bilgi "  İsteğe bağlı: rol ve sır kancaları için $KIT/sablonlar/ornekler/ klasörüne bakın (kurulmaz, örnek)."
