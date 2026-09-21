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
    Write-Host "No hay repositorios habilitados para preparar." -ForegroundColor Yellow
    exit 0
}

$failed = 0
foreach ($entry in $repositories) {
    $target = Resolve-RepositoryPath -ManifestDirectory $manifestDirectory -RepositoryPath $entry.path
    $branch = if ([string]::IsNullOrWhiteSpace($entry.branch)) { "master" } else { $entry.branch }

    try {
        if (-not (Test-Path -LiteralPath $target)) {
            $parent = Split-Path -Parent $target
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
            Write-Host "[$($entry.name)] clonando en $target"
            git clone --branch $branch --single-branch $entry.url $target
            if ($LASTEXITCODE -ne 0) { throw "git clone falló" }
        } elseif (-not (Test-Path -LiteralPath (Join-Path $target ".git"))) {
            throw "La ruta existe pero no es un repositorio Git: $target"
        } else {
            Write-Host "[$($entry.name)] ya existe; no se vuelve a clonar" -ForegroundColor Yellow
            git -C $target fetch --quiet origin $branch
            if ($LASTEXITCODE -ne 0) { throw "No se pudo verificar la rama remota $branch" }
            git -C $target checkout $branch
            if ($LASTEXITCODE -ne 0) { throw "No se pudo cambiar a la rama $branch" }
        }

        Write-Host "[$($entry.name)] preparado en rama $branch" -ForegroundColor Green
    } catch {
        $failed++
        Write-Host "[$($entry.name)] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed -gt 0) {
    exit 1
}
