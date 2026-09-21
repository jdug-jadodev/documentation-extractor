[CmdletBinding()]
param(
    [string] $ManifestPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\Manifest.ps1")

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    $ManifestPath = Join-Path $PSScriptRoot "..\workspace-repos.yaml"
}

$manifest = Import-WorkspaceYaml -Path $ManifestPath
$errors = [System.Collections.Generic.List[string]]::new()

if ($manifest.schema_version -ne 1) { $errors.Add("schema_version debe ser 1") }
if ($null -eq $manifest.repositories) { $errors.Add("repositories es obligatorio") }

$names = @{}
foreach ($entry in @($manifest.repositories)) {
    foreach ($field in @("name", "url", "path", "branch", "enabled")) {
        if ($null -eq $entry.$field -or [string]::IsNullOrWhiteSpace([string]$entry.$field)) {
            $errors.Add("Falta '$field' en una entrada de repositories")
        }
    }
    if ($names.ContainsKey($entry.name)) { $errors.Add("Nombre de repositorio duplicado: $($entry.name)") }
    $names[$entry.name] = $true
    if ([System.IO.Path]::IsPathRooted($entry.path)) { $errors.Add("La ruta debe ser relativa: $($entry.path)") }
    if ($entry.url -match "(token|password|secret|apikey|api-key)=") { $errors.Add("No guardes secretos en la URL de $($entry.name)") }
}

if ($errors.Count -gt 0) {
    Write-Host "Manifiesto inválido:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
    exit 1
}

Write-Host "Manifiesto válido: $(@($manifest.repositories).Count) repositorio(s), $(@($manifest.repositories | Where-Object enabled).Count) habilitado(s)." -ForegroundColor Green
