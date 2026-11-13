// Корзина OSETR FISH: товары, сохранение, отправка заказа в WhatsApp и Telegram.

// Куда уходят заказы. Появится ник в Telegram — впишите его без @, например 'osetrfish'.
const PHONE = '79627511999';
const TELEGRAM_USERNAME = '';

// step — шаг выбора: рыба по 0,5 кг, икра банками по 100 г (price — за одну единицу шага × 1).
const GOODS = [
  { id: 'osetr', name: 'Осётр копчёный', price: 3300, per: 'кг', unit: 'кг', step: 0.5, min: 0.5, note: 'На вес, от 0,5 кг', img: 'images/osetr.jpg', alt: 'Копчёный осётр: целый кусок и ломтики на тёмной доске' },
  { id: 'balyk', name: 'Балык осетровый', price: 5500, per: 'кг', unit: 'кг', step: 0.5, min: 0.5, note: 'На вес, от 0,5 кг', img: 'images/balyk.jpg', alt: 'Балык осетровый ломтиками на тёмной доске' },
  { id: 'ikra', name: 'Икра стерляди', price: 4400, per: '100 г', unit: 'банка', step: 1, min: 1, note: 'Банка 100 г', img: 'images/ikra.jpg', alt: 'Открытая банка икры стерляди OSETR FISH и ложка с икрой' },
];

const STORE_KEY = 'osetr-cart';
const byId = Object.fromEntries(GOODS.map((g) => [g.id, g]));
const rub = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';
const fmtQty = (g, q) => g.unit === 'кг'
  ? q.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' кг'
  : q + ' × 100 г';

let cart = load();
// Свои пожелания покупателя (то, чего нет в прайсе): строки текста, цену называет продавец.
const WISH_KEY = 'osetr-wishes';
let wishes = loadWishes();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return Object.fromEntries(Object.entries(raw).filter(([id, q]) => byId[id] && q > 0));
  } catch { return {}; }
}
function loadWishes() {
  try {
    const raw = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((w) => typeof w === 'string' && w.trim()) : [];
  } catch { return []; }
}
function saveWishes() {
  try { localStorage.setItem(WISH_KEY, JSON.stringify(wishes)); } catch { /* см. save() */ }
}
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch { /* приватный режим: корзина живёт до закрытия вкладки */ }
}

