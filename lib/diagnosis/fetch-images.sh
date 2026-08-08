#!/usr/bin/env bash
# Lane Z, Section 10 task 1 — pull real PlantVillage images.
# Deterministic: sorts the class listing and takes the first N, so re-running
# this produces byte-identical files. No dice-rolling before a live demo.
set -euo pipefail

REPO="spMohanty/PlantVillage-Dataset"
DEST="${1:?usage: fetch-images.sh <dest-dir>}"
PER_CLASS=5

# PlantVillage class folder  ->  our filename stem
CLASSES=(
  "Grape___Black_rot|grape-black-rot"
  "Grape___Esca_(Black_Measles)|grape-esca"
  "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)|grape-leaf-blight"
  "Grape___healthy|grape-healthy"
  "Apple___Apple_scab|apple-scab"
  "Apple___Black_rot|apple-black-rot"
  "Apple___Cedar_apple_rust|apple-cedar-rust"
  "Apple___healthy|apple-healthy"
)

mkdir -p "$DEST"

for entry in "${CLASSES[@]}"; do
  folder="${entry%%|*}"
  stem="${entry##*|}"

  # URL-encode the parentheses that two grape classes carry.
  enc=$(printf %s "$folder" | sed 's/(/%28/g; s/)/%29/g')

  # Ask for one page, sort by name, take the first PER_CLASS .JPG entries.
  names=$(curl -sS "https://api.github.com/repos/$REPO/contents/raw/color/$enc?per_page=100" \
    | grep '"name"' \
    | sed -E 's/.*"name": "(.*)",/\1/' \
    | grep -i '\.JPG$' \
    | LC_ALL=C sort \
    | head -n "$PER_CLASS")

  if [ -z "$names" ]; then
    echo "FAIL: no images listed for $folder" >&2
    exit 1
  fi

  i=0
  while IFS= read -r name; do
    i=$((i + 1))
    out="$DEST/$(printf '%s-%02d.jpg' "$stem" "$i")"
    # jsdelivr serves the raw blob and handles the spaces/parens in these filenames.
    url="https://raw.githubusercontent.com/$REPO/master/raw/color/$enc/$(printf %s "$name" | sed 's/ /%20/g; s/(/%28/g; s/)/%29/g')"
    curl -sSfL "$url" -o "$out"

    # A truncated or HTML error page is worse than no file — verify it's a JPEG.
    if [ "$(head -c 2 "$out" | xxd -p)" != "ffd8" ]; then
      echo "FAIL: $out is not a JPEG (got $(head -c 40 "$out"))" >&2
      exit 1
    fi
    echo "  $(basename "$out")  $(wc -c < "$out" | tr -d ' ') bytes"
  done <<< "$names"

  echo "$stem: $i images"
done

echo
echo "total: $(ls -1 "$DEST" | wc -l | tr -d ' ') files, $(du -sh "$DEST" | cut -f1)"
