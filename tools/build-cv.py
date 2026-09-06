#!/usr/bin/env python3
"""Build cv.html and cv-print.html (and optionally the PDF) from cv.md.

cv.md is the one place the CV text lives. The page and the print sheet render
the same parsed content into different markup — the page into the site's
.cv__* classes, the sheet into the compact print classes — so the two can no
longer drift the way the English and Russian copies once did.

    python3 tools/build-cv.py          # rewrite cv.html and cv-print.html
    python3 tools/build-cv.py --pdf    # ...and re-render the PDF via Chrome

The parser is deliberately strict: anything it cannot place raises with the
line number and what it expected, rather than silently dropping a bullet.
"""
import argparse
import hashlib
import html
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "cv.md")
PAGE_OUT = os.path.join(ROOT, "cv.html")
PRINT_OUT = os.path.join(ROOT, "cv-print.html")
PDF_OUT = os.path.join(ROOT, "Victoria-Kukharenko-Product-Designer-CV.pdf")
PAGE_TPL = os.path.join(ROOT, "tools", "cv-page.template.html")
PRINT_TPL = os.path.join(ROOT, "tools", "cv-print.template.html")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# The Russian CV. Same parser, same grammar, same section keys — only the
# values and the rendered labels differ, so the two cannot drift structurally.
# There is no Russian print sheet or PDF: the sheet's spacing is tuned to fit
# one page of English, and Russian runs longer. The Russian page therefore
# offers the English PDF, and says so on the button.
RU_SRC = os.path.join(ROOT, "cv.ru.md")
RU_PAGE_OUT = os.path.join(ROOT, "ru", "cv.html")
RU_PAGE_TPL = os.path.join(ROOT, "tools", "cv-page.ru.template.html")

KNOWN_SECTIONS = {"Summary", "Experience", "Skills", "Education", "Languages", "Closing"}

# Section names in the source are structure, not display text. These are what
# the reader actually sees.
LABELS = {
    "en": {"experience": "Experience", "skills": "Skills", "education": "Education",
           "closing": "Get in touch", "download": "Download PDF",
           "call": "Book a call", "prefix": ""},
    "ru": {"experience": "Опыт", "skills": "Навыки", "education": "Образование",
           "closing": "Связаться", "download": "Скачать PDF — на английском",
           "call": "Созвониться", "prefix": "../"},
}


class SourceError(Exception):
    """A line in cv.md that the builder will not guess at."""


def fail(lineno, line, expected):
    raise SourceError(
        f"cv.md line {lineno}: {expected}\n"
        f"  got: {line.strip()!r}\n"
        f"  see the comment at the top of cv.md for the format."
    )


# ---------------------------------------------------------------- parsing

def parse(text):
    """cv.md -> a dict of plain data. No HTML here; renderers do that."""
    doc = {"name": "", "role": "", "meta": {}, "summary": "",
           "experience": [], "skills": [], "education": [],
           "languages": "", "closing": ""}
    section = None
    role = None
    # Strip the leading HTML comment block that documents the format.
    text = re.sub(r"^<!--.*?-->\s*", "", text, flags=re.S)

    for lineno, raw in enumerate(text.splitlines(), start=1):
        line = raw.rstrip()
        if not line.strip():
            continue

        if line.startswith("# "):
            doc["name"] = line[2:].strip()
            section = "head"
        elif line.startswith("## "):
            title = line[3:].strip()
            if section == "head" and not doc["role"]:
                doc["role"] = title          # the ## right after the name
            elif title in KNOWN_SECTIONS:
                section = title
                role = None
            else:
                fail(lineno, line,
                     f"unknown section. Expected one of {sorted(KNOWN_SECTIONS)}")
        elif line.startswith("### "):
            if section != "Experience":
                fail(lineno, line, "a ### role heading only belongs under ## Experience")
            role = {"title": line[4:].strip(), "dates": "", "meta": "",
                    "bullets": [], "cases": []}
            doc["experience"].append(role)
        elif section == "head":
            key, sep, value = line.partition(":")
            if not sep:
                fail(lineno, line, "expected a 'Key: value' contact line")
            doc["meta"][key.strip()] = value.strip()
        elif section == "Summary":
            doc["summary"] = line.strip()
        elif section == "Languages":
            doc["languages"] = line.strip()
        elif section == "Closing":
            doc["closing"] = line.strip()
        elif section == "Experience":
            if role is None:
                fail(lineno, line, "content before the first ### role heading")
            if line.startswith("**") and line.endswith("**"):
                if role["dates"]:
                    fail(lineno, line, "this role already has a **dates · meta** line")
                inner = line[2:-2]
                dates, sep, meta = inner.partition("·")
                role["dates"] = dates.strip()
                role["meta"] = meta.strip()
            elif line.startswith("- "):
                role["bullets"].append(line[2:].strip())
            elif line.startswith("Cases:"):
                for label, href in re.findall(r"\[([^\]]+)\]\(([^)]+)\)", line):
                    role["cases"].append({"label": label, "href": href})
                if not role["cases"]:
                    fail(lineno, line, "a Cases: line needs at least one [label](url)")
            else:
                fail(lineno, line, "expected **dates · meta**, a '- bullet', or a 'Cases:' line")
        elif section in ("Skills", "Education"):
            m = re.match(r"^\*\*(.+?)\*\*\s+—\s+(.+)$", line)
            if not m:
                fail(lineno, line, "expected '**Label** — body'")
            doc[section.lower()].append({"label": m.group(1).strip(),
                                         "body": m.group(2).strip()})
        else:
            fail(lineno, line, "content before the first ## section")

    missing = [k for k in ("name", "role", "summary") if not doc[k]]
    if missing:
        raise SourceError(f"cv.md is missing: {', '.join(missing)}")
    for r in doc["experience"]:
        if not r["dates"]:
            raise SourceError(f"cv.md: role {r['title']!r} has no **dates** line")
    return doc