const $ = (s, root = document) => root.querySelector(s);
const icon = (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`;

function stepper(g, q, attr) {
  return `<span class="stepper">
    <button type="button" ${attr}="-" aria-label="Меньше" ${q <= g.min ? 'disabled' : ''}>${icon('minus')}</button>
    <output aria-live="polite">${fmtQty(g, q)}</output>
    <button type="button" ${attr}="+" aria-label="Больше">${icon('plus')}</button>
  </span>`;
}

// Прайс: у каждого товара свой выбор количества до добавления в корзину.
const picked = Object.fromEntries(GOODS.map((g) => [g.id, g.min]));

function renderGoods() {
  $('[data-goods]').innerHTML = GOODS.map((g) => `
    <li class="good" data-id="${g.id}">
      <img class="good__photo" src="${g.img}" alt="${g.alt}" width="300" height="168" loading="lazy" decoding="async">
      <div><h3 class="good__name">${g.name}</h3><p class="good__unit">${g.note}</p></div>
      <p class="good__price">${g.price.toLocaleString('ru-RU')} ₽<small>/${g.per}</small></p>
      <div class="good__buy">
        ${stepper(g, picked[g.id], 'data-pick')}
        <button class="btn btn--accent" type="button" data-add>${cart[g.id] ? 'Добавить ещё' : 'В корзину'}</button>
      </div>
    </li>`).join('');
}

function renderCart() {
  const ids = Object.keys(cart);
  const count = ids.length + wishes.length;
  const total = ids.reduce((s, id) => s + byId[id].price * cart[id], 0);

  const badge = $('[data-count]');
  badge.hidden = count === 0;
  badge.textContent = count;

  $('[data-empty]').hidden = count > 0;
  $('[data-filled]').hidden = count === 0;
  $('[data-total]').textContent = wishes.length ? `${rub(total)} + пожелания` : rub(total);
  $('[data-list]').innerHTML = ids.map((id) => {
    const g = byId[id];
    return `<li class="line" data-id="${id}">
      <span class="line__name">${g.name}</span>
      <span class="line__sum">${rub(g.price * cart[id])}</span>
      <span class="line__ctrl">${stepper(g, cart[id], 'data-qty')}</span>
      <button class="icon-btn" type="button" data-remove aria-label="Убрать ${g.name}">${icon('trash')}</button>
    </li>`;
  }).join('') + wishes.map((w, i) => `
    <li class="line" data-wish="${i}">
      <span class="line__name">${esc(w)}</span>
      <span class="line__sum line__sum--muted">цену назовёт продавец</span>
      <button class="icon-btn" type="button" data-remove-wish aria-label="Убрать пожелание">${icon('trash')}</button>
    </li>`).join('');

  // Окно чата внизу страницы: пустая корзина — пример, иначе — настоящий текст заказа.
  $('[data-preview]').textContent = count ? orderText() : orderText(EXAMPLE, false, []);
  $('[data-preview-label]').textContent = count ? 'ваш заказ' : 'пример заказа';
}

const EXAMPLE = { osetr: 1, ikra: 1 };

const round = (n) => Math.round(n * 10) / 10;

document.addEventListener('click', (e) => {
  const item = e.target.closest('[data-id]');
  const id = item && item.dataset.id;
  const g = id && byId[id];

  const pick = e.target.closest('[data-pick]');
  if (pick && g) {
    picked[id] = Math.max(g.min, round(picked[id] + (pick.dataset.pick === '+' ? g.step : -g.step)));
    renderGoods();
    return;
  }
  if (e.target.closest('[data-add]') && g) {
    cart[id] = round((cart[id] || 0) + picked[id]);
    save(); renderCart(); renderGoods();
    const badge = $('[data-count]');
    badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
    toast(`${g.name}, ${fmtQty(g, picked[id])}: в корзине`, true);
    return;
  }
  const qty = e.target.closest('[data-qty]');
  if (qty && g) {
    cart[id] = Math.max(g.min, round(cart[id] + (qty.dataset.qty === '+' ? g.step : -g.step)));
    save(); renderCart();
    return;
  }
  if (e.target.closest('[data-remove]') && g) {
    delete cart[id];
    save(); renderCart(); renderGoods();
    return;
  }
  const wishLine = e.target.closest('[data-wish]');
  if (wishLine && e.target.closest('[data-remove-wish]')) {
    wishes.splice(Number(wishLine.dataset.wish), 1);
    saveWishes(); renderCart();
    return;
  }
  const chip = e.target.closest('[data-wish-chip]');
  if (chip) {
    const what = $('[data-wish-what]');
    what.value = chip.textContent.trim();
    what.form.elements.amount.focus();
    return;
  }
  if (e.target.closest('[data-open-cart]')) { openCart(); return; }
  if (e.target.closest('[data-close-cart]')) { closeCart(); return; }

  const send = e.target.closest('[data-send]');
  if (send) sendOrder(send.dataset.send);
});

// Выезжающая панель корзины
const cartEl = $('[data-cart]');
let lastFocus = null;
function openCart() {
  lastFocus = document.activeElement;
  cartEl.hidden = false;
  requestAnimationFrame(() => cartEl.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
  $('[data-close-cart].icon-btn').focus();
}
function closeCart() {
  cartEl.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => { cartEl.hidden = true; }, 220);
  if (lastFocus) lastFocus.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cartEl.hidden) closeCart(); });

// Текст заказа для мессенджера
function orderText(items = cart, withForm = true, extra = wishes) {
  const ids = Object.keys(items);
  const total = ids.reduce((s, id) => s + byId[id].price * items[id], 0);
  const name = withForm ? $('[data-name]').value.trim() : '';
  const comment = withForm ? $('[data-comment]').value.trim() : '';
  const lines = ids.map((id, i) => {
    const g = byId[id];
    return `${i + 1}. ${g.name}: ${fmtQty(g, items[id])} = ${rub(g.price * items[id])}`;
  });
  extra.forEach((w) => lines.push(`${lines.length + 1}. ${w} (уточнить цену)`));
  return [
    'Здравствуйте! Хочу сделать заказ на сайте OSETR FISH:',
    ...lines,
    ids.length && `Итого примерно: ${rub(total)}${extra.length ? ' без учёта пожеланий' : ''}`,
    name && `Имя: ${name}`,
    comment && `Комментарий: ${comment}`,
  ].filter(Boolean).join('\n');
}

function copy(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

const tgLink = () => TELEGRAM_USERNAME ? `https://t.me/${TELEGRAM_USERNAME}` : `https://t.me/+${PHONE}`;

function sendOrder(where) {
  // Корзина пустая — просто открываем чат, без текста заказа.
  if (!Object.keys(cart).length && !wishes.length) {
    window.open(where === 'wa' ? `https://wa.me/${PHONE}` : tgLink(), '_blank', 'noopener');
    return;
  }
  const text = orderText();
  if (where === 'wa') {
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    return;
  }
  // Telegram не подставляет текст в личный чат по ссылке, поэтому копируем заказ и открываем чат.
  copy(text).then((ok) => toast(ok
    ? 'Текст заказа скопирован. Вставьте его в чат Telegram.'
    : 'Не получилось скопировать. Перепишите заказ в чат или закажите в WhatsApp.'));
  window.open(tgLink(), '_blank', 'noopener');
}

// Своё пожелание из формы под прайсом ложится в корзину отдельной строкой.
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-wish-form]');
  if (!form) return;
  e.preventDefault();
  const what = form.elements.what.value.trim();
  const amount = form.elements.amount.value.trim();
  if (!what) return;
  wishes.push(amount ? `${what}, ${amount}` : what);
  saveWishes(); renderCart();
  form.reset();
  const badge = $('[data-count]');
  badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
  toast(`${what}: в корзине`, true);
});

