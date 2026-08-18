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
  let locked = false;
  let muted = false;
  let walkTimer = null;
  let spanishVoice = null;

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
    return lines.slice(1).map(line => {
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

  function currentId() { return deck[deckPos]; }

  function renderWord() {
    if (!deck.length) return;
    const entry = vocab[currentId()];
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
      u.lang = 'es-ES';
      u.rate = options.rate ?? 0.78;
      u.pitch = options.pitch ?? 1.02;
      u.volume = 1;
      if (spanishVoice) u.voice = spanishVoice;
      u.onend = resolve;
      u.onerror = resolve;
      speechSynthesis.speak(u);
    });
  }

  function speakCurrent() {
    return speak(vocab[currentId()].es, { rate: 0.82, pitch: 1.03 });
  }

  function setWalkFrame(frame) {
    teacherSprite.classList.toggle('frame-b', frame);
  }

  async function startClass() {
    if (started || !vocab.length) return;
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
    await sleep(100);
    renderWord();
  }

  async function advance() {
    if (!started || locked || !deck.length) return;
    locked = true;
    try {
      if (!spanishSide) {
        spanishSide = true;
        renderWord();
        await speakCurrent();
      } else {
        stopSpeech();
        spanishSide = false;
        deckPos++;
        if (deckPos >= deck.length) {
          deck = shuffle(deck);
          deckPos = 0;
        }
        renderWord();
      }
    } finally {
      locked = false;
    }
  }

  async function loadGame() {
    try {
      const response = await fetch('vocab.csv');
      if (!response.ok) throw new Error(`Vocabulary load failed: ${response.status}`);
      vocab = parseVocabularyCsv(await response.text());
      if (vocab.length !== 500) throw new Error('Expected 500 vocabulary entries.');
      chooseSpanishVoice();
      if (window.speechSynthesis) {
        speechSynthesis.addEventListener?.('voiceschanged', chooseSpanishVoice, { once: true });
      }
      startButton.disabled = false;
      startButton.textContent = 'START CLASS';
    } catch (error) {
      console.error(error);
      startButton.textContent = 'LOAD FAILED — REFRESH';
      promptEl.textContent = 'COULD NOT LOAD VOCABULARY';
    }
  }

  board.addEventListener('click', advance);
  startButton.addEventListener('click', startClass);

  shuffleButton.addEventListener('click', event => {
    event.stopPropagation();
    if (!started || locked) return;
    stopSpeech();
    newDeck();
    promptEl.textContent = 'RESHUFFLED 500 WORDS';
    setTimeout(renderWord, 450);
  });

  muteButton.addEventListener('click', event => {
    event.stopPropagation();
    muted = !muted;
    if (muted) stopSpeech();
    muteButton.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    muteButton.setAttribute('aria-pressed', String(muted));
  });

  document.addEventListener('keydown', event => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (!started) startClass();
      else advance();
    } else if (event.key.toLowerCase() === 'r' && started && !locked) {
      event.preventDefault();
      stopSpeech();
      newDeck();
    }
  });

  game.addEventListener('click', event => {
    if (event.target.closest('.controls, .start-overlay, .board')) return;
    if (started) advance();
  });

  loadGame();
})();
