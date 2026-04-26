<#
.SYNOPSIS
    Syncs WASM output and shared source files from data-morph/Extentions/DataMorphPlayground
    into this dockview example project.

.DESCRIPTION
    Copies:
      1. Compiled WASM binaries from data-morph/wasm/pkg-web/ → data-morph-wasm/
    2. Shared source files from Extentions/DataMorphPlayground/src/ → src/
         (Excludes monaco/, landing/, excel/ which are source-only.)
      3. public/codicon.ttf
      4. index.html

    Files NOT touched (project-specific config):
      package.json, vite.config.ts, tsconfig.json, .npmrc, .gitignore, README.md

    No Rust source code (.rs) or WASM source is copied.

.PARAMETER SourceRoot
    Path to the data-morph directory. Defaults to the sibling data-morph folder.

.PARAMETER DryRun
    Print what would be copied without writing anything.
#>
[CmdletBinding()]
param(
    [string]$SourceRoot,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$targetRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $SourceRoot) {
    $SourceRoot = Join-Path (Split-Path -Parent $targetRoot) ".." ".." ".." "data-morph"
    $SourceRoot = [System.IO.Path]::GetFullPath($SourceRoot)
}

$playgroundSrc = Join-Path $SourceRoot "Extentions" "DataMorphPlayground" "src"
$wasmPkgWeb    = Join-Path $SourceRoot "wasm" "pkg-web"
$playgroundRoot = Join-Path $SourceRoot "Extentions" "DataMorphPlayground"

# --- Validation ---
foreach ($requiredDir in @($playgroundSrc, $wasmPkgWeb)) {
    if (-not (Test-Path -LiteralPath $requiredDir -PathType Container)) {
        Write-Host "ERROR: Required directory not found: $requiredDir" -ForegroundColor Red
        exit 1
    }
}

function Sync-File {
    param(
        [string]$From,
        [string]$To
    )

    if (-not (Test-Path -LiteralPath $From -PathType Leaf)) {
        return
    }

    if ($DryRun) {
        Write-Host "  [dry-run] $From -> $To"
        return
    }

    $toDir = Split-Path -Parent $To
    if (-not (Test-Path -LiteralPath $toDir -PathType Container)) {
        New-Item -ItemType Directory -Path $toDir -Force | Out-Null
    }

    Copy-Item -LiteralPath $From -Destination $To -Force
}

function Sync-Directory {
    param(
        [string]$From,
        [string]$To,
        [string[]]$ExcludeExtensions = @()
    )

    if (-not (Test-Path -LiteralPath $From -PathType Container)) {
        Write-Host "  [skip] Source directory not found: $From" -ForegroundColor DarkGray
        return
    }

    $files = Get-ChildItem -LiteralPath $From -Recurse -File
    foreach ($file in $files) {
        if ($ExcludeExtensions -contains $file.Extension) {
            continue
        }

        $relativePath = $file.FullName.Substring($From.Length).TrimStart('\', '/')
        $destPath = Join-Path $To $relativePath

        Sync-File -From $file.FullName -To $destPath
    }
}

$action = if ($DryRun) { "DRY RUN" } else { "Syncing" }

# --- Step 1: WASM output ---
Write-Host ""
Write-Host "==> $action WASM binaries from pkg-web..." -ForegroundColor Cyan

$wasmTarget = Join-Path $targetRoot "data-morph-wasm"
$wasmFiles = @(
    "data_morph_wasm.d.ts",
    "data_morph_wasm.js",
    "data_morph_wasm_bg.js",
    "data_morph_wasm_bg.wasm",
    "data_morph_wasm_bg.wasm.d.ts",
    "package.json",
    "README.md"
)

foreach ($wasmFile in $wasmFiles) {
    Sync-File -From (Join-Path $wasmPkgWeb $wasmFile) -To (Join-Path $wasmTarget $wasmFile)
}

Write-Host "  WASM files synced: $($wasmFiles.Count)" -ForegroundColor Green

# --- Step 2: Shared source directories ---
Write-Host ""
Write-Host "==> $action shared source files..." -ForegroundColor Cyan

# Directories to sync (exist in both source and target).
# Excludes: monaco/ (target uses CodeMirror), landing/ (removed), excel/ (removed)
$sharedDirs = @(
    "codemirror",
    "header",
    "inputExplorer",
    "logViewer",
    "output",
    "scriptPane",
    "svg",
    "topHeader",
    "util"
)

$syncedCount = 0
foreach ($dir in $sharedDirs) {
    $srcDir = Join-Path $playgroundSrc $dir
    $dstDir = Join-Path $targetRoot "src" $dir

    Sync-Directory -From $srcDir -To $dstDir -ExcludeExtensions @(".rs")
    $syncedCount++
}

# Top-level src files
$topLevelFiles = @("App.tsx", "index.tsx", "index.css")
foreach ($f in $topLevelFiles) {
    Sync-File -From (Join-Path $playgroundSrc $f) -To (Join-Path $targetRoot "src" $f)
}

Write-Host "  Source dirs synced: $syncedCount  |  Top-level files: $($topLevelFiles.Count)" -ForegroundColor Green

# --- Step 3: public/codicon.ttf ---
Write-Host ""
Write-Host "==> $action public/codicon.ttf..." -ForegroundColor Cyan
Sync-File -From (Join-Path $playgroundRoot "public" "codicon.ttf") `
           -To   (Join-Path $targetRoot "public" "codicon.ttf")
Write-Host "  Done" -ForegroundColor Green

# --- Step 4: index.html ---
Write-Host ""
Write-Host "==> $action index.html..." -ForegroundColor Cyan
Sync-File -From (Join-Path $playgroundRoot "index.html") `
           -To   (Join-Path $targetRoot "index.html")
Write-Host "  Done" -ForegroundColor Green

# --- Summary ---
Write-Host ""
if ($DryRun) {
    Write-Host "Dry-run complete. No files were written." -ForegroundColor Yellow
} else {
    Write-Host "Sync complete. Dockview data-morph example updated from DataMorphPlayground." -ForegroundColor Green
}
