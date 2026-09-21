[CmdletBinding()]
param(
    [string] $ManifestPath,
    [string] $Repository,
    [ValidateSet("inventory", "standard", "full", "targeted")]
    [string] $Scope = "inventory"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\Manifest.ps1")
if ([string]::IsNullOrWhiteSpace($ManifestPath)) { $ManifestPath = Join-Path $PSScriptRoot "..\workspace-repos.yaml" }

$manifest = Import-WorkspaceYaml -Path $ManifestPath
$manifestDirectory = Split-Path -Parent (Resolve-Path -LiteralPath $ManifestPath)
$repositories = @(Get-RepositoryEntries -Manifest $manifest -Repository $Repository)
if ($repositories.Count -eq 0) { throw "No hay repositorios habilitados para inventariar." }

function Quote-Yaml([object] $Value) {
    if ($null -eq $Value) { return "null" }
    $text = [string]$Value
    if ($text -match '^[A-Za-z0-9_./:-]+$') { return $text }
    return "'" + ($text -replace "'", "''") + "'"
}
function Relative-Path([string] $Root, [string] $Path) {
    $rootUri = [System.Uri]::new(((Resolve-Path -LiteralPath $Root).Path.TrimEnd('\') + '\'))
    $pathUri = [System.Uri]::new((Resolve-Path -LiteralPath $Path).Path)
    return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString()).Replace('/', '/')
}
function Add-List([System.Text.StringBuilder] $Builder, [string] $Name, [object[]] $Items) {
    [void]$Builder.AppendLine("${Name}:")
    if ($Items.Count -eq 0) { [void]$Builder.AppendLine("  []"); return }
    foreach ($item in $Items) { [void]$Builder.AppendLine("  - $(Quote-Yaml $item)") }
}

$failed = 0
foreach ($entry in $repositories) {
    $repositoryPath = Resolve-RepositoryPath -ManifestDirectory $manifestDirectory -RepositoryPath $entry.path
    try {
        if (-not (Test-Path -LiteralPath $repositoryPath -PathType Container)) { throw "No existe la copia local: $repositoryPath. Ejecuta setup-workspace.ps1 primero." }
        if (-not (Test-Path -LiteralPath (Join-Path $repositoryPath ".git"))) { throw "La ruta no es un repositorio Git: $repositoryPath" }

        $runId = "run-{0}-{1}" -f (Get-Date -Format "yyyyMMdd-HHmmss"), $entry.name
        $runDirectory = Join-Path $manifestDirectory "results\runs\$runId\$($entry.name)"
        New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
        $startedAt = Get-Date
        $files = @(Get-ChildItem -LiteralPath $repositoryPath -File -Recurse -Force | Where-Object { $_.FullName -notmatch '[\\/]\.git([\\/]|$)' -and $_.FullName -notmatch '[\\/](bin|obj|node_modules|packages|dist|build)([\\/]|$)' })

        $extensionCounts = @{}
        foreach ($file in $files) {
            $extension = if ([string]::IsNullOrWhiteSpace($file.Extension)) { "[none]" } else { $file.Extension.ToLowerInvariant() }
            if (-not $extensionCounts.ContainsKey($extension)) { $extensionCounts[$extension] = 0 }
            $extensionCounts[$extension]++
        }
        $projectNames = @($files | Where-Object { $_.Name -match '\.(csproj|fsproj|vbproj|sln|slnx|vcxproj|gradle|pom\.xml|package\.json|pyproject\.toml|go\.mod|Cargo\.toml)$' } | ForEach-Object { Relative-Path $repositoryPath $_.FullName })
        $configNames = @($files | Where-Object { $_.Name -match '(^appsettings.*\.json$|^web\.config$|^app\.config$|\.config$|\.ya?ml$|\.json$|\.toml$|\.env.*$|Dockerfile)' } | ForEach-Object { Relative-Path $repositoryPath $_.FullName })
        $testNames = @($files | Where-Object { $_.FullName -match '([\\/](test|tests|spec|specs)[\\/])|(^|[._-])(test|tests|spec)([._-]|$)' } | ForEach-Object { Relative-Path $repositoryPath $_.FullName })
        $fileNames = @($files | ForEach-Object { Relative-Path $repositoryPath $_.FullName })
        $technologies = @()
        if ($files.Name -contains "package.json") { $technologies += "nodejs" }
        if ($files.Name -match "\.csproj$|\.sln$|\.slnx$") { $technologies += "dotnet" }
        if ($files.Name -contains "pom.xml") { $technologies += "java-maven" }
        if ($files.Name -contains "pyproject.toml" -or $files.Name -contains "requirements.txt") { $technologies += "python" }
        if ($files.Name -contains "go.mod") { $technologies += "go" }
        $technologies = @($technologies | Sort-Object -Unique)
        $branch = (git -C $repositoryPath branch --show-current).Trim()

        $builder = [System.Text.StringBuilder]::new()
        [void]$builder.AppendLine("run_id: $(Quote-Yaml $runId)")
        [void]$builder.AppendLine("repository: $(Quote-Yaml $entry.name)")
        [void]$builder.AppendLine("branch: $(Quote-Yaml $branch)")
        [void]$builder.AppendLine("scope: $Scope`nschema_version: 1`nstatus: review`nanalyzed_at: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')`nfiles_count: $($files.Count)")
        [void]$builder.AppendLine("metrics:`n  files_processed: $($files.Count)`n  modules_detected: $($projectNames.Count)`n  tokens_input: 0`n  tokens_output: 0`n  credits_consumed: 0")
        [void]$builder.AppendLine("file_extensions:")
        foreach ($extension in ($extensionCounts.Keys | Sort-Object)) { [void]$builder.AppendLine("  - extension: $(Quote-Yaml $extension)`n    count: $($extensionCounts[$extension])") }
        Add-List $builder "technologies" $technologies
        Add-List $builder "projects_and_modules" $projectNames
        Add-List $builder "configurations" $configNames
        Add-List $builder "tests" $testNames
        Add-List $builder "files" $fileNames
        [void]$builder.AppendLine("unknown:`n  - 'Purpose, business rules and runtime integrations require the extraction stage.'")
        Set-Content -LiteralPath (Join-Path $runDirectory "inventory.yaml") -Value $builder.ToString() -Encoding UTF8

        $duration = [int]((Get-Date) - $startedAt).TotalSeconds
        $runManifest = "run_id: $runId`nrepository: $($entry.name)`nbranch: $branch`nscope: $Scope`nschema_version: 1`nstatus: review`nanalyzed_at: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')`nvalidation:`n  schema: pending`n  references: pending`n  coverage: partial`n  human_review: pending`nmetrics:`n  files_processed: $($files.Count)`n  duration_seconds: $duration`n  tokens_input: 0`n  tokens_output: 0`n  credits_consumed: 0"
        Set-Content -LiteralPath (Join-Path $runDirectory "run-manifest.yaml") -Value $runManifest -Encoding UTF8
        Write-Host "[$($entry.name)] inventario generado en $runDirectory" -ForegroundColor Green
    } catch {
        $failed++
        Write-Host "[$($entry.name)] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}
if ($failed -gt 0) { exit 1 }
