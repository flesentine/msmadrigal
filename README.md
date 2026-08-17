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

## Source

The current BASIC driver is in:

`src/ESPANOL64V46_MS_MADRIGRAL.bas`

The finished build also contains binary sprite data, machine-language routines, vocabulary tables, the intro sample, and 250 external two-word speech packets packed into the D81 image.

## Running the current V46 build

Attach the V46 D81 to drive 8 in VICE, then:

```text
LOAD "ESP500V46",8,1
RUN
```

Recommended VICE settings for fast speech packet loading:

- **Virtual Device Traps: ON**
- **True Drive Emulation: OFF**

## V46 artifact checksums

```text
34ebc4712ddcfa4fd040e24379bda927e65ab30e35e2b929c8c8f17367998725  ESPANOL64V46_MS_MADRIGRAL.prg
0dc6575fdfb72ad60b8f5ab1bb70e758ac99b763393c62dd45f972b3c3c75883  ESPANOL64V46_MS_MADRIGRAL.d81
2c678045d1fa62708b90a521d21ddb487355f9691dce264da9c54e2d7240a207  ESPANOL64V46_MS_MADRIGRAL_GAME.zip
```
