#!/usr/bin/env python3
"""Generate a local repository inventory without external Python dependencies."""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import subprocess
import sys
from pathlib import Path

EXCLUDED_DIRECTORIES = {".git", "bin", "obj", "node_modules", "packages", "dist", "build"}
PROJECT_PATTERN = re.compile(
    r"\.(csproj|fsproj|vbproj|sln|slnx|vcxproj|gradle|pom\.xml|package\.json|pyproject\.toml|go\.mod|Cargo\.toml)$",
    re.IGNORECASE,
)
CONFIG_PATTERN = re.compile(
    r"(^appsettings.*\.json$|^web\.config$|^app\.config$|\.config$|\.ya?ml$|\.json$|\.toml$|\.env.*$|Dockerfile$)",
    re.IGNORECASE,
)
TEST_PATTERN = re.compile(r"([\\/]((test|tests|spec|specs))([\\/]))|(^|[._-])(test|tests|spec)([._-]|$)", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera un inventario local del repositorio autorizado.")
    parser.add_argument("--manifest", default=None, help="Ruta a workspace-repos.yaml")
    parser.add_argument("--repository", required=True, help="Nombre del repositorio del manifiesto")
    parser.add_argument("--scope", choices=("inventory", "standard", "full", "targeted"), default="inventory")
    return parser.parse_args()


def parse_manifest(path: Path) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    current: dict[str, object] | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        name_match = re.match(r"^\s*-\s+name:\s*(.+?)\s*$", line)
        field_match = re.match(r"^\s+(url|path|branch|owner|enabled):\s*(.*?)\s*$", line)
        if name_match:
            if current is not None:
                entries.append(current)
            current = {"name": name_match.group(1).strip()}
        elif current is not None and field_match:
            value = field_match.group(2).strip()
            current[field_match.group(1)] = value.lower() == "true" if field_match.group(1) == "enabled" else value
    if current is not None:
        entries.append(current)
    return [entry for entry in entries if entry.get("enabled") is True]


def yaml_scalar(value: object) -> str:
    if value is None:
        return "null"
    text = str(value)
    if re.fullmatch(r"[A-Za-z0-9_./:-]+", text):
        return text
    return "'" + text.replace("'", "''") + "'"


def relative_path(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def git_branch(repository: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(repository), "branch", "--show-current"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def collect_files(repository: Path) -> list[Path]:
    files: list[Path] = []
    for root, directories, names in os.walk(repository):
        directories[:] = sorted(directory for directory in directories if directory not in EXCLUDED_DIRECTORIES)
        for name in sorted(names):
            files.append(Path(root) / name)
    return files


def add_list(lines: list[str], name: str, values: list[str]) -> None:
    lines.append(f"{name}:")
    if not values:
        lines.append("  []")
        return
    lines.extend(f"  - {yaml_scalar(value)}" for value in values)


def inventory(repository: Path, name: str, scope: str, output_root: Path) -> Path:
    started = dt.datetime.now(dt.timezone.utc)
    files = collect_files(repository)
    relative_files = [relative_path(repository, path) for path in files]
    extension_counts: dict[str, int] = {}
    for path in files:
        extension = path.suffix.lower() or "[none]"
        extension_counts[extension] = extension_counts.get(extension, 0) + 1

    project_names = sorted(path for path in relative_files if PROJECT_PATTERN.search(Path(path).name))
    config_names = sorted(path for path in relative_files if CONFIG_PATTERN.search(Path(path).name))
    test_names = sorted(path for path in relative_files if TEST_PATTERN.search(path))
    names = {path.name for path in files}
    technologies: list[str] = []
    if "package.json" in names:
        technologies.append("nodejs")
    if any(path.suffix.lower() in {".csproj", ".sln", ".slnx"} for path in files):
        technologies.append("dotnet")
    if "pom.xml" in names:
        technologies.append("java-maven")
    if "pyproject.toml" in names or "requirements.txt" in names:
        technologies.append("python")
    if "go.mod" in names:
        technologies.append("go")
    technologies = sorted(set(technologies))

    run_id = f"run-{dt.datetime.now().astimezone().strftime('%Y%m%d-%H%M%S')}-{name}"
    run_directory = output_root / "results" / "runs" / run_id / name
    run_directory.mkdir(parents=True, exist_ok=True)
    branch = git_branch(repository)
    analyzed_at = dt.datetime.now().astimezone().isoformat(timespec="seconds")

    lines = [
        f"run_id: {yaml_scalar(run_id)}",
        f"repository: {yaml_scalar(name)}",
        f"branch: {yaml_scalar(branch)}",
        f"scope: {scope}",
        "schema_version: 1",
        "status: review",
        f"analyzed_at: {analyzed_at}",
        f"files_count: {len(files)}",
        "metrics:",
        f"  files_processed: {len(files)}",
        f"  modules_detected: {len(project_names)}",
        "  tokens_input: 0",
        "  tokens_output: 0",
        "  credits_consumed: 0",
        "file_extensions:",
    ]
    for extension in sorted(extension_counts):
        lines.extend([f"  - extension: {yaml_scalar(extension)}", f"    count: {extension_counts[extension]}"])
    add_list(lines, "technologies", technologies)
    add_list(lines, "projects_and_modules", project_names)
    add_list(lines, "configurations", config_names)
    add_list(lines, "tests", test_names)
    add_list(lines, "files", relative_files)
    lines.extend(["unknown:", "  - 'Purpose, business rules and runtime integrations require the extraction stage.'", ""])
    (run_directory / "inventory.yaml").write_text("\n".join(lines), encoding="utf-8")

    duration = int((dt.datetime.now(dt.timezone.utc) - started).total_seconds())
    manifest = "\n".join(
        [
            f"run_id: {run_id}",
            f"repository: {name}",
            f"branch: {branch}",
            f"scope: {scope}",
            "schema_version: 1",
            "status: review",
            f"analyzed_at: {analyzed_at}",
            "validation:",
            "  schema: pending",
            "  references: pending",
            "  coverage: partial",
            "  human_review: pending",
            "metrics:",
            f"  files_processed: {len(files)}",
            f"  duration_seconds: {duration}",
            "  tokens_input: 0",
            "  tokens_output: 0",
            "  credits_consumed: 0",
            "",
        ]
    )
    (run_directory / "run-manifest.yaml").write_text(manifest, encoding="utf-8")
    return run_directory


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parent.parent
    manifest_path = Path(args.manifest).resolve() if args.manifest else project_root / "workspace-repos.yaml"
    if not manifest_path.is_file():
        print(f"No existe el manifiesto: {manifest_path}", file=sys.stderr)
        return 1

    entries = {str(entry["name"]): entry for entry in parse_manifest(manifest_path)}
    if args.repository not in entries:
        print(f"El repositorio habilitado no existe en el manifiesto: {args.repository}", file=sys.stderr)
        return 1
    entry = entries[args.repository]
    repository = (manifest_path.parent / str(entry["path"])).resolve()
    if not repository.is_dir():
        print(f"No existe la copia local: {repository}", file=sys.stderr)
        return 1
    if not (repository / ".git").exists():
        print(f"La ruta no es un repositorio Git: {repository}", file=sys.stderr)
        return 1

    try:
        output = inventory(repository, args.repository, args.scope, project_root)
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"[{args.repository}] ERROR: {error}", file=sys.stderr)
        return 1
    print(f"[{args.repository}] inventario generado en {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
