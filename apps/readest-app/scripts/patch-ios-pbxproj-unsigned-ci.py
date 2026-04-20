#!/usr/bin/env python3
"""
Patch a Tauri-generated iOS project.pbxproj for CI builds without Apple signing credentials.

- Forces manual, effectively-unsigned compile flags (CODE_SIGNING_ALLOWED=NO, etc.) so Xcode
  does not stop with "requires a development team" during the build phase.
- Optionally sets DEVELOPMENT_TEAM (via IOS_EXPORT_TEAM_ID) so ExportOptions gets a non-empty
  teamID; exportArchive often still fails on hosted runners without certs — CI then packages
  the .app from the .xcarchive instead (see ios-unsigned-ipa workflow).
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path


def resolve_team() -> str:
    team = os.environ.get("IOS_EXPORT_TEAM_ID", "").strip().upper()
    if team and re.fullmatch(r"[A-Z0-9]{10}", team):
        return team
    return ""


def patch(text: str, team: str) -> str:
    marker = "CODE_SIGNING_ALLOWED = NO;"
    team_line = f"DEVELOPMENT_TEAM = {team};" if team else 'DEVELOPMENT_TEAM = "";'

    text = re.sub(r"CODE_SIGN_STYLE = Automatic;", "CODE_SIGN_STYLE = Manual;", text)
    text = re.sub(r'DEVELOPMENT_TEAM = "[^"]*";', team_line, text)
    text = re.sub(r"DEVELOPMENT_TEAM = [^;\n]+;", team_line, text)

    if marker in text:
        return text

    insert = (
        "\t\t\t\tCODE_SIGN_STYLE = Manual;\n"
        "\t\t\t\tCODE_SIGNING_ALLOWED = NO;\n"
        "\t\t\t\tCODE_SIGNING_REQUIRED = NO;\n"
        '\t\t\t\tCODE_SIGN_IDENTITY = "";\n'
        f"\t\t\t\t{team_line}\n"
    )

    rgx = re.compile(r"(isa = XCBuildConfiguration;\s+buildSettings = \{\s*\n)")
    if not rgx.search(text):
        raise RuntimeError(
            "Could not find XCBuildConfiguration / buildSettings header in project.pbxproj; "
            "indentation may differ from expected Tauri/XcodeGen output."
        )
    return rgx.sub(lambda m: m.group(1) + insert, text)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: patch-ios-pbxproj-unsigned-ci.py <path-to-project.pbxproj>", file=sys.stderr)
        return 2
    team = resolve_team()
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"error: not a file: {path}", file=sys.stderr)
        return 1
    original = path.read_text(encoding="utf-8")
    updated = patch(original, team)
    path.write_text(updated, encoding="utf-8", newline="\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
