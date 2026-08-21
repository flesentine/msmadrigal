(() => {
  'use strict';

  if (!document.documentElement.classList.contains('ios-native')) return;

  const overlay = document.getElementById('c64BootOverlay');
  const output = document.getElementById('c64BootOutput');
  const cursor = document.getElementById('c64BootCursor');
  if (!overlay || !output || !cursor) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = reduceMotion ? [
    [0, '**** COMMODORE 64 BASIC V2 ****\n\n64K RAM SYSTEM  38911 BASIC BYTES FREE\n\nREADY.\nLOAD"*",8,1\nSEARCHING FOR *\nLOADING\nREADY.\nRUN']
  ] : [
    [90,  '**** COMMODORE 64 BASIC V2 ****'],
    [520, '\n\n64K RAM SYSTEM  38911 BASIC BYTES FREE'],
    [1080,'\n\nREADY.'],
    [1480,'\nLOAD"*",8,1'],
    [2050,'\nSEARCHING FOR *'],
    [2550,'\nLOADING'],
    [3250,'\nREADY.'],
    [3540,'\nRUN'],
  ];

  let finished = false;
  const timers = [];

  function append(text) {
    output.textContent += text;
  }

  function finish() {
    if (finished) return;
    finished = true;
    cursor.classList.add('c64-boot-cursor-off');
    overlay.classList.add('c64-boot-done');
    window.setTimeout(() => overlay.remove(), reduceMotion ? 80 : 320);
  }

  for (const [delay, text] of steps) {
    timers.push(window.setTimeout(() => append(text), delay));
  }

  const total = reduceMotion ? 180 : 4100;
  timers.push(window.setTimeout(finish, total));

  // Let a user skip the nostalgia sequence if they want to get straight in.
  overlay.addEventListener('pointerdown', finish, { passive: true });

  window.addEventListener('pagehide', () => {
    for (const timer of timers) clearTimeout(timer);
  }, { once: true });
})();
