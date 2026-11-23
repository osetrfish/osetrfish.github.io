// Переключатель дневной и ночной темы: выбор запоминается в этом браузере.
const KEY = 'osetr-theme';
const root = document.documentElement;
const btns = document.querySelectorAll('[data-theme-toggle]');

function paint() {
  const dark = root.dataset.theme === 'dark';
  btns.forEach((b) => {
    b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    b.setAttribute('aria-label', dark ? 'Включить дневную тему' : 'Включить ночную тему');
    b.title = dark ? 'Дневная тема' : 'Ночная тема';
  });
}

btns.forEach((b) => b.addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
  try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch { /* приватный режим: выбор не сохранится */ }
  paint();
}));

paint();
