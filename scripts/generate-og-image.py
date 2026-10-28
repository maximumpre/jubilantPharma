#!/usr/bin/env python3
"""Build social preview PNG from the project's header/login logo (not favicon).

Two modes:
  - tight: trimmed native size when the source is already logo-dominant (PNG/JPG)
  - composite: 1200x630 white canvas with logo at 90% fill (SVG / padded sources)

Usage:
  pip install pillow
  python scripts/generate-og-image.py                       # auto-detect (header first)
  python scripts/generate-og-image.py public/My-Logo.svg    # explicit source (wins)
  python scripts/generate-og-image.py --url https://site    # detect from live <header>/<nav>

Source resolution (first hit wins):
  1. CLI path argument (explicit override)
  2. Header/login logo detected in the project's UI markup — the <img> logo in
     header/nav/layout components (src or alt looks logo/brand/wordmark-like),
     resolved against public/. This is the PREFERRED source: the employer mark
     users see in the UI.
  3. Convention slots: public/logo-source.{png,jpg,jpeg,svg}, then logo-like
     filenames in public/.
  4. Favicon fallback: public/favicon-source.{ico,png,jpg}, favicon.ico,
     favicon.png — only when no header logo exists. Prints a loud warning;
     regenerate from the real UI logo once available (see BRAND_ICONS.md).

Outputs public/og-image.png and public/og-image.meta.json (sourceKind records
which tier produced the image).
See BRAND_ICONS.md.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

OG_WIDTH = 1200
OG_HEIGHT = 630
OG_BG = (255, 255, 255, 255)
COMPOSITE_FILL_RATIO = 0.90
TIGHT_MAX_TRIM_RATIO = 0.12
MIN_TIGHT_DIMENSION = 200
MIN_COMPOSITE_DIMENSION = 120
NEAR_WHITE_THRESHOLD = 250


def resolve_logo_path(raw: str) -> Path:
    path = Path(raw)
    if not path.is_absolute():
        path = Path.cwd() / path
    if path.exists():
        return path
    decoded = Path(unquote(str(path)))
    if not decoded.is_absolute():
        decoded = Path.cwd() / decoded
    if decoded.exists():
        return decoded
    raise SystemExit(f"Logo not found: {raw}")


# ---------------------------------------------------------------------------
# Source resolution — header logo first, favicon only as last resort.
# ---------------------------------------------------------------------------

import re
import urllib.request

IMG_TAG_RE = re.compile(r"<(?:img|Image)\b[^>]*?>", re.IGNORECASE | re.DOTALL)
SRC_ATTR_RE = re.compile(r"""src\s*=\s*(?:\{\s*)?["']([^"']+)["']""", re.IGNORECASE)
ALT_ATTR_RE = re.compile(r"""alt\s*=\s*(?:\{\s*)?["']([^"']+)["']""", re.IGNORECASE)
LOGO_NAME_RE = re.compile(r"logo|brand|wordmark|mark", re.IGNORECASE)
HEADER_FILE_RE = re.compile(r"header|nav|topbar|top-bar|masthead|banner|login", re.IGNORECASE)
SOURCE_EXTS = {".tsx", ".jsx", ".js", ".ts", ".astro", ".html", ".htm", ".vue", ".svelte"}
SKIP_DIRS = {"node_modules", ".git", ".next", ".vercel", "dist", "build", "out", "scripts", "public", "__pycache__"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".avif"}


def _src_to_public_file(src: str, public_dir: Path) -> Path | None:
    """Resolve an <img src> value against public/. Remote/_next runtime URLs → None."""
    candidate = unquote(src.split("?")[0].split("#")[0])
    if not candidate or candidate.startswith(("http://", "https://", "data:", "//")):
        return None
    if "/_next/" in candidate:
        return None
    candidate = candidate.lstrip("/")
    if candidate.startswith("public/"):
        candidate = candidate[len("public/"):]
    resolved = public_dir / candidate
    return resolved if resolved.is_file() else None


def _imgs_in(text: str) -> list[tuple[str, str]]:
    out = []
    for tag in IMG_TAG_RE.findall(text):
        src_m = SRC_ATTR_RE.search(tag)
        if not src_m:
            continue
        alt_m = ALT_ATTR_RE.search(tag)
        out.append((src_m.group(1), alt_m.group(1) if alt_m else ""))
    return out


def detect_header_logo(project_root: Path, public_dir: Path) -> tuple[Path, str] | None:
    """Find the logo <img> in the project's header/nav/login markup (the UI header).
    Pass 1: header-ish files — any local img there counts. Pass 2: any source file,
    logo-like src/alt only. Returns (file, display-source) or None."""
    hits: list[tuple[int, Path, str]] = []
    for path in sorted(project_root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in SOURCE_EXTS:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(project_root).parts):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        header_file = bool(HEADER_FILE_RE.search(path.name))
        for src, alt in _imgs_in(text):
            logo_like = bool(LOGO_NAME_RE.search(src) or LOGO_NAME_RE.search(alt))
            if not header_file and not logo_like:
                continue
            resolved = _src_to_public_file(src, public_dir)
            if resolved is None:
                continue
            score = (2 if header_file else 0) + (1 if logo_like else 0)
            hits.append((score, resolved, f"{resolved.relative_to(public_dir.parent)} (from {path.relative_to(project_root)})"))
    if not hits:
        return None
    hits.sort(key=lambda h: (-h[0], h[2]))
    best_score = hits[0][0]
    if len(hits) > 1 and sum(1 for h in hits if h[0] == best_score) > 1:
        print(f"WARN: multiple header logo candidates — using {hits[0][2]}", file=sys.stderr)
    return hits[0][1], hits[0][2]


def find_slot_logo(public_dir: Path) -> tuple[Path, str] | None:
    for name in ("logo-source.png", "logo-source.jpg", "logo-source.jpeg", "logo-source.svg"):
        p = public_dir / name
        if p.is_file():
            return p, f"public/{name}"
    for p in sorted(public_dir.iterdir()):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS and LOGO_NAME_RE.search(p.name):
            return p, f"public/{p.name}"
    return None


def find_favicon_source(public_dir: Path) -> tuple[Path, str] | None:
    for name in ("favicon-source.ico", "favicon-source.png", "favicon-source.jpg", "favicon.ico", "favicon.png"):
        p = public_dir / name
        if p.is_file():
            return p, f"public/{name}"
    return None


def fetch_logo_from_url(url: str, public_dir: Path) -> tuple[Path, str]:
    """Detect the logo from the live page's <header>/<nav> markup, then download it."""
    with urllib.request.urlopen(url, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    blocks = re.findall(r"<(?:header|nav)\b.*?</(?:header|nav)>", html, re.IGNORECASE | re.DOTALL)
    candidates: list[tuple[int, str]] = []
    for block in blocks:
        for src, alt in _imgs_in(block):
            candidates.append((1 if (LOGO_NAME_RE.search(src) or LOGO_NAME_RE.search(alt)) else 0, src))
    if not candidates:
        for src, alt in _imgs_in(html):
            if LOGO_NAME_RE.search(src) or LOGO_NAME_RE.search(alt):
                candidates.append((0, src))
    if not candidates:
        raise SystemExit(f"No <img> logo found in the header of {url}")
    candidates.sort(key=lambda c: -c[0])
    img_url = urllib.parse.urljoin(url, candidates[0][1])
    ext = Path(unquote(img_url.split("?")[0])).suffix.lower() or ".png"
    if ext not in IMAGE_EXTS:
        ext = ".png"
    dest = public_dir / f"og-logo-source{ext}"
    urllib.request.urlretrieve(img_url, dest)
    return dest, img_url


def resolve_source(cli_path: str | None, url: str | None, project_root: Path, public_dir: Path) -> tuple[Path, str, str]:
    """Returns (path, sourceKind, source-label). Header logo first, favicon last."""
    if cli_path:
        return resolve_logo_path(cli_path), "cli", cli_path
    if url:
        path, label = fetch_logo_from_url(url, public_dir)
        return path, "url", label
    found = detect_header_logo(project_root, public_dir)
    if found:
        path, label = found
        print(f"Header logo detected: {label}")
        return path, "header", label
    found = find_slot_logo(public_dir)
    if found:
        path, label = found
        print(f"Logo slot source: {label}")
        return path, "slot", label
    found = find_favicon_source(public_dir)
    if found:
        path, label = found
        print(
            f"WARN: no header logo found — favicon fallback {label}. "
            "BRAND_ICONS.md: og-image must come from the UI header/login logo; "
            "re-run once the logo exists.",
            file=sys.stderr,
        )
        return path, "favicon", label
    raise SystemExit(
        "No logo source found.\n"
        "  Pass the header/login logo path from the UI: python scripts/generate-og-image.py public/<logo>\n"
        "  Or drop it into public/ (logo-source.png / logo.*), or provide public/favicon-source.png."
    )


def rasterize_svg(svg_path: Path, public_dir: Path) -> Path:
    out_png = public_dir / "logo-og-raster.png"
    try:
        subprocess.run(
            ["qlmanage", "-t", "-s", "1024", "-o", str(public_dir), str(svg_path)],
            check=True,
            capture_output=True,
        )
        generated = public_dir / f"{svg_path.name}.png"
        if generated.exists():
            generated.rename(out_png)
            return out_png
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    raise SystemExit(
        f"Cannot rasterize SVG without qlmanage (macOS): {svg_path}\n"
        "Export a PNG/JPG logo or run on macOS."
    )


def prepare_logo(path: Path) -> Path:
    if path.suffix.lower() == ".svg":
        return rasterize_svg(path, path.parent)
    return path


def load_logo(path: Path) -> Image.Image:
    try:
        return Image.open(path).convert("RGBA")
    except OSError as exc:
        raise SystemExit(f"Cannot read logo: {path}\n{exc}") from exc


def _is_near_white(r: int, g: int, b: int, a: int) -> bool:
    if a < 8:
        return True
    return r >= NEAR_WHITE_THRESHOLD and g >= NEAR_WHITE_THRESHOLD and b >= NEAR_WHITE_THRESHOLD


def trim_logo(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()
    min_x, min_y, max_x, max_y = w, h, -1, -1

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if not _is_near_white(r, g, b, a):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return rgba

    return rgba.crop((min_x, min_y, max_x + 1, max_y + 1))


def is_tight_source(source_path: Path, original: Image.Image, trimmed: Image.Image) -> bool:
    if source_path.suffix.lower() == ".svg":
        return False

    original_area = max(1, original.width * original.height)
    trimmed_area = max(1, trimmed.width * trimmed.height)
    trim_ratio = 1 - (trimmed_area / original_area)

    if trim_ratio > TIGHT_MAX_TRIM_RATIO:
        return False
    if max(trimmed.width, trimmed.height) < MIN_TIGHT_DIMENSION:
        return False
    if min(trimmed.width, trimmed.height) < MIN_COMPOSITE_DIMENSION:
        return False
    return True


def build_tight_image(trimmed: Image.Image) -> tuple[Image.Image, tuple[int, int]]:
    return trimmed.convert("RGBA"), (trimmed.width, trimmed.height)


def scale_logo_to_fill(trimmed: Image.Image, max_w: int, max_h: int) -> Image.Image:
    """Scale logo up or down to the largest size that fits in max_w × max_h (90% canvas fill)."""
    w, h = trimmed.size
    if w < 1 or h < 1:
        return trimmed.copy()
    scale = min(max_w / w, max_h / h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    if (new_w, new_h) == (w, h):
        return trimmed.copy()
    return trimmed.resize((new_w, new_h), Image.Resampling.LANCZOS)


def build_composite_image(trimmed: Image.Image) -> tuple[Image.Image, tuple[int, int]]:
    canvas = Image.new("RGBA", (OG_WIDTH, OG_HEIGHT), OG_BG)
    max_w = int(OG_WIDTH * COMPOSITE_FILL_RATIO)
    max_h = int(OG_HEIGHT * COMPOSITE_FILL_RATIO)
    mark = scale_logo_to_fill(trimmed, max_w, max_h)
    x = (OG_WIDTH - mark.width) // 2
    y = (OG_HEIGHT - mark.height) // 2
    canvas.paste(mark, (x, y), mark)
    return canvas.convert("RGB"), (mark.width, mark.height)


def main() -> None:
    cli_path: str | None = None
    url: str | None = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--url":
            if i + 1 >= len(args):
                raise SystemExit("--url requires a URL")
            url = args[i + 1]
            i += 2
            continue
        if args[i].startswith("-"):
            raise SystemExit(f"Unknown option: {args[i]}")
        cli_path = args[i]
        i += 1

    project_root = Path.cwd()
    public_dir = project_root / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    logo_path, source_kind, source_label = resolve_source(cli_path, url, project_root, public_dir)
    source_is_svg = logo_path.suffix.lower() == ".svg"
    raster_path = prepare_logo(logo_path)
    original = load_logo(raster_path)
    trimmed = trim_logo(original)

    if min(trimmed.width, trimmed.height) < MIN_COMPOSITE_DIMENSION:
        print(
            f"WARN: source_under_{MIN_COMPOSITE_DIMENSION}px "
            f"({trimmed.width}x{trimmed.height}) — composite will upscale",
            file=sys.stderr,
        )

    if is_tight_source(logo_path, original, trimmed):
        mode = "tight"
        og_image, (logo_w, logo_h) = build_tight_image(trimmed)
        out_w, out_h = logo_w, logo_h
    else:
        mode = "composite"
        og_image, (logo_w, logo_h) = build_composite_image(trimmed)
        out_w, out_h = OG_WIDTH, OG_HEIGHT

    public = Path.cwd() / "public"
    public.mkdir(parents=True, exist_ok=True)
    out = public / "og-image.png"
    meta_path = public / "og-image.meta.json"

    if og_image.mode == "RGBA":
        og_image.save(out, format="PNG", optimize=True)
    else:
        og_image.save(out, format="PNG", optimize=True)

    meta = {
        "mode": mode,
        "width": out_w,
        "height": out_h,
        # audit-brand-assets.mjs resolves meta.source as a FILE PATH — strip the
        # "(from <markup>)" provenance suffix; keep full label in sourceLabel.
        "source": re.sub(r"\s*\(from [^)]*\)\s*$", "", source_label).strip(),
        "sourceLabel": source_label,
        "sourceKind": source_kind,
        "sourceIsSvg": source_is_svg,
        "logoBox": {"width": logo_w, "height": logo_h},
    }
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    if raster_path != logo_path and raster_path.name == "logo-og-raster.png" and raster_path.exists():
        raster_path.unlink()

    kb = out.stat().st_size / 1024
    print(
        f"Generated public/og-image.png mode={mode} canvas={out_w}x{out_h} "
        f"({kb:.1f} KB) from {source_label} [{source_kind}] — logo {logo_w}x{logo_h}px"
    )


if __name__ == "__main__":
    main()
