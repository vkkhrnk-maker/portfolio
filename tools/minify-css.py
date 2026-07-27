#!/usr/bin/env python3
"""Regenerate styles.min.css from styles.css.

styles.css stays the readable source of truth (comments document real
decisions — keep editing THAT file); the pages load styles.min.css.
A PostToolUse hook in .claude/settings.local.json runs this script
automatically after styles.css is edited, so the two never drift.
"""
import os
import re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_path = os.path.join(root, "styles.css")
out_path = os.path.join(root, "styles.min.css")

css = open(src_path, encoding="utf-8").read()
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)      # strip comments
css = re.sub(r"\s+", " ", css)                        # collapse whitespace
css = re.sub(r"\s*([{};:,>])\s*", r"\1", css)         # tighten punctuation
css = css.replace(";}", "}")

open(out_path, "w", encoding="utf-8").write(css.strip() + "\n")
print(f"styles.min.css: {os.path.getsize(out_path) / 1024:.0f} KB "
      f"(from {os.path.getsize(src_path) / 1024:.0f} KB)")
