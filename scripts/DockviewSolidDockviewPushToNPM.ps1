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

function Invoke-Pnpm([string]$WorkingDirectory, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try {
    & pnpm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Get-WorkspacePackageJsons([string]$WorkspaceRoot) {
  $excludedDirectoryNames = @('.git', 'coverage', 'dist', 'node_modules', 'out', 'target', 'tmp', 'vendor')
  $directories = New-Object System.Collections.Generic.Queue[string]
  $packageJsons = New-Object System.Collections.Generic.List[System.IO.FileInfo]
  $directories.Enqueue($WorkspaceRoot)

  while ($directories.Count -gt 0) {
    $directory = $directories.Dequeue()
    foreach ($packageFile in Get-ChildItem -LiteralPath $directory -File -Filter 'package.json') {
      $packageJsons.Add($packageFile)
    }
    foreach ($childDirectory in Get-ChildItem -LiteralPath $directory -Directory) {
      if ($excludedDirectoryNames -contains $childDirectory.Name) { continue }
      $directories.Enqueue($childDirectory.FullName)
    }
  }

  return $packageJsons
}

function Get-DependencyReferences([string]$WorkspaceRoot, [string]$DependencyName) {
  $sections = @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')
  $references = New-Object System.Collections.Generic.List[object]

  foreach ($packageFile in Get-WorkspacePackageJsons -WorkspaceRoot $WorkspaceRoot) {
    $package = Read-PackageJson -PackageJsonPath $packageFile.FullName
    foreach ($section in $sections) {
      if ($package.PSObject.Properties.Name -notcontains $section) {
        continue
      }

      $dependencySection = $package.$section
      if ($null -eq $dependencySection) { continue }
      if ($dependencySection.PSObject.Properties.Name -contains $DependencyName) {
        $references.Add([pscustomobject]@{
          PackageJsonPath = $packageFile.FullName
          PackageDirectory = $packageFile.DirectoryName
          Section = $section
          CurrentVersion = $dependencySection.$DependencyName
        })
      }
    }
  }

  return $references | Sort-Object PackageJsonPath, Section
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

function Get-InstallRoot([string]$StartDirectory, [string]$WorkspaceRoot) {
  $current = [System.IO.Path]::GetFullPath($StartDirectory)
  $workspaceBoundary = [System.IO.Path]::GetFullPath($WorkspaceRoot)

  while ($true) {
    if (Test-Path -LiteralPath (Join-Path $current 'pnpm-lock.yaml')) { return $current }
    if (Test-Path -LiteralPath (Join-Path $current 'pnpm-workspace.yaml')) { return $current }
    if (Test-Path -LiteralPath (Join-Path $current 'package-lock.json')) { return $current }

    $packageJsonPath = Join-Path $current 'package.json'
    if (Test-Path -LiteralPath $packageJsonPath) {
      $package = Read-PackageJson -PackageJsonPath $packageJsonPath
      if ($package.PSObject.Properties.Name -contains 'workspaces' -and $null -ne $package.workspaces) {
        return $current
      }
    }

    if ([string]::Equals($current, $workspaceBoundary, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $null
    }

    $parent = Split-Path -Path $current -Parent
    if ([string]::IsNullOrWhiteSpace($parent) -or [string]::Equals($parent, $current, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $null
    }

    $current = $parent
  }
}

Assert-Command pnpm

$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$packageDirectory = Join-Path $workspaceRoot 'packages\dockview'
$packageJsonPath = Join-Path $packageDirectory 'package.json'
$dependencyName = '@arminmajerie/dockview'
$coreDependencyName = '@arminmajerie/dockview-core'

if (-not (Test-Path -LiteralPath $packageJsonPath)) {
  throw "package.json not found: $packageJsonPath"
}

$package = Read-PackageJson -PackageJsonPath $packageJsonPath
if ($package.name -ne $dependencyName) {
  throw "Expected package name '$dependencyName' but found '$($package.name)'"
}

$coreVersion = (& npm view $coreDependencyName version 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($coreVersion)) {
  throw "$coreDependencyName is not published on npm. Run DockviewSolidCorePushToNPM.ps1 first."
}

Step "Syncing $coreDependencyName dependency to published version $coreVersion"
Invoke-Pnpm -WorkingDirectory $packageDirectory -Arguments @('pkg', 'set', "dependencies.$coreDependencyName=$coreVersion")

$references = @(Get-DependencyReferences -WorkspaceRoot $workspaceRoot -DependencyName $dependencyName)

Enable-NpmTokenAuth

Push-Location $packageDirectory
try {
  if ($Bump -ne 'none') {
    Step "Bumping $dependencyName version ($Bump)"
    & pnpm version $Bump --no-git-tag-version
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm version failed with exit code $LASTEXITCODE"
    }
  }
  else {
    Step "Publishing $dependencyName at current package.json version (no bump)"
  }

  $currentPackage = Read-PackageJson -PackageJsonPath $packageJsonPath
  $newVersion = $currentPackage.version

  if (-not $SkipInstall) {
    Step "Building $coreDependencyName"
    Invoke-Pnpm -WorkingDirectory $workspaceRoot -Arguments @('--filter', $coreDependencyName, 'run', 'build')
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
    & pnpm pack
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm pack failed with exit code $LASTEXITCODE"
    }
    Write-Host "[OK] Packed $dependencyName@$newVersion" -ForegroundColor Green
    return
  }

  Step "Publishing $dependencyName@$newVersion"
  $publishArgs = @('publish', '--access', $Access, '--no-git-checks')
  & pnpm @publishArgs
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm publish failed with exit code $LASTEXITCODE"
  }

  if ($references.Count -gt 0) {
    Step "Updating $($references.Count) consumer dependency entries to $newVersion"
    foreach ($reference in $references) {
      Invoke-Pnpm -WorkingDirectory $reference.PackageDirectory -Arguments @('pkg', 'set', "$($reference.Section).$dependencyName=$newVersion")
      Write-Host "  updated $($reference.PackageJsonPath) [$($reference.Section)]" -ForegroundColor DarkGray
    }
  }

  if (-not $SkipInstall) {
    $installRoots = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($reference in $references) {
      $installRoot = Get-InstallRoot -StartDirectory $reference.PackageDirectory -WorkspaceRoot $workspaceRoot
      if (-not [string]::IsNullOrWhiteSpace($installRoot)) {
        [void]$installRoots.Add($installRoot)
      }
    }
    foreach ($installRoot in ($installRoots | Sort-Object)) {
      Step "Refreshing install metadata in $installRoot"
      try {
        Invoke-Pnpm -WorkingDirectory $installRoot -Arguments @('install')
      }
      catch {
        Write-Warning "Install refresh skipped in $installRoot (registry may still be propagating the new version)."
      }
    }
  }

  Write-Host "[OK] Published $dependencyName@$newVersion" -ForegroundColor Green
}
finally {
  Pop-Location
  Disable-NpmTokenAuth
}
