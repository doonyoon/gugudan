const screens = { start: document.querySelector('#start-screen'), game: document.querySelector('#game-screen'), result: document.querySelector('#result-screen') };
const ui = { time: document.querySelector('#time'), score: document.querySelector('#score'), streak: document.querySelector('#streak'), left: document.querySelector('#left-number'), right: document.querySelector('#right-number'), answer: document.querySelector('#answer'), feedback: document.querySelector('#feedback'), finalScore: document.querySelector('#final-score'), resultMessage: document.querySelector('#result-message') };
let level = 'easy', score = 0, streak = 0, timeLeft = 60, correctAnswer = 0, timerId = null, playing = false, audioContext = null;
const ranges = { easy: [2, 5], normal: [2, 9], hard: [2, 19] };

document.querySelectorAll('.difficulty-btn').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.difficulty-btn').forEach((item) => item.classList.remove('selected'));
  button.classList.add('selected'); level = button.dataset.level;
}));
document.querySelector('#start-btn').addEventListener('click', startGame);
document.querySelector('#restart-btn').addEventListener('click', showStart);
document.querySelector('#answer-form').addEventListener('submit', checkAnswer);

function showScreen(name) { Object.entries(screens).forEach(([key, element]) => element.classList.toggle('hidden', key !== name)); }
function startGame() {
  initAudio(); score = 0; streak = 0; timeLeft = 60; playing = true; updateStatus(); showScreen('game'); makeQuestion(); clearInterval(timerId);
  timerId = setInterval(() => { timeLeft -= 1; ui.time.textContent = timeLeft; if (timeLeft <= 0) endGame(); }, 1000);
}
function makeQuestion() {
  const [min, max] = ranges[level]; const left = randomNumber(min, max); const right = randomNumber(1, level === 'hard' ? 19 : 9);
  correctAnswer = left * right; ui.left.textContent = left; ui.right.textContent = right; ui.answer.value = '';
  window.setTimeout(() => ui.answer.focus({ preventScroll: true }), 50);
}
function checkAnswer(event) {
  event.preventDefault(); if (!playing || ui.answer.value === '') return;
  const userAnswer = Number(ui.answer.value);
  if (userAnswer === correctAnswer) {
    streak += 1; const earned = 10 + Math.min(streak - 1, 10); score += earned;
    showFeedback(`\uC815\uB2F5! +${earned}\uC810`, 'correct'); playCorrectSound();
  } else { streak = 0; showFeedback(`\uC544\uC26C\uC6CC\uC694! \uC815\uB2F5\uC740 ${correctAnswer}`, 'wrong'); playWrongSound(); }
  updateStatus(); makeQuestion();
}
function showFeedback(message, type) { ui.feedback.textContent = message; ui.feedback.className = `feedback ${type}`; }
function updateStatus() { ui.time.textContent = timeLeft; ui.score.textContent = score; ui.streak.textContent = streak; }
function endGame() {
  if (!playing) return; playing = false; clearInterval(timerId); ui.answer.blur(); ui.finalScore.textContent = `${score}\uC810`;
  ui.resultMessage.textContent = score >= 300 ? '\uAD6C\uAD6C\uB2E8 \uB9C8\uC2A4\uD130\uB124\uC694!' : score >= 150 ? '\uB300\uB2E8\uD574\uC694! \uC870\uAE08\uB9CC \uB354 \uB3C4\uC804\uD574 \uBD10\uC694.' : '\uC88B\uC740 \uC2DC\uC791\uC774\uC5D0\uC694! \uB2E4\uC2DC \uAE30\uB85D\uC744 \uB192\uC5EC \uBCFC\uAE4C\uC694?';
  showScreen('result'); playGameOverSound();
}
function showStart() { clearInterval(timerId); playing = false; ui.feedback.textContent = '\uC815\uB2F5\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694'; ui.feedback.className = 'feedback'; showScreen('start'); }

function initAudio() {
  if (!audioContext) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) audioContext = new AudioContext(); }
  if (audioContext?.state === 'suspended') audioContext.resume();
}
function playTone(frequency, start, duration, type = 'sine', volume = 0.2) {
  if (!audioContext) return; const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015); gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration + 0.02);
}
function playCorrectSound() { initAudio(); const now = audioContext?.currentTime ?? 0; playTone(523.25, now, .14, 'triangle', .24); playTone(659.25, now + .1, .15, 'triangle', .25); playTone(783.99, now + .2, .24, 'triangle', .28); }
function playWrongSound() { initAudio(); const now = audioContext?.currentTime ?? 0; playTone(180, now, .22, 'sawtooth', .18); playTone(125, now + .16, .35, 'sawtooth', .2); }
function playGameOverSound() {
  initAudio(); const now = audioContext?.currentTime ?? 0;
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((note, index) => playTone(note, now + index * .14, index === 4 ? .65 : .25, 'square', .2));
  playTone(130.81, now, .9, 'sine', .24);
}
function randomNumber(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
