# Ms. Madrigral

A Commodore 64-style Spanish vocabulary game with a walking teacher, randomized vocabulary, and 500 English/Spanish word pairs.

## Web version

The browser version is now in the repository root:

- `index.html`
- `styles.css`
- `app.js`
- `vocab.csv`

It keeps the C64 look, shuffles all 500 words without repeats, supports click/tap or Space, speaks the Spanish side using the browser's Spanish voice, and has a responsive phone layout.

A GitHub Pages deployment workflow is included at `.github/workflows/pages.yml`.

Once GitHub Pages is enabled with **Settings → Pages → Source: GitHub Actions**, the expected project URL is:

`https://flesentine.github.io/msmadrigal/`

## C64 build

**V46 — MS. MADRIGRAL**

Features:

- 500 vocabulary words
- English → Spanish reveal
- sampled Spanish speech
- randomized vocabulary order with no repeats per 500-word round
- double-buffered speech packet loading
- Spanish intro after Ms. Madrigral walks to the board
- joystick FIRE (port 2) or SPACE controls
- C64 hardware sprites and 6510 machine-language hot paths

### Source

The current BASIC driver is in:

`src/ESPANOL64V46_MS_MADRIGRAL.bas`

### Running V46 in VICE

Attach the V46 D81 to drive 8, then:

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
