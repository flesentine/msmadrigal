#!/usr/bin/env python3
"""Scale opaque RGB/RGBA PNGs with nearest-neighbor using only stdlib.

This avoids macOS sips color-conversion surprises when generating pixel-art
AppIcon assets. Outputs are always 8-bit RGB PNGs with no alpha channel.
"""

from __future__ import annotations

import binascii
import struct
import sys
import zlib
from pathlib import Path

PNG_SIG = b"\x89PNG\r\n\x1a\n"


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png(path: Path) -> tuple[int, int, bytes]:
    data = path.read_bytes()
    if not data.startswith(PNG_SIG):
        raise SystemExit(f"{path}: not a PNG file")

    pos = len(PNG_SIG)
    width = height = bit_depth = color_type = interlace = None
    idat = bytearray()

    while pos + 12 <= len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        payload = data[pos + 8:pos + 8 + length]
        pos += 12 + length

        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
                ">IIBBBBB", payload
            )
            if compression != 0 or filter_method != 0:
                raise SystemExit(f"{path}: unsupported PNG compression/filter method")
        elif kind == b"IDAT":
            idat.extend(payload)
        elif kind == b"IEND":
            break

    if None in (width, height, bit_depth, color_type, interlace):
        raise SystemExit(f"{path}: missing IHDR")
    if bit_depth != 8 or color_type not in (2, 6) or interlace != 0:
        raise SystemExit(
            f"{path}: expected non-interlaced 8-bit RGB/RGBA PNG; "
            f"got bit_depth={bit_depth}, color_type={color_type}, interlace={interlace}"
        )

    channels = 3 if color_type == 2 else 4
    stride = width * channels
    raw = zlib.decompress(bytes(idat))
    expected = height * (stride + 1)
    if len(raw) != expected:
        raise SystemExit(f"{path}: unexpected decoded PNG size {len(raw)} (expected {expected})")

    rows: list[bytearray] = []
    offset = 0
    prev = bytearray(stride)
    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        scan = bytearray(raw[offset:offset + stride])
        offset += stride
        recon = bytearray(stride)

        for i, value in enumerate(scan):
            left = recon[i - channels] if i >= channels else 0
            up = prev[i]
            up_left = prev[i - channels] if i >= channels else 0
            if filter_type == 0:
                recon[i] = value
            elif filter_type == 1:
                recon[i] = (value + left) & 0xFF
            elif filter_type == 2:
                recon[i] = (value + up) & 0xFF
            elif filter_type == 3:
                recon[i] = (value + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                recon[i] = (value + paeth(left, up, up_left)) & 0xFF
            else:
                raise SystemExit(f"{path}: unsupported PNG filter {filter_type}")

        rows.append(recon)
        prev = recon

    rgb = bytearray(width * height * 3)
    out = 0
    for row in rows:
        for x in range(width):
            src = x * channels
            if channels == 4 and row[src + 3] != 255:
                raise SystemExit(f"{path}: AppIcon source must be fully opaque")
            rgb[out:out + 3] = row[src:src + 3]
            out += 3

    return width, height, bytes(rgb)


def chunk(kind: bytes, payload: bytes) -> bytes:
    body = kind + payload
    return struct.pack(">I", len(payload)) + body + struct.pack(">I", binascii.crc32(body) & 0xFFFFFFFF)


def write_png(path: Path, width: int, height: int, rgb: bytes) -> None:
    stride = width * 3
    scanlines = bytearray()
    for y in range(height):
        scanlines.append(0)
        start = y * stride
        scanlines.extend(rgb[start:start + stride])

    payload = bytearray(PNG_SIG)
    payload.extend(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)))
    payload.extend(chunk(b"IDAT", zlib.compress(bytes(scanlines), 9)))
    payload.extend(chunk(b"IEND", b""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def scale_nearest(src_w: int, src_h: int, rgb: bytes, dst_w: int, dst_h: int) -> bytes:
    out = bytearray(dst_w * dst_h * 3)
    for y in range(dst_h):
        sy = min(src_h - 1, (y * src_h) // dst_h)
        for x in range(dst_w):
            sx = min(src_w - 1, (x * src_w) // dst_w)
            src = (sy * src_w + sx) * 3
            dst = (y * dst_w + x) * 3
            out[dst:dst + 3] = rgb[src:src + 3]
    return bytes(out)


def validate_colorful(path: Path) -> tuple[int, int, int]:
    width, height, rgb = read_png(path)
    colors = {rgb[i:i + 3] for i in range(0, len(rgb), 3)}
    non_black = sum(1 for i in range(0, len(rgb), 3) if rgb[i:i + 3] != b"\x00\x00\x00")
    if len(colors) < 16 or non_black < (width * height) // 10:
        raise SystemExit(
            f"{path}: icon looks blank/monochrome (colors={len(colors)}, non_black={non_black})"
        )
    return width, height, len(colors)


def main() -> int:
    if len(sys.argv) == 3 and sys.argv[1] == "--validate":
        path = Path(sys.argv[2])
        width, height, colors = validate_colorful(path)
        print(f"{path}: OK ({width}x{height}, RGB, {colors} colors)")
        return 0

    if len(sys.argv) != 4:
        print(f"usage: {sys.argv[0]} SOURCE.png OUTPUT.png SIZE", file=sys.stderr)
        print(f"       {sys.argv[0]} --validate IMAGE.png", file=sys.stderr)
        return 2

    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    size = int(sys.argv[3])
    if size <= 0:
        raise SystemExit("SIZE must be positive")

    src_w, src_h, rgb = read_png(source)
    if src_w != src_h:
        raise SystemExit(f"{source}: AppIcon source must be square")
    scaled = scale_nearest(src_w, src_h, rgb, size, size)
    write_png(output, size, size, scaled)
    validate_colorful(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
