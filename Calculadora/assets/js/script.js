'use strict';

/* ===== Configurações ===== */
const MAX_DIGITS = 12;
const ERROR_TEXT = 'Erro';
const SYMBOLS = { add: '+', subtract: '−', multiply: '×', divide: '÷' };

/* ===== Estado da calculadora ===== */
const state = {
  current: '0',     // número que está sendo digitado (sempre com ponto decimal)
  previous: null,   // primeiro operando, guardado quando uma operação é escolhida
  operator: null,   // 'add' | 'subtract' | 'multiply' | 'divide'
  overwrite: false, // true = o próximo dígito substitui o valor atual
  expression: ''    // texto pequeno exibido acima do resultado
};

/* ===== Elementos ===== */
const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const keypad = document.querySelector('.keypad');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

/* ===== Funções auxiliares ===== */
function isError() {
  return state.current === ERROR_TEXT;
}

// Remove erros de ponto flutuante: 0.1 + 0.2 vira 0.3
function clean(number) {
  return String(parseFloat(number.toPrecision(12)));
}

// Formata no padrão brasileiro: 1234.5 vira "1.234,5"
function format(text) {
  if (text === ERROR_TEXT || text.includes('e')) {
    return text.replace('.', ',');
  }
  const negative = text.startsWith('-');
  const [integer, decimal] = text.replace('-', '').split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negative ? '-' : '') + grouped + (decimal !== undefined ? ',' + decimal : '');
}

// Faz a conta. Retorna null quando o resultado é inválido (ex.: divisão por zero)
function compute(a, b, operator) {
  const x = parseFloat(a);
  const y = parseFloat(b);
  let result;

  switch (operator) {
    case 'add':      result = x + y; break;
    case 'subtract': result = x - y; break;
    case 'multiply': result = x * y; break;
    case 'divide':
      if (y === 0) return null;
      result = x / y;
      break;
    default: return null;
  }

  return Number.isFinite(result) ? clean(result) : null;
}

function resetState() {
  state.current = '0';
  state.previous = null;
  state.operator = null;
  state.overwrite = false;
  state.expression = '';
}

function showError() {
  resetState();
  state.current = ERROR_TEXT;
  state.overwrite = true;
}

/* ===== Ações ===== */
function inputDigit(digit) {
  if (isError()) resetState();

  if (state.overwrite) {
    if (state.operator === null) state.expression = ''; // começou um cálculo novo
    state.current = digit;
    state.overwrite = false;
    return;
  }

  const digitCount = state.current.replace(/[-.]/g, '').length;
  if (digitCount >= MAX_DIGITS) return;

  if (state.current === '0') {
    state.current = digit;
  } else if (state.current === '-0') {
    state.current = '-' + digit;
  } else {
    state.current += digit;
  }
}

function inputDot() {
  if (isError()) resetState();

  if (state.overwrite) {
    if (state.operator === null) state.expression = '';
    state.current = '0.';
    state.overwrite = false;
    return;
  }

  if (!state.current.includes('.')) {
    state.current += '.';
  }
}

function chooseOperator(operator) {
  if (isError()) return;

  // Se já existe uma conta pendente, resolve antes de continuar (ex.: 2 + 3 + ...)
  if (state.operator && !state.overwrite) {
    const result = compute(state.previous, state.current, state.operator);
    if (result === null) return showError();
    state.previous = result;
    state.current = result;
  } else {
    state.previous = state.current;
  }

  state.operator = operator;
  state.overwrite = true;
  state.expression = `${format(state.previous)} ${SYMBOLS[operator]}`;
}

function equals() {
  if (isError() || state.operator === null || state.previous === null) return;

  const result = compute(state.previous, state.current, state.operator);
  if (result === null) return showError();

  state.expression = `${format(state.previous)} ${SYMBOLS[state.operator]} ${format(state.current)} =`;
  state.current = result;
  state.previous = null;
  state.operator = null;
  state.overwrite = true;
}

function toggleSign() {
  if (isError() || state.current === '0') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
}

/* Porcentagem contextual (igual à calculadora do celular):
   - 200 + 10 %  ->  10% de 200 = 20  (resultado 220)
   - 200 × 10 %  ->  10 / 100 = 0,1   (resultado 20)  */
function percent() {
  if (isError()) return;

  const value = parseFloat(state.current);
  const isAdditive = state.operator === 'add' || state.operator === 'subtract';

  if (isAdditive && state.previous !== null) {
    state.current = clean(parseFloat(state.previous) * value / 100);
  } else {
    state.current = clean(value / 100);
    state.overwrite = state.operator === null;
  }
}

function backspace() {
  if (isError() || state.overwrite) return;

  const isSingleDigit =
    state.current.length === 1 ||
    (state.current.length === 2 && state.current.startsWith('-'));

  state.current = isSingleDigit ? '0' : state.current.slice(0, -1);
}

/* ===== Display ===== */
function updateDisplay() {
  const text = format(state.current);

  resultEl.textContent = text;
  expressionEl.textContent = state.expression || '\u00A0';

  resultEl.classList.toggle('is-md', text.length > 9 && text.length <= 12);
  resultEl.classList.toggle('is-sm', text.length > 12);
}

/* ===== Botões ===== */
function handleButton(button) {
  const { digit, operator, action } = button.dataset;

  if (digit !== undefined) {
    inputDigit(digit);
  } else if (operator) {
    chooseOperator(operator);
  } else {
    switch (action) {
      case 'dot':     inputDot(); break;
      case 'equals':  equals(); break;
      case 'clear':   resetState(); break;
      case 'sign':    toggleSign(); break;
      case 'percent': percent(); break;
    }
  }

  updateDisplay();
}

keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) handleButton(button);
});

/* ===== Teclado físico ===== */
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  let key = event.key;
  if (key === ',') key = '.';
  if (key === '=') key = 'Enter';

  if (key === 'Backspace') {
    backspace();
    updateDisplay();
    return;
  }

  const button = keypad.querySelector(`[data-key="${key}"]`);
  if (!button) return;

  event.preventDefault();
  button.classList.add('is-pressed');
  setTimeout(() => button.classList.remove('is-pressed'), 120);
  handleButton(button);
});

/* ===== Tema claro / escuro ===== */
function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-checked', String(isDark));
  themeLabel.textContent = isDark ? 'Modo escuro' : 'Modo claro';
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (error) {
    // localStorage indisponível: usa a preferência do sistema
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem('theme', next);
  } catch (error) {
    // sem problema: o tema só não será lembrado
  }
});

/* ===== Início ===== */
applyTheme(getInitialTheme());
updateDisplay();
