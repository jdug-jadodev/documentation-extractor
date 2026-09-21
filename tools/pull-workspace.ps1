[CmdletBinding()]
param(
    [string] $ManifestPath,
    [string] $Repository
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\Manifest.ps1")

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    $ManifestPath = Join-Path $PSScriptRoot "..\workspace-repos.yaml"
}

$manifest = Import-WorkspaceYaml -Path $ManifestPath
$manifestDirectory = Split-Path -Parent (Resolve-Path -LiteralPath $ManifestPath)
$repositories = @(Get-RepositoryEntries -Manifest $manifest -Repository $Repository)

if ($repositories.Count -eq 0) {
    Write-Host "No hay repositorios habilitados para actualizar." -ForegroundColor Yellow
    exit 0
}

$failed = 0
foreach ($entry in $repositories) {
    $target = Resolve-RepositoryPath -ManifestDirectory $manifestDirectory -RepositoryPath $entry.path
    $branch = if ([string]::IsNullOrWhiteSpace($entry.branch)) { "master" } else { $entry.branch }

    try {
        if (-not (Test-Path -LiteralPath (Join-Path $target ".git"))) {
            throw "La ruta no existe o no es un repositorio Git: $target"
        }

        $changes = @(git -C $target status --porcelain)
        if ($LASTEXITCODE -ne 0) { throw "No se pudo consultar el estado Git" }
        if ($changes.Count -gt 0) {
            throw "Hay cambios locales; resuélvelos antes de actualizar"
        }

        git -C $target checkout $branch
        if ($LASTEXITCODE -ne 0) { throw "No se pudo cambiar a la rama $branch" }
        git -C $target pull --ff-only
        if ($LASTEXITCODE -ne 0) { throw "git pull --ff-only falló" }
        Write-Host "[$($entry.name)] actualizado en rama $branch" -ForegroundColor Green
    } catch {
        $failed++
        Write-Host "[$($entry.name)] BLOQUEADO: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed -gt 0) {
    exit 1
}
