param(
  [ValidateSet('patch', 'minor', 'major', 'none')]
  [string]$Bump = 'none',

  [ValidateSet('public', 'restricted')]
  [string]$Access = 'public',

  [switch]$DryRun,

  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$common = @{
  Bump = $Bump
  Access = $Access
  DryRun = $DryRun
  SkipInstall = $SkipInstall
}

& (Join-Path $scriptDir 'DockviewSolidCorePushToNPM.ps1') @common
& (Join-Path $scriptDir 'DockviewSolidDockviewPushToNPM.ps1') @common
& (Join-Path $scriptDir 'DockviewSolidDockviewSolidPushToNPM.ps1') @common
