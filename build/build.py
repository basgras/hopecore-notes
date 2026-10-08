#!/usr/bin/env python3
"""Build the speaker-notes PWA into docs/ from source/.

source/deck.json + source/slides/<id>.html  -> notes (the <aside> of each slide, verbatim)
source/hopecore.pdf                          -> thumbnails (one page per slide)

Fails loudly if the PDF and the deck disagree on slide count or slide text.
"""
import hashlib
import html
import json
import re
import subprocess
from datetime import datetime
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
OUT = ROOT / "docs"
BUILD = ROOT / "build"
LARGE, SMALL = 1280, 480
STATIC = ["index.html", "app.css", "app.js", "manifest.webmanifest",
          "icons/icon-180.png", "icons/icon-512.png"]


def fail(msg):
    print("BUILD FAILED: " + msg)
    sys.exit(1)


def visible_chars(text):
    return Counter(re.sub(r"\s+", "", text.replace(" ", " ")).lower())


def load_deck():
    deck = json.loads((SRC / "deck.json").read_text())
    order = deck["order"]
    if len(set(order)) != len(order):
        fail("duplicate slide ids in deck.json order")
    starts = {s["start"]: s["description"] for s in deck["sections"].values()}
    slides, section = [], ""
    for n, sid in enumerate(order, 1):
        path = SRC / "slides" / f"{sid}.html"
        if not path.exists():
            fail(f"slide {n} ({sid}) has no file")
        raw = path.read_text()
        m = re.search(r"<aside>(.*?)</aside>", raw, re.S)
        notes = html.unescape(m.group(1)).strip() if m else ""
        body = re.sub(r"<aside>.*?</aside>", "", raw, flags=re.S)
        visible = html.unescape(re.sub(r"<[^>]+>", " ", body))
        section = starts.get(sid, section)
        slides.append({"n": n, "id": sid, "section": section, "notes": notes, "_visible": visible})
    return deck, slides


def render_pdf():
    text_json = BUILD / "pdftext.json"
    subprocess.run(["swift", str(BUILD / "pdf.swift"), str(SRC / "hopecore.pdf"), str(OUT),
                    str(LARGE), str(SMALL), str(text_json)], check=True)
    return json.loads(text_json.read_text())


def make_icons():
    (OUT / "icons").mkdir(parents=True, exist_ok=True)
    for size in (180, 512):
        subprocess.run(["swift", str(BUILD / "icon.swift"), str(SRC / "logo-cloud-128.png"),
                        str(OUT / "icons" / f"icon-{size}.png"), str(size)], check=True)


def verify(slides, pdf_pages):
    if len(pdf_pages) != len(slides):
        fail(f"PDF has {len(pdf_pages)} pages but the deck has {len(slides)} slides")
    print(f"{'#':>3}  {'id':<20} {'notes':>6}  section")
    for s, page in zip(slides, pdf_pages):
        if visible_chars(s["_visible"]) != visible_chars(page):
            fail(f"slide {s['n']} ({s['id']}): slide text does not match PDF page {s['n']}")
        for d in ("thumbs", "thumbs/sm"):
            if not (OUT / d / f"{s['n']:03d}.jpg").exists():
                fail(f"missing {d}/{s['n']:03d}.jpg")
        print(f"{s['n']:>3}  {s['id']:<20} {len(s['notes']):>6}  {s['section'][:50]}  ✓")
    empty = [s["n"] for s in slides if not s["notes"]]
    print(f"\n{len(slides)} slides, {len(pdf_pages)} PDF pages, all text matches.")
    print("Slides without notes: " + (", ".join(map(str, empty)) or "none"))


def write_data(deck, slides):
    data = {"title": deck["title"], "built": datetime.now().strftime("%-d %b %Y, %H:%M"),
            "slides": [{k: v for k, v in s.items() if not k.startswith("_")} for s in slides]}
    (OUT / "slides.js").write_text("window.DECK = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")


def write_sw(slides):
    files = STATIC + ["slides.js"]
    files += [f"thumbs/{s['n']:03d}.jpg" for s in slides]
    files += [f"thumbs/sm/{s['n']:03d}.jpg" for s in slides]
    h = hashlib.sha256()
    for f in files:
        h.update(f.encode())
        h.update((OUT / f).read_bytes())
    version = h.hexdigest()[:12]
    template = (BUILD / "sw.template.js").read_text()
    sw = template.replace("__VERSION__", version).replace("__FILES__", json.dumps(["./"] + files, indent=1))
    (OUT / "sw.js").write_text(sw)
    total = sum((OUT / f).stat().st_size for f in files)
    print(f"Service worker cache {version}: {len(files) + 1} entries, {total / 1e6:.1f} MB")


def main():
    deck, slides = load_deck()
    pages = render_pdf()
    make_icons()
    verify(slides, pages)
    write_data(deck, slides)
    write_sw(slides)


if __name__ == "__main__":
    main()