# ------------------------------------------------------------- rendering

def inline(text):
    """The only inline markup the CV uses: **bold**. Everything else escapes.

    Straight apostrophes become typographic ones on the way out, so cv.md can
    be typed however is convenient. The page would get this from typographer.js
    anyway; the print sheet does not load it, and the PDF is the copy that ends
    up attached to an application.
    """
    out = html.escape(text, quote=False)
    out = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"(?<=\w)'(?=\w)", "’", out)
    return out


def page_body(doc, lang="en"):
    """The site page: .cv__* classes, styled by the CV block in styles.css."""
    L = LABELS[lang]
    p = []
    a = p.append
    a('      <header class="cv__hero">')
    a('        <p class="cv__eyebrow">CV</p>')
    # The headline is the one line written for the page rather than the sheet.
    headline = doc["meta"].get("Headline", doc["role"])
    a(f'        <h1 class="cv__title">{nbsp_last(inline(headline))}</h1>')
    a(f'        <p class="cv__summary">{inline(doc["summary"])}</p>')
    a('        <div class="cv__actions">')
    a('          <!-- ?v= is bumped whenever the PDF is re-rendered from cv-print.html,')
    a('               since it is replaced in place and would otherwise stay cached. -->')
    a(f'          <a class="btn btn--dark cv__download" href="{L["prefix"]}{os.path.basename(PDF_OUT)}?v={pdf_version()}" download>')
    a('            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">')
    a('              <path fill="currentColor" d="M12 16 7 11l1.4-1.4 2.6 2.6V4h2v8.2l2.6-2.6L17 11l-5 5zm-7 4v-2h14v2H5z"/>')
    a('            </svg>')
    a(f'            <span>{L["download"]}</span>')
    a('          </a>')
    a(f'          <a class="btn btn--light" href="mailto:{doc["meta"]["Email"]}">{doc["meta"]["Email"]}</a>')
    a('        </div>')
    a('      </header>')
    a('')
    a('      <section class="cv__section" aria-labelledby="cv-experience">')
    a(f'        <h2 class="cv__section-title" id="cv-experience">{L["experience"]}</h2>')
    for r in doc["experience"]:
        a('')
        a('        <div class="cv__role">')
        a('          <div class="cv__role-head">')
        a(f'            <h3 class="cv__role-title">{inline(r["title"])}</h3>')
        a(f'            <p class="cv__role-dates">{inline(r["dates"])}</p>')
        a('          </div>')
        if r["meta"]:
            a(f'          <p class="cv__role-meta">{inline(sentence_case(r["meta"]))}</p>')
        if r["bullets"]:
            a('          <ul class="cv__list">')
            for b in r["bullets"]:
                a(f'            <li>{inline(b)}</li>')
            a('          </ul>')
        if r["cases"]:
            a('          <p class="cv__role-links">')
            for c in r["cases"]:
                a(f'            <a class="btn btn--light" href="{html.escape(c["href"])}">{inline(c["label"])}</a>')
            a('          </p>')
        a('        </div>')
    a('      </section>')

    for key, heading, anchor in (("skills", L["skills"], "cv-skills"),
                                 ("education", L["education"], "cv-education")):
        a('')
        a(f'      <section class="cv__section" aria-labelledby="{anchor}">')
        a(f'        <h2 class="cv__section-title" id="{anchor}">{heading}</h2>')
        a('        <dl class="cv__defs">')
        for row in doc[key]:
            a('          <div class="cv__def">')
            a(f'            <dt>{inline(row["label"])}</dt>')
            a(f'            <dd>{inline(row["body"])}</dd>')
            a('          </div>')
        a('        </dl>')
        a('      </section>')

    a('')
    a('      <section class="cv__section cv__section--closing">')
    a(f'        <h2 class="cv__section-title">{L["closing"]}</h2>')
    a(f'        <p class="cv__summary">{inline(doc["closing"])}</p>')
    a('        <div class="cv__actions">')
    a(f'          <a class="btn btn--dark" href="https://cal.com/viktoria-kukharenko-yrnxb7/intro-call" target="_blank" rel="noopener">{L["call"]}</a>')
    a(f'          <a class="btn btn--light" href="mailto:{doc["meta"]["Email"]}">{doc["meta"]["Email"]}</a>')
    a('          <a class="btn btn--light" href="https://t.me/Viktoria_UxUi" target="_blank" rel="noopener">Telegram</a>')
    a('        </div>')
    a('      </section>')
    return "\n".join(p)


