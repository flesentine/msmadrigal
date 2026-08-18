(() => {
  'use strict';

  const game = document.getElementById('game');
  const board = document.getElementById('board');
  const wordEl = document.getElementById('word');
  const progressEl = document.getElementById('progress');
  const promptEl = document.getElementById('prompt');
  const teacher = document.getElementById('teacher');
  const teacherSprite = document.getElementById('teacherSprite');
  const startOverlay = document.getElementById('startOverlay');
  const startButton = document.getElementById('startButton');
  const shuffleButton = document.getElementById('shuffleButton');
  const muteButton = document.getElementById('muteButton');

  let vocab = [];
  let deck = [];
  let deckPos = 0;
  let spanishSide = false;
  let started = false;
  let starting = false;
  let muted = false;
  let walkTimer = null;
  let spanishVoice = null;
  let loadError = null;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function parseCsvLine(line) {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        cells.push(cell);
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell);
    return cells;
  }

  function parseVocabularyCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    return lines.slice(1).filter(Boolean).map(line => {
      const [id, es, en, displayEs, displayEn] = parseCsvLine(line);
      return { id: Number(id), es, en, displayEs, displayEn };
    });
  }

  function chooseSpanishVoice() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    spanishVoice = voices.find(v => /^es(-|_)/i.test(v.lang) && /female|mujer|paulina|monica|luciana|helena|conchita/i.test(v.name))
      || voices.find(v => /^es(-|_)/i.test(v.lang))
      || null;
  }

  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newDeck() {
    deck = shuffle(vocab.map((_, i) => i));
    deckPos = 0;
    spanishSide = false;
    if (started) renderWord();
  }

  function currentId() {
    return deck[deckPos];
  }

  function renderWord() {
    if (!deck.length) return;
    const entry = vocab[currentId()];
    if (!entry) return;

    wordEl.textContent = spanishSide ? entry.displayEs : entry.displayEn;
    wordEl.classList.toggle('spanish', spanishSide);
    board.setAttribute('aria-label', spanishSide
      ? `${entry.es}. Click for next word.`
      : `${entry.en}. Click to reveal Spanish.`);
    progressEl.textContent = `${deckPos + 1} / ${deck.length}`;
    promptEl.textContent = spanishSide ? 'CLICK FOR NEXT WORD' : 'CLICK TO REVEAL SPANISH';
  }

  function stopSpeech() {
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function speak(text, options = {}) {
    if (!window.speechSynthesis || muted) return Promise.resolve();

    stopSpeech();
    return new Promise(resolve => {
      const u = new SpeechSynthesisUtterance(text);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        resolve();
      };

      u.lang = 'es-ES';
      u.rate = options.rate ?? 0.78;
      u.pitch = options.pitch ?? 1.02;
      u.volume = 1;
      if (spanishVoice) u.voice = spanishVoice;
      u.onend = finish;
      u.onerror = finish;

      // Some browser speech engines occasionally fail to fire onend.
      // Never let speech block the game UI indefinitely.
      const timeout = setTimeout(finish, Math.max(2200, text.length * 115));
      speechSynthesis.speak(u);
    });
  }

  function speakCurrent() {
    if (!deck.length) return Promise.resolve();
    return speak(vocab[currentId()].es, { rate: 0.82, pitch: 1.03 });
  }

  function setWalkFrame(frame) {
    teacherSprite.classList.toggle('frame-b', frame);
  }

  async function startClass() {
    if (started || starting) return;
    starting = true;

    try {
      if (!vocab.length) {
        promptEl.textContent = 'LOADING 500 WORDS...';
        startButton.textContent = 'LOADING...';
        await loadPromise;
      }

      if (loadError || vocab.length !== 500) {
        startButton.textContent = 'LOAD FAILED - REFRESH';
        promptEl.textContent = 'COULD NOT LOAD VOCABULARY';
        return;
      }

      started = true;
      startOverlay.classList.add('hidden');
      newDeck();
      wordEl.textContent = '';
      progressEl.textContent = '0 / 500';
      promptEl.textContent = 'MS. MADRIGRAL IS COMING...';

      teacher.classList.remove('arrived');
      teacher.classList.add('walking');
      let frame = false;
      walkTimer = setInterval(() => {
        frame = !frame;
        setWalkFrame(frame);
      }, 115);

      await sleep(1400);
      clearInterval(walkTimer);
      walkTimer = null;
      setWalkFrame(false);
      teacher.classList.remove('walking');
      teacher.classList.add('arrived');

      promptEl.textContent = 'HOLA...';
      await speak('Hola, soy la señorita Madrigral.', { rate: 0.76, pitch: 1.04 });
      await sleep(80);
      renderWord();
    } finally {
      starting = false;
    }
  }

  // Deliberately synchronous: clicking must never wait for speech playback.
  function advance() {
    if (!started || !deck.length) return;

    if (!spanishSide) {
      spanishSide = true;
      renderWord();
      void speakCurrent();
      return;
    }

    stopSpeech();
    spanishSide = false;
    deckPos++;
    if (deckPos >= deck.length) {
      deck = shuffle(deck);
      deckPos = 0;
    }
    renderWord();
  }

  async function loadGame() {
    try {
      const response = await fetch(`vocab.csv?v=48`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Vocabulary load failed: ${response.status}`);
      vocab = parseVocabularyCsv(await response.text());
      if (vocab.length !== 500) throw new Error(`Expected 500 vocabulary entries, got ${vocab.length}.`);

      chooseSpanishVoice();
      if (window.speechSynthesis && typeof speechSynthesis.addEventListener === 'function') {
        speechSynthesis.addEventListener('voiceschanged', chooseSpanishVoice, { once: true });
      }

      startButton.disabled = false;
      startButton.textContent = 'START CLASS';
      promptEl.textContent = 'CLICK / TAP / SPACE TO START';
    } catch (error) {
      loadError = error;
      console.error(error);
      startButton.disabled = false;
      startButton.textContent = 'LOAD FAILED - REFRESH';
      promptEl.textContent = 'COULD NOT LOAD VOCABULARY';
    }
  }

  // Start button AND the whole start overlay work.
  startButton.addEventListener('click', event => {
    event.stopPropagation();
    void startClass();
  });

  startOverlay.addEventListener('click', event => {
    if (event.target.closest('button') && event.target !== startButton) return;
    void startClass();
  });

  // Chalkboard is the primary mouse/touch control once class starts.
  board.addEventListener('click', event => {
    event.stopPropagation();
    advance();
  });

  shuffleButton.addEventListener('click', event => {
    event.stopPropagation();
    if (!started) return;
    stopSpeech();
    newDeck();
    promptEl.textContent = 'RESHUFFLED 500 WORDS';
    setTimeout(renderWord, 350);
  });

  muteButton.addEventListener('click', event => {
    event.stopPropagation();
    muted = !muted;
    if (muted) stopSpeech();
    muteButton.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    muteButton.setAttribute('aria-pressed', String(muted));
  });

  document.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.key === 'Enter') {
      // Enter on a focused control should keep normal button behavior.
      if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (!started) void startClass();
      else advance();
    } else if (event.key.toLowerCase() === 'r' && started) {
      event.preventDefault();
      stopSpeech();
      newDeck();
    }
  });

  // Clicking anywhere on the C64 screen advances too, except actual controls.
  game.addEventListener('click', event => {
    if (event.target.closest('.controls, .board, .start-overlay')) return;
    if (!started) void startClass();
    else advance();
  });

  const loadPromise = loadGame();
})();
