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

  let c64AudioIndex = null;
  let audioContext = null;
  const packPromises = new Map();
  let currentSource = null;
  let currentSourceDone = null;
  let speechSerial = 0;

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
    promptEl.textContent = spanishSide ? '' : 'CLICK: REVEAL SPANISH';
  }

  async function ensureAudioContext() {
    if (audioContext) {
      if (audioContext.state === 'suspended') {
        try { await audioContext.resume(); } catch (_) {}
      }
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioContext = new AudioContextClass();
      if (audioContext.state === 'suspended') {
        try { await audioContext.resume(); } catch (_) {}
      }
      return audioContext;
    } catch (error) {
      console.warn('Web Audio unavailable; using browser speech fallback.', error);
      return null;
    }
  }

  function stopCurrentSource() {
    const source = currentSource;
    currentSource = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch (_) {}
    }
    if (currentSourceDone) {
      const done = currentSourceDone;
      currentSourceDone = null;
      done();
    }
  }

  function stopSpeech() {
    speechSerial++;
    stopCurrentSource();
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function browserSpeak(text, options = {}) {
    if (!window.speechSynthesis || muted) return Promise.resolve();

    speechSynthesis.cancel();
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

      const timeout = setTimeout(finish, Math.max(2200, text.length * 115));
      speechSynthesis.speak(u);
    });
  }

  async function loadPack(packId) {
    if (!c64AudioIndex) return null;
    const key = String(packId);
    if (packPromises.has(key)) return packPromises.get(key);

    const filename = c64AudioIndex.packs?.[key];
    if (!filename) return null;

    const promise = (async () => {
      const context = await ensureAudioContext();
      if (!context) return null;
      const response = await fetch(`audio/${filename}?v=49`, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`C64 voice pack ${packId} failed: ${response.status}`);
      const bytes = await response.arrayBuffer();
      return context.decodeAudioData(bytes.slice(0));
    })().catch(error => {
      console.warn(error);
      packPromises.delete(key);
      return null;
    });

    packPromises.set(key, promise);
    return promise;
  }

  function prefetchTrack(trackKey) {
    const track = c64AudioIndex?.tracks?.[String(trackKey)];
    if (!track) return;
    void loadPack(track.pack);
  }

  async function playC64Track(trackKey, fallbackText, options = {}) {
    if (muted) return;

    const serial = ++speechSerial;
    const track = c64AudioIndex?.tracks?.[String(trackKey)];
    if (!track) {
      if (fallbackText) await browserSpeak(fallbackText, options);
      return;
    }

    const context = await ensureAudioContext();
    const buffer = context ? await loadPack(track.pack) : null;
    if (!buffer || muted || serial !== speechSerial) {
      if (!buffer && fallbackText && serial === speechSerial && !muted) {
        await browserSpeak(fallbackText, options);
      }
      return;
    }

    stopCurrentSource();
    if (window.speechSynthesis) speechSynthesis.cancel();

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    currentSource = source;

    const maxDuration = Math.max(0, buffer.duration - track.start);
    const duration = Math.min(track.duration, maxDuration);
    if (duration <= 0) return;

    let resolveDone;
    const donePromise = new Promise(resolve => { resolveDone = resolve; });
    currentSourceDone = resolveDone;

    source.onended = () => {
      if (currentSource === source) currentSource = null;
      if (currentSourceDone === resolveDone) currentSourceDone = null;
      resolveDone();
    };

    source.start(0, track.start, duration);
    if (options.wait) await donePromise;
  }

  function speakCurrent() {
    if (!deck.length) return;
    const entry = vocab[currentId()];
    if (!entry) return;
    void playC64Track(String(entry.id), entry.es, { rate: 0.82, pitch: 1.03 });
  }

  function prefetchCurrentAndNext() {
    if (!deck.length || !c64AudioIndex) return;
    const current = vocab[currentId()];
    if (current) prefetchTrack(String(current.id));
    const nextPos = (deckPos + 1) % deck.length;
    const next = vocab[deck[nextPos]];
    if (next) prefetchTrack(String(next.id));
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
        promptEl.textContent = 'LOAD FAILED';
        return;
      }

      await ensureAudioContext();

      started = true;
      startOverlay.classList.add('hidden');
      newDeck();
      prefetchTrack('intro');
      prefetchCurrentAndNext();

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
      await playC64Track('intro', 'Hola, soy la señorita Madrigral.', {
        rate: 0.76,
        pitch: 1.04,
        wait: true,
      });
      await sleep(60);
      renderWord();
    } finally {
      starting = false;
    }
  }

  function advance() {
    if (!started || !deck.length || starting) return;

    if (!spanishSide) {
      spanishSide = true;
      renderWord();
      speakCurrent();
      prefetchCurrentAndNext();
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
    prefetchCurrentAndNext();
  }

  async function loadGame() {
    try {
      const vocabRequest = fetch(`vocab.csv?v=49`, { cache: 'no-store' });
      const audioIndexRequest = fetch(`audio/c64-speech-index.json?v=49`, { cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .catch(() => null);

      const [response, audioIndex] = await Promise.all([vocabRequest, audioIndexRequest]);
      if (!response.ok) throw new Error(`Vocabulary load failed: ${response.status}`);

      vocab = parseVocabularyCsv(await response.text());
      if (vocab.length !== 500) throw new Error(`Expected 500 vocabulary entries, got ${vocab.length}.`);
      c64AudioIndex = audioIndex;

      chooseSpanishVoice();
      if (window.speechSynthesis && typeof speechSynthesis.addEventListener === 'function') {
        speechSynthesis.addEventListener('voiceschanged', chooseSpanishVoice, { once: true });
      }

      startButton.disabled = false;
      startButton.textContent = 'START CLASS';
      promptEl.textContent = c64AudioIndex
        ? 'C64 VOICE READY - CLICK / TAP'
        : 'CLICK / TAP TO START';
    } catch (error) {
      loadError = error;
      console.error(error);
      startButton.disabled = false;
      startButton.textContent = 'LOAD FAILED';
      promptEl.textContent = 'LOAD FAILED';
    }
  }

  startButton.addEventListener('click', event => {
    event.stopPropagation();
    void startClass();
  });

  startOverlay.addEventListener('click', event => {
    if (event.target.closest('button') && event.target !== startButton) return;
    void startClass();
  });

  board.addEventListener('click', event => {
    event.stopPropagation();
    advance();
  });

  shuffleButton.addEventListener('click', event => {
    event.stopPropagation();
    if (!started || starting) return;
    stopSpeech();
    newDeck();
    prefetchCurrentAndNext();
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
      if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (!started) void startClass();
      else advance();
    } else if (event.key.toLowerCase() === 'r' && started && !starting) {
      event.preventDefault();
      stopSpeech();
      newDeck();
      prefetchCurrentAndNext();
    }
  });

  game.addEventListener('click', event => {
    if (event.target.closest('.controls, .board, .start-overlay')) return;
    if (!started) void startClass();
    else advance();
  });

  const loadPromise = loadGame();
})();
