param(
  [ValidateSet('patch', 'minor', 'major', 'none')]
  [string]$Bump = 'none',

  [ValidateSet('public', 'restricted')]
  [string]$Access = 'public',

  [switch]$DryRun,

  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Required command '$CommandName' was not found in PATH."
  }
}

function Read-PackageJson([string]$PackageJsonPath) {
  return Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
}

function Enable-NpmTokenAuth {
  if ([string]::IsNullOrWhiteSpace($env:NPM_TOKEN)) {
    throw 'NPM_TOKEN environment variable is not set.'
  }
  Remove-Item Env:NODE_AUTH_TOKEN -ErrorAction SilentlyContinue
  $script:NpmPublishConfigPath = Join-Path $env:TEMP "dockview-solid-publish-$PID.npmrc"
  @(
    '@arminmajerie:registry=https://registry.npmjs.org/'
    'registry=https://registry.npmjs.org/'
    '//registry.npmjs.org/:_authToken=${NPM_TOKEN}'
  ) | Set-Content -LiteralPath $script:NpmPublishConfigPath -Encoding ascii
  $env:NPM_CONFIG_USERCONFIG = $script:NpmPublishConfigPath
}

function Disable-NpmTokenAuth {
  Remove-Item Env:NPM_CONFIG_USERCONFIG -ErrorAction SilentlyContinue
  if ($script:NpmPublishConfigPath -and (Test-Path -LiteralPath $script:NpmPublishConfigPath)) {
    Remove-Item -LiteralPath $script:NpmPublishConfigPath -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-Npm([string]$WorkingDirectory, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try {
    & npm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

Assert-Command npm

$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$packageDirectory = Join-Path $workspaceRoot 'packages\dockview-solid'
$packageJsonPath = Join-Path $packageDirectory 'package.json'
$dependencyName = '@arminmajerie/dockview-solid'
$parentDependencyName = '@arminmajerie/dockview'
$coreDependencyName = '@arminmajerie/dockview-core'

if (-not (Test-Path -LiteralPath $packageJsonPath)) {
  throw "package.json not found: $packageJsonPath"
}

$package = Read-PackageJson -PackageJsonPath $packageJsonPath
if ($package.name -ne $dependencyName) {
  throw "Expected package name '$dependencyName' but found '$($package.name)'"
}

$parentVersion = (& npm view $parentDependencyName version 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($parentVersion)) {
  throw "$parentDependencyName is not published on npm. Run DockviewSolidDockviewPushToNPM.ps1 first."
}

Step "Syncing $parentDependencyName dependency to published version $parentVersion"
Invoke-Npm -WorkingDirectory $packageDirectory -Arguments @('pkg', 'set', "dependencies.$parentDependencyName=$parentVersion")

Enable-NpmTokenAuth

Push-Location $packageDirectory
try {
  if ($Bump -ne 'none') {
    Step "Bumping $dependencyName version ($Bump)"
    & npm version $Bump --no-git-tag-version
    if ($LASTEXITCODE -ne 0) {
      throw "npm version failed with exit code $LASTEXITCODE"
    }
  }
  else {
    Step "Publishing $dependencyName at current package.json version (no bump)"
  }

  $currentPackage = Read-PackageJson -PackageJsonPath $packageJsonPath
  $newVersion = $currentPackage.version

  if (-not $SkipInstall) {
    Step "Building $coreDependencyName and $parentDependencyName"
    Invoke-Npm -WorkingDirectory $workspaceRoot -Arguments @('run', 'build', '--workspace', $coreDependencyName)
    Invoke-Npm -WorkingDirectory $workspaceRoot -Arguments @('run', 'build', '--workspace', $parentDependencyName)
    Step "Installing dependencies in $packageDirectory"
    Push-Location $packageDirectory
    try {
      & npm install
      if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE"
      }
    }
    finally {
      Pop-Location
    }
  }

  if ($DryRun) {
    Step "Dry run: packing $dependencyName@$newVersion"
    & npm pack
    if ($LASTEXITCODE -ne 0) {
      throw "npm pack failed with exit code $LASTEXITCODE"
    }
    Write-Host "[OK] Packed $dependencyName@$newVersion" -ForegroundColor Green
    return
  }

  Step "Publishing $dependencyName@$newVersion"
  $publishArgs = @('publish', '--access', $Access)
  & npm @publishArgs
  if ($LASTEXITCODE -ne 0) {
    throw "npm publish failed with exit code $LASTEXITCODE"
  }

  Write-Host "[OK] Published $dependencyName@$newVersion" -ForegroundColor Green
}
finally {
  Pop-Location
  Disable-NpmTokenAuth
}