def print_body(doc):
    """The A4 sheet: single column, real text, nothing an ATS parser trips on."""
    p = []
    a = p.append
    m = doc["meta"]
    a('  <header>')
    a(f'    <h1 class="name">{inline(doc["name"])}</h1>')
    a(f'    <p class="role">{inline(doc["role"])}</p>')
    a('    <p class="contacts">')
    a(f'      <span>{inline(m["Based"])}</span><span class="sep">|</span>'
      f'<span>{inline(m["Email"])}</span><span class="sep">|</span>'
      f'<span>Telegram {inline(m["Telegram"])}</span><br>')
    a(f'      <span>{inline(strip_scheme(m["Portfolio"]))}</span><span class="sep">|</span>'
      f'<span>{inline(strip_scheme(m["LinkedIn"]))}</span>')
    a('    </p>')
    a('  </header>')
    a('')
    a('  <h2>Summary</h2>')
    a(f'  <p>{inline(doc["summary"])}</p>')
    a('')
    a('  <h2>Experience</h2>')
    for r in doc["experience"]:
        a('')
        a('  <div class="role-block">')
        a('    <div class="role-head">')
        a(f'      <div class="role-title">{inline(r["title"])}</div>')
        a(f'      <div class="role-dates">{inline(r["dates"])}</div>')
        a('    </div>')
        if r["meta"]:
            a(f'    <div class="role-meta">{inline(sentence_case(r["meta"]))}</div>')
        if r["bullets"]:
            a('    <ul>')
            for b in r["bullets"]:
                a(f'      <li>{inline(b)}</li>')
            a('    </ul>')
        a('  </div>')
    a('')
    a('  <h2>Skills</h2>')
    a('  <div class="skills">')
    for row in doc["skills"]:
        a(f'    <p><b>{inline(row["label"])}</b> — {inline(row["body"])}</p>')
    a('  </div>')
    a('')
    a('  <h2>Education</h2>')
    a('  <div class="edu">')
    for row in doc["education"]:
        # The page puts years in their own column; the sheet reads them inline.
        a(f'    <p>{inline(row["body"])}. {inline(row["label"])}.</p>')
    a('  </div>')
    a('')
    a('  <h2>Languages</h2>')
    a(f'  <p>{inline(doc["languages"])}</p>')
    return "\n".join(p)


def sentence_case(text):
    """The sheet's meta line opens the block, so it starts with a capital."""
    return text[:1].upper() + text[1:] if text else text


def strip_scheme(url):
    """Printed URLs carry no scheme or www — they are read, not clicked."""
    return re.sub(r"^https?://(www\.)?|/$", "", url)


def nbsp_last(escaped):
    """Bind the headline's last two words so one never orphans onto its own line.

    Runs on already-escaped text, and writes the entity rather than a literal
    U+00A0: an invisible character in the source is unreadable for whoever
    edits this next.
    """
    head, sep, tail = escaped.rpartition(" ")
    return f"{head}&nbsp;{tail}" if sep else escaped


