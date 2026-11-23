// Переключатель дневной и ночной темы: выбор запоминается в этом браузере.
// Новая тема растёт кругом от кнопки (View Transitions), где браузер это умеет.
const KEY = 'osetr-theme';
const root = document.documentElement;
const btns = document.querySelectorAll('[data-theme-toggle]');
const calm = matchMedia('(prefers-reduced-motion: reduce)');

function paint() {
  const dark = root.dataset.theme === 'dark';
  btns.forEach((b) => {
    b.setAttribute('aria-checked', dark ? 'true' : 'false');
    b.setAttribute('aria-label', dark ? 'Дневная тема' : 'Ночная тема');
    b.title = dark ? 'Включить дневную тему' : 'Включить ночную тему';
  });
}

function apply(dark) {
  if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
  try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch { /* приватный режим: выбор не сохранится */ }
  paint();
}

btns.forEach((b) => b.addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  if (!document.startViewTransition || calm.matches) { apply(dark); return; }
  const r = b.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => apply(dark));
  vt.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(.22, .8, .24, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(() => {});
}));

paint();
