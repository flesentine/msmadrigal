#!/usr/bin/env python3
import argparse
import array
import csv
import json
import math
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

TARGET_RATE = 4500
WORDS_PER_PACK = 50
INTER_CLIP_SILENCE_MS = 15
VOICE = "es+f3"
SPEED = "145"
PITCH = "56"
AMPLITUDE = "190"
INTRO = "Hola, soy Ms. Madrigral."


def find_synth():
    synth = shutil.which("espeak-ng") or shutil.which("espeak")
    if not synth:
        raise SystemExit("Need espeak-ng or espeak in PATH")
    return synth


def read_mono_16(path: Path):
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        width = wf.getsampwidth()
        rate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
    if width != 2:
        raise RuntimeError(f"Expected 16-bit eSpeak WAV, got {width * 8}-bit")
    samples = array.array("h")
    samples.frombytes(frames)
    if channels > 1:
        samples = array.array("h", samples[::channels])
    return list(samples), rate


def trim(samples, rate):
    if not samples:
        return [0]
    peak = max(abs(x) for x in samples) or 1
    threshold = max(220, int(peak * 0.012))
    active = [i for i, x in enumerate(samples) if abs(x) > threshold]
    if not active:
        return samples
    pad = int(rate * 0.035)
    lo = max(0, active[0] - pad)
    hi = min(len(samples), active[-1] + pad + 1)
    return samples[lo:hi]


def resample_linear(samples, source_rate, target_rate=TARGET_RATE):
    if source_rate == target_rate:
        return samples
    if len(samples) < 2:
        return samples
    out_len = max(1, round(len(samples) * target_rate / source_rate))
    scale = (len(samples) - 1) / max(1, out_len - 1)
    out = []
    for i in range(out_len):
        pos = i * scale
        j = int(pos)
        frac = pos - j
        if j + 1 < len(samples):
            value = samples[j] + (samples[j + 1] - samples[j]) * frac
        else:
            value = samples[j]
        out.append(int(value))
    return out


def c64_quantize(samples):
    # Approximate the C64 $D418 four-bit sample path: only 16 amplitude levels.
    peak = max((abs(x) for x in samples), default=1) or 1
    gain = min(1.0, 30000.0 / peak)
    out = bytearray()
    for s in samples:
        s = max(-32768, min(32767, int(s * gain)))
        u8 = (s + 32768) * 255 / 65535
        nibble = max(0, min(15, int(round(u8 * 15 / 255))))
        out.append(int(round(nibble * 255 / 15)))
    return bytes(out)


def synth_clip(synth, text):
    with tempfile.TemporaryDirectory() as td:
        wav_path = Path(td) / "speech.wav"
        cmd = [
            synth, "-v", VOICE, "-s", SPEED, "-p", PITCH, "-a", AMPLITUDE,
            "-z", "-w", str(wav_path), text,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        samples, source_rate = read_mono_16(wav_path)
    samples = trim(samples, source_rate)
    samples = resample_linear(samples, source_rate)
    return c64_quantize(samples)


def write_pack(path, pcm):
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(1)
        wf.setframerate(TARGET_RATE)
        wf.writeframes(pcm)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--vocab", default="vocab.csv")
    parser.add_argument("--out", default="_site/audio")
    args = parser.parse_args()

    vocab_path = Path(args.vocab)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    with vocab_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if len(rows) != 500:
        raise SystemExit(f"Expected 500 words, found {len(rows)}")

    synth = find_synth()
    silence = bytes([128]) * round(TARGET_RATE * INTER_CLIP_SILENCE_MS / 1000)
    index = {
        "version": 1,
        "sampleRate": TARGET_RATE,
        "voice": "C64-style 4-bit eSpeak",
        "packs": {},
        "tracks": {},
    }

    total_packs = math.ceil(len(rows) / WORDS_PER_PACK)
    for pack_id in range(total_packs):
        pcm = bytearray()
        cursor = 0

        if pack_id == 0:
            clip = synth_clip(synth, INTRO)
            index["tracks"]["intro"] = {
                "pack": pack_id,
                "start": cursor / TARGET_RATE,
                "duration": len(clip) / TARGET_RATE,
            }
            pcm += clip
            cursor += len(clip)
            pcm += silence
            cursor += len(silence)

        lo = pack_id * WORDS_PER_PACK
        hi = min(len(rows), lo + WORDS_PER_PACK)
        for i in range(lo, hi):
            word_id = int(rows[i]["index"])
            if word_id != i:
                raise SystemExit(f"Vocabulary IDs must be sequential: row {i} has ID {word_id}")
            clip = synth_clip(synth, rows[i]["spanish"])
            index["tracks"][str(word_id)] = {
                "pack": pack_id,
                "start": cursor / TARGET_RATE,
                "duration": len(clip) / TARGET_RATE,
            }
            pcm += clip
            cursor += len(clip)
            pcm += silence
            cursor += len(silence)

        filename = f"c64-speech-{pack_id}.wav"
        write_pack(out_dir / filename, bytes(pcm))
        index["packs"][str(pack_id)] = filename
        print(f"built {filename}: {len(pcm)} bytes")

    (out_dir / "c64-speech-index.json").write_text(
        json.dumps(index, separators=(",", ":")), encoding="utf-8"
    )
    print("built 500 C64-style samples + intro")


if __name__ == "__main__":
    main()