def pdf_version():
    """A short digest of the PDF, so the ?v= changes only when the file does.

    This was the mtime first, which looked equivalent and was not: git rewrites
    files on checkout, rebase and clone, so any branch operation bumped the
    version and left a spurious cv.html diff behind. Hashing the bytes means a
    rebuild that produces the same PDF produces the same link.
    """
    if not os.path.exists(PDF_OUT):
        return "0"
    digest = hashlib.sha256(open(PDF_OUT, "rb").read()).hexdigest()
    return digest[:8]


# ------------------------------------------------------------------ build

def asset_ref(filename):
    """Take the ?v= for a shared asset from index.html.

    cv.html would otherwise be the one page a `sed 's/v=311/v=312/' *.html`
    bump forgets — the template lives in tools/ and the generated file gets
    overwritten. Reading the version off index.html at build time means the CV
    page cannot lag behind the rest of the site.
    """
    index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    m = re.search(re.escape(filename) + r"\?v=\d+", index)
    if not m:
        raise SourceError(f"index.html does not reference {filename}?v=N")
    return m.group(0)


def render(template_path, body, out_path):
    tpl = open(template_path, encoding="utf-8").read()
    if "{{BODY}}" not in tpl:
        raise SourceError(f"{template_path} has no {{{{BODY}}}} placeholder")
    out = tpl.replace("{{BODY}}", body)
    out = out.replace("{{STYLES}}", asset_ref("styles.min.css"))
    out = out.replace("{{TYPOGRAPHER}}", asset_ref("typographer.js"))
    out = out.replace("{{PDF}}", os.path.basename(PDF_OUT))
    open(out_path, "w", encoding="utf-8").write(out)
    return out_path


def render_pdf():
    if not os.path.exists(CHROME):
        raise SourceError(f"Chrome not found at {CHROME} — cannot render the PDF")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--virtual-time-budget=3000", f"--print-to-pdf={PDF_OUT}",
                    "file://" + PRINT_OUT],
                   check=True, capture_output=True)
    pages = len(re.findall(rb"/Type\s*/Page[^s]", open(PDF_OUT, "rb").read()))
    return pages


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", action="store_true", help="also re-render the PDF")
    args = ap.parse_args()

    try:
        doc = parse(open(SRC, encoding="utf-8").read())
        render(PRINT_TPL, print_body(doc), PRINT_OUT)
        render(PAGE_TPL, page_body(doc), PAGE_OUT)
        ru = parse(open(RU_SRC, encoding="utf-8").read())
        os.makedirs(os.path.dirname(RU_PAGE_OUT), exist_ok=True)
        render(RU_PAGE_TPL, page_body(ru, "ru"), RU_PAGE_OUT)
    except SourceError as e:
        print(f"build-cv: {e}", file=sys.stderr)
        return 1

    roles = len(doc["experience"])
    bullets = sum(len(r["bullets"]) for r in doc["experience"])
    print(f"cv.html + cv-print.html: {roles} roles, {bullets} bullets, "
          f"{len(doc['skills'])} skills, {len(doc['education'])} education")
    if len(ru["experience"]) != roles:
        print(f"build-cv: WARNING — cv.ru.md has {len(ru['experience'])} roles "
              f"against cv.md's {roles}; the two CVs have drifted.", file=sys.stderr)
    print(f"ru/cv.html: {len(ru['experience'])} roles, "
          f"{sum(len(r['bullets']) for r in ru['experience'])} bullets")

    if args.pdf:
        try:
            pages = render_pdf()
        except (SourceError, subprocess.CalledProcessError) as e:
            print(f"build-cv: PDF render failed: {e}", file=sys.stderr)
            return 1
        size = os.path.getsize(PDF_OUT) / 1024
        print(f"{os.path.basename(PDF_OUT)}: {pages} page(s), {size:.0f} KB")
        if pages != 1:
            # The sheet's spacing is tuned to fit one page with ~3mm to spare;
            # spilling means the content grew past it. See cv-print.template.html.
            print("build-cv: WARNING — the sheet is no longer one page. "
                  "Trim a line or tighten the rhythm in cv-print.template.html.",
                  file=sys.stderr)
            return 1
        # Both pages embed the PDF's ?v=; rebuild so they agree.
        render(PAGE_TPL, page_body(doc), PAGE_OUT)
        render(RU_PAGE_TPL, page_body(ru, "ru"), RU_PAGE_OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
