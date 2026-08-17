# Ms. Madrigal

A Commodore 64 Spanish vocabulary game with a walking teacher sprite, sampled speech, randomized vocabulary, and 500 English/Spanish word pairs.

## Current build

**V46 — MS. MADRIGRAL**

Features:

- 500 vocabulary words
- English → Spanish reveal
- sampled Spanish speech
- randomized vocabulary order with no repeats per 500-word round
- double-buffered speech packet loading
- Spanish intro after Ms. Madrigal walks to the board
- joystick FIRE (port 2) or SPACE controls
- C64 hardware sprites and 6510 machine-language hot paths

## Running in VICE

Attach `release/ESPANOL64V46_MS_MADRIGRAL.d81` to drive 8, then:

```text
LOAD "ESP500V46",8,1
RUN
```

Recommended VICE settings for fast speech packet loading:

- **Virtual Device Traps: ON**
- **True Drive Emulation: OFF**

## Files

- `src/ESPANOL64V46_MS_MADRIGRAL.bas` — BASIC source
- `release/ESPANOL64V46_MS_MADRIGRAL.prg` — main C64 program
- `release/ESPANOL64V46_MS_MADRIGRAL.d81` — complete 1581 disk image with speech packets
- `release/ESPANOL64V46_MS_MADRIGRAL_GAME.zip` — packaged release

## Notes

The D81 contains the main program plus 250 two-word speech packets used by the background prefetch system.
