#!/usr/bin/env python3
"""
Patch a Tauri-generated iOS project.pbxproj for CI builds without an Apple development team.

When bundle.iOS.developmentTeam is omitted, Xcode still defaults to automatic signing and fails
with "Signing requires a development team". This script forces manual, unsigned-style settings
on every XCBuildConfiguration block (project + targets).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path


def patch(text: str) -> str:
    if "CODE_SIGNING_ALLOWED = NO;" in text and "CODE_SIGN_STYLE = Manual;" in text:
        return text

    text = re.sub(r"CODE_SIGN_STYLE = Automatic;", "CODE_SIGN_STYLE = Manual;", text)
    text = re.sub(r'DEVELOPMENT_TEAM = "[^"]*";', 'DEVELOPMENT_TEAM = "";', text)
    text = re.sub(r"DEVELOPMENT_TEAM = [^;\n]+;", 'DEVELOPMENT_TEAM = "";', text)

    insert = (
        "\t\t\t\tCODE_SIGN_STYLE = Manual;\n"
        "\t\t\t\tCODE_SIGNING_ALLOWED = NO;\n"
        "\t\t\t\tCODE_SIGNING_REQUIRED = NO;\n"
        "\t\t\t\tCODE_SIGN_IDENTITY = \"\";\n"
        "\t\t\t\tDEVELOPMENT_TEAM = \"\";\n"
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
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"error: not a file: {path}", file=sys.stderr)
        return 1
    original = path.read_text(encoding="utf-8")
    updated = patch(original)
    path.write_text(updated, encoding="utf-8", newline="\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
