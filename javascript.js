const WHATSAPP_BASE = "https://wa.me/5511960623250";

const overlay = document.getElementById("modalOverlay");
const modalImg = document.getElementById("modalImg");
const modalTitulo = document.getElementById("modalTitulo");
const modalDescricao = document.getElementById("modalDescricao");
const modalPreco = document.getElementById("modalPreco");
const modalWhats = document.getElementById("modalWhats");
const modalFechar = document.getElementById("modalFechar");

function abrirModal(botao) {
  const nome = botao.dataset.nome || "";
  modalImg.src = botao.dataset.img || "";
  modalImg.alt = nome;
  modalTitulo.textContent = nome;
  modalDescricao.textContent = botao.dataset.descricao || "";
  modalPreco.textContent = botao.dataset.preco || "";
  modalWhats.href =
    WHATSAPP_BASE +
    "?text=" +
    encodeURIComponent("Olá, gostaria de saber mais sobre: " + nome);
  overlay.classList.add("aberto");
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  overlay.classList.remove("aberto");
  document.body.style.overflow = "";
}

document.querySelectorAll(".saiba-mais").forEach(function (botao) {
  botao.addEventListener("click", function () {
    abrirModal(botao);
  });
});

modalFechar.addEventListener("click", fecharModal);

overlay.addEventListener("click", function (evento) {
  if (evento.target === overlay) fecharModal();
});

document.addEventListener("keydown", function (evento) {
  if (evento.key === "Escape") fecharModal();
});

// Link do menu ativo conforme a seção visível
const links = Array.from(document.querySelectorAll(".navbar li a"));
const secoes = links
  .map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  })
  .filter(Boolean);

if ("IntersectionObserver" in window && secoes.length) {
  const observador = new IntersectionObserver(
    function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle(
            "ativo",
            link.getAttribute("href") === "#" + entrada.target.id
          );
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  secoes.forEach(function (secao) {
    observador.observe(secao);
  });
}

// ==========================================
// SOUND LAB & PIANO INTERATIVO ($$? EXPERIENCE)
// ==========================================
const LAB_NOTES = {
  'C4':  { pt: 'Dó',   freq: 261.63, kbd: 'A' },
  'C#4': { pt: 'Dó#',  freq: 277.18, kbd: 'W' },
  'D4':  { pt: 'Ré',   freq: 293.66, kbd: 'S' },
  'D#4': { pt: 'Ré#',  freq: 311.13, kbd: 'E' },
  'E4':  { pt: 'Mi',   freq: 329.63, kbd: 'D' },
  'F4':  { pt: 'Fá',   freq: 349.23, kbd: 'F' },
  'F#4': { pt: 'Fá#',  freq: 369.99, kbd: 'T' },
  'G4':  { pt: 'Sol',  freq: 392.00, kbd: 'G' },
  'G#4': { pt: 'Sol#', freq: 415.30, kbd: 'Y' },
  'A4':  { pt: 'Lá',   freq: 440.00, kbd: 'H' },
  'A#4': { pt: 'Lá#',  freq: 466.16, kbd: 'U' },
  'B4':  { pt: 'Si',   freq: 493.88, kbd: 'J' },
  'C5':  { pt: 'Dó 5', freq: 523.25, kbd: 'K' }
};

const KEY_MAP = {
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
  'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
  'u': 'A#4', 'j': 'B4', 'k': 'C5'
};

let labAudioCtx = null;
let labAnalyser = null;
let labDataArray = null;
let labBufferLength = 0;
let labTotalNotesCount = 0;
let isLabVisualizerActive = false;

function initLabAudio() {
  if (!labAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    labAudioCtx = new AudioContextClass();
    labAnalyser = labAudioCtx.createAnalyser();
    labAnalyser.fftSize = 512;
    labAnalyser.smoothingTimeConstant = 0.82;
    labBufferLength = labAnalyser.frequencyBinCount;
    labDataArray = new Uint8Array(labBufferLength);
    labAnalyser.connect(labAudioCtx.destination);
    startLabOscilloscope();
  }
  if (labAudioCtx.state === 'suspended') {
    labAudioCtx.resume();
  }
}

function playLabNote(noteKey, duration = 0.45) {
  const noteInfo = LAB_NOTES[noteKey];
  if (!noteInfo) return;
  initLabAudio();

  const osc = labAudioCtx.createOscillator();
  const gainNode = labAudioCtx.createGain();
  const waveformSelect = document.getElementById('labWaveform');
  osc.type = waveformSelect ? waveformSelect.value : 'sawtooth';
  osc.frequency.setValueAtTime(noteInfo.freq, labAudioCtx.currentTime);

  const now = labAudioCtx.currentTime;
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gainNode);
  gainNode.connect(labAnalyser);

  osc.start(now);
  osc.stop(now + duration);

  highlightLabKey(noteKey);

  const noteBadge = document.getElementById('labNoteActive');
  if (noteBadge) {
    noteBadge.textContent = `${noteInfo.pt} (${noteInfo.freq.toFixed(1)} Hz)`;
  }

  labTotalNotesCount++;
  const countEl = document.getElementById('labNotesCount');
  if (countEl) {
    countEl.textContent = `${labTotalNotesCount} ${labTotalNotesCount === 1 ? 'nota tocada' : 'notas tocadas'}`;
  }
}

function highlightLabKey(noteKey) {
  const keyEl = document.querySelector(`[data-note="${noteKey}"]`);
  if (keyEl) {
    keyEl.classList.add('active');
    setTimeout(() => keyEl.classList.remove('active'), 220);
  }
}

