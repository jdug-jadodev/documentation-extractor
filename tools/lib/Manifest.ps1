Set-StrictMode -Version Latest

function Import-WorkspaceYaml {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "No existe el archivo YAML: $Path"
    }

    if (Get-Command ConvertFrom-Yaml -ErrorAction SilentlyContinue) {
        return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Yaml)
    }

    # Fallback limitado al contrato plano de workspace-repos.yaml.
    $manifest = [ordered]@{
        schema_version = 0
        repositories = @()
    }
    $current = $null
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^schema_version:\s*(\d+)\s*$') {
            $manifest.schema_version = [int]$Matches[1]
        } elseif ($line -match '^\s*-\s+name:\s*(.+?)\s*$') {
            if ($null -ne $current) { $manifest.repositories += [pscustomobject]$current }
            $current = [ordered]@{ name = $Matches[1].Trim() }
        } elseif ($null -ne $current -and $line -match '^\s+(url|path|branch|owner):\s*(.*?)\s*$') {
            $current[$Matches[1]] = $Matches[2].Trim()
        } elseif ($null -ne $current -and $line -match '^\s+enabled:\s*(true|false)\s*$') {
            $current.enabled = [bool]::Parse($Matches[1])
        }
    }
    if ($null -ne $current) { $manifest.repositories += [pscustomobject]$current }
    return [pscustomobject]$manifest
}

function Get-RepositoryEntries {
    param(
        [Parameter(Mandatory = $true)]
        [object] $Manifest,
        [string] $Repository
    )

    $entries = @($Manifest.repositories | Where-Object { $_.enabled -eq $true })
    if ($Repository) {
        $entries = @($entries | Where-Object { $_.name -eq $Repository })
        if ($entries.Count -eq 0) {
            throw "El repositorio habilitado no existe en el manifiesto: $Repository"
        }
    }

    return $entries
}

function Resolve-RepositoryPath {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ManifestDirectory,
        [Parameter(Mandatory = $true)]
        [string] $RepositoryPath
    )

    return [System.IO.Path]::GetFullPath((Join-Path $ManifestDirectory $RepositoryPath))
}
