#!/usr/bin/env bash
# Syncs WASM output and shared source files from data-morph/Extentions/DataMorphPlayground
# into this dockview example project.
#
# Copies:
#   1. Compiled WASM binaries from data-morph/wasm/pkg-web/ → data-morph-wasm/
#   2. Shared source files from Extentions/DataMorphPlayground/src/ → src/
#      (Excludes monaco/, landing/, excel/ which are source-only.)
#   3. public/codicon.ttf
#   4. index.html
#
# Files NOT touched (project-specific config):
#   package.json, vite.config.ts, tsconfig.json, .npmrc, .gitignore, README.md
#
# No Rust source code (.rs) or WASM source is copied.
#
# Usage:
#   ./updateProjFromSource.sh [--source-root /path/to/data-morph] [--dry-run]

set -euo pipefail

target_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_root=""
dry_run=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-root)
      [[ $# -ge 2 ]] || { echo "Missing value for --source-root" >&2; exit 1; }
      source_root="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$source_root" ]]; then
  source_root="$(cd "$target_root/../../../../data-morph" && pwd)"
fi

playground_src="${source_root}/Extentions/DataMorphPlayground/src"
wasm_pkg_web="${source_root}/wasm/pkg-web"
playground_root="${source_root}/Extentions/DataMorphPlayground"

# --- Validation ---
for required_dir in "$playground_src" "$wasm_pkg_web"; do
  if [[ ! -d "$required_dir" ]]; then
    printf 'ERROR: Required directory not found: %s\n' "$required_dir" >&2
    exit 1
  fi
done

sync_file() {
  local from="$1" to="$2"

  [[ -f "$from" ]] || return 0

  if [[ "$dry_run" -eq 1 ]]; then
    printf '  [dry-run] %s -> %s\n' "$from" "$to"
    return 0
  fi

  mkdir -p "$(dirname "$to")"
  cp -f "$from" "$to"
}

sync_directory() {
  local from="$1" to="$2"

  if [[ ! -d "$from" ]]; then
    printf '  [skip] Source directory not found: %s\n' "$from"
    return 0
  fi

  find "$from" -type f ! -name '*.rs' -print0 | while IFS= read -r -d '' file; do
    local rel_path="${file#"$from"/}"
    sync_file "$file" "$to/$rel_path"
  done
}

action="Syncing"
[[ "$dry_run" -eq 1 ]] && action="DRY RUN"

# --- Step 1: WASM output ---
printf '\n==> %s WASM binaries from pkg-web...\n' "$action"

wasm_target="${target_root}/data-morph-wasm"
wasm_files=(
  "data_morph_wasm.d.ts"
  "data_morph_wasm.js"
  "data_morph_wasm_bg.js"
  "data_morph_wasm_bg.wasm"
  "data_morph_wasm_bg.wasm.d.ts"
  "package.json"
  "README.md"
)

for wasm_file in "${wasm_files[@]}"; do
  sync_file "${wasm_pkg_web}/${wasm_file}" "${wasm_target}/${wasm_file}"
done

printf '  WASM files synced: %d\n' "${#wasm_files[@]}"

# --- Step 2: Shared source directories ---
printf '\n==> %s shared source files...\n' "$action"

# Directories to sync (exist in both source and target).
# Excludes: monaco/ (target uses CodeMirror), landing/ (removed), excel/ (removed)
shared_dirs=(
  "codemirror"
  "header"
  "inputExplorer"
  "logViewer"
  "output"
  "scriptPane"
  "svg"
  "topHeader"
  "util"
)

synced_count=0
for dir in "${shared_dirs[@]}"; do
  sync_directory "${playground_src}/${dir}" "${target_root}/src/${dir}"
  ((synced_count++))
done

# Top-level src files
top_level_files=("App.tsx" "index.tsx" "index.css")
for f in "${top_level_files[@]}"; do
  sync_file "${playground_src}/${f}" "${target_root}/src/${f}"
done

printf '  Source dirs synced: %d  |  Top-level files: %d\n' "$synced_count" "${#top_level_files[@]}"

# --- Step 3: public/codicon.ttf ---
printf '\n==> %s public/codicon.ttf...\n' "$action"
sync_file "${playground_root}/public/codicon.ttf" "${target_root}/public/codicon.ttf"
printf '  Done\n'

# --- Step 4: index.html ---
printf '\n==> %s index.html...\n' "$action"
sync_file "${playground_root}/index.html" "${target_root}/index.html"
printf '  Done\n'

# --- Summary ---
printf '\n'
if [[ "$dry_run" -eq 1 ]]; then
  printf 'Dry-run complete. No files were written.\n'
else
  printf 'Sync complete. Dockview data-morph example updated from DataMorphPlayground.\n'
fi