// Имя и комментарий из корзины сразу видны в окне чата.
document.addEventListener('input', (e) => { if (e.target.closest('[data-name], [data-comment]')) renderCart(); });

let toastTimer;
function toast(msg, withCart) {
  const el = $('[data-toast]');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), withCart ? 2200 : 4000);
}

// Осётр на первом экране вплывает, когда низ первого экрана (волна) попадает в кадр:
// сам осётр до начала анимации стоит за краем экрана, поэтому следим за волной.
const fish = $('.hero__fish');
const fishMark = $('.wave--hero');
if (fish && fishMark && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js');
  const go = () => fish.classList.add('is-in');
  new IntersectionObserver((entries, io) => {
    if (entries[0].isIntersecting) { go(); io.disconnect(); }
  }).observe(fishMark);
  if (matchMedia('(min-width: 901px)').matches) setTimeout(go, 1200);
}

// Осётр в профиль проплывает справа налево, пока человек листает первый экран вниз.
const swimmer = $('.swimmer');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
if (swimmer) {
  let ticking = false;
  const place = () => {
    ticking = false;
    const vw = innerWidth;
    const w = swimmer.offsetWidth;
    if (calm.matches) { swimmer.style.transform = `translateX(${(vw - w) / 2}px)`; return; }
    // Путь: сначала из-за правого края видна только морда, к моменту, когда рыба доходит до верха экрана, она уплывает влево.
    const top = swimmer.getBoundingClientRect().top + scrollY;
    const p = Math.min(1, Math.max(0, scrollY / Math.max(1, top - 80)));
    const start = vw - 60;
    const x = start - p * (start + w + 20);
    const y = Math.sin(p * Math.PI * 2) * 8;
    swimmer.style.transform = `translate(${x}px, ${y}px)`;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(place); } }, { passive: true });
  addEventListener('resize', place);
  place();
}

renderGoods();
renderCart();