function startLabOscilloscope() {
  if (isLabVisualizerActive) return;
  const canvas = document.getElementById('labOscilloscope');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  isLabVisualizerActive = true;

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth || 600;
    canvas.height = 100;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function render() {
    requestAnimationFrame(render);
    if (!labAnalyser || !labDataArray) return;

    labAnalyser.getByteTimeDomainData(labDataArray);

    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#e10600';
    ctx.shadowColor = '#e10600';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const sliceWidth = canvas.width / labBufferLength;
    let x = 0;

    for (let i = 0; i < labBufferLength; i++) {
      const v = labDataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  render();
}

// Interação com as teclas (mouse e touch)
document.querySelectorAll('.piano-key-natural, .piano-key-sharp').forEach(function(keyEl) {
  keyEl.addEventListener('mousedown', function(e) {
    e.stopPropagation();
    const note = keyEl.dataset.note;
    if (note) playLabNote(note);
  });

  keyEl.addEventListener('touchstart', function(e) {
    e.stopPropagation();
    e.preventDefault();
    const note = keyEl.dataset.note;
    if (note) playLabNote(note);
  }, { passive: false });
});

// Atalhos de teclado
const pressedKeys = new Set();
window.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (KEY_MAP[k] && !pressedKeys.has(k)) {
    pressedKeys.add(k);
    playLabNote(KEY_MAP[k]);
  }
});

window.addEventListener('keyup', function(e) {
  const k = e.key.toLowerCase();
  pressedKeys.delete(k);
});

// Melodia de demonstração estilizada (Riff Dark Streetwear)
const DEMO_RIFF = [
  { note: 'C4', dur: 230 },
  { note: 'D#4', dur: 230 },
  { note: 'G4', dur: 260 },
  { note: 'A#4', dur: 320 },
  { note: 'G4', dur: 230 },
  { note: 'D#4', dur: 230 },
  { note: 'F4', dur: 270 },
  { note: 'D#4', dur: 230 },
  { note: 'D4', dur: 230 },
  { note: 'C4', dur: 480 }
];

let isPlayingDemo = false;
const btnDemo = document.getElementById('labBtnDemo');
if (btnDemo) {
  btnDemo.addEventListener('click', function() {
    if (isPlayingDemo) return;
    isPlayingDemo = true;
    btnDemo.disabled = true;
    btnDemo.textContent = '▶ Tocando Beat...';

    let delay = 0;
    DEMO_RIFF.forEach((step, idx) => {
      setTimeout(() => {
        playLabNote(step.note, step.dur / 1000 + 0.1);
        if (idx === DEMO_RIFF.length - 1) {
          setTimeout(() => {
            isPlayingDemo = false;
            btnDemo.disabled = false;
            btnDemo.textContent = '▶ Tocar Beat / Riff';
          }, step.dur);
        }
      }, delay);
      delay += step.dur;
    });
  });
}

// Nota aleatória
const btnRandom = document.getElementById('labBtnRandom');
if (btnRandom) {
  btnRandom.addEventListener('click', function() {
    const keys = Object.keys(LAB_NOTES);
    const randomNote = keys[Math.floor(Math.random() * keys.length)];
    playLabNote(randomNote);
  });
}

// ==========================================
// CONTROLADOR DA TELA DE INTRODUÇÃO (THE GAME)
// ==========================================
const introScreen = document.getElementById('introScreen');
const introSkipBtn = document.getElementById('introSkipBtn');
const btnIntroAcessar = document.getElementById('btnIntroAcessar');
const btnIntroSolzin = document.getElementById('btnIntroSolzin');
const btnIntroSobre = document.getElementById('btnIntroSobre');
const btnIntroProdutos = document.getElementById('btnIntroProdutos');
const navBtnOpenIntro = document.getElementById('navBtnOpenIntro');

function fecharIntro() {
  if (!introScreen) return;
  introScreen.classList.add('fechando');
  setTimeout(() => {
    introScreen.style.display = 'none';
    document.body.style.overflow = '';
  }, 420);
}

function abrirIntro() {
  if (!introScreen) return;
  introScreen.style.display = 'flex';
  void introScreen.offsetWidth;
  introScreen.classList.remove('fechando');
  document.body.style.overflow = 'hidden';
}

if (introScreen && !introScreen.classList.contains('fechando')) {
  document.body.style.overflow = 'hidden';
}

if (introSkipBtn) {
  introSkipBtn.addEventListener('click', fecharIntro);
}

if (navBtnOpenIntro) {
  navBtnOpenIntro.addEventListener('click', abrirIntro);
}

// Botão: Acessar o Site
if (btnIntroAcessar) {
  btnIntroAcessar.addEventListener('click', function() {
    fecharIntro();
    const topoEl = document.getElementById('topo');
    if (topoEl) {
      topoEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Botão: Faça um Solzin Ae (Sound Lab)
if (btnIntroSolzin) {
  btnIntroSolzin.addEventListener('click', function() {
    fecharIntro();
    const soundLabEl = document.getElementById('experiencia');
    if (soundLabEl) {
      soundLabEl.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        playLabNote('C4', 0.6);
      }, 450);
    }
  });
}

// Botão: Sobre a Marca
if (btnIntroSobre) {
  btnIntroSobre.addEventListener('click', function() {
    fecharIntro();
    const sobreEl = document.getElementById('sobre');
    if (sobreEl) {
      sobreEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Botão: Ver Produtos
if (btnIntroProdutos) {
  btnIntroProdutos.addEventListener('click', function() {
    fecharIntro();
    const produtosEl = document.getElementById('produtos');
    if (produtosEl) {
      produtosEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

