// Корзина OSETR FISH: товары, сохранение, отправка заказа в WhatsApp и Telegram.

// Куда уходят заказы. Появится ник в Telegram — впишите его без @, например 'osetrfish'.
const PHONE = '79627511999';
const TELEGRAM_USERNAME = '';

// step — шаг выбора: балык по 0,5 кг, икра банками по 100 г, осётр целыми рыбами (kgEach — примерный вес одной рыбы, цена за кг).
const GOODS = [
  { id: 'osetr', slug: 'osetr-kopchenyj', name: 'Осётр копчёный', price: 3300, per: 'кг', unit: 'шт', kgEach: 2, step: 1, min: 1, note: 'Только целая рыба, около 2 кг', img: 'images/stock/osetr-blyudo.webp', ar: '841 / 567', pos: '50% 50%', alt: 'Целый копчёный осётр на стеклянном блюде с зеленью, лимоном и помидорами' },
  { id: 'balyk', slug: 'balyk-osetrovyj', name: 'Балык осетровый', price: 5500, per: 'кг', unit: 'кг', step: 0.5, min: 0.5, note: 'На вес, от 0,5 кг', img: 'images/stock/balyk-slate.jpg', ar: '1200 / 896', pos: '50% 50%', alt: 'Балык осетровый ломтиками на чёрной каменной доске с укропом и солью' },
  { id: 'ikra', slug: 'ikra-sterlyadi', name: 'Икра стерляди', price: 4400, per: '100 г', unit: 'банка', step: 1, min: 1, note: 'Банка 100 г', img: 'images/stock/ikra-sterlyadi-banka.jpg', ar: '1200 / 896', pos: '45% 50%', alt: 'Банка икры стерляди 100 г с зелёной крышкой OSETR FISH на каменной доске' },
  { id: 'ikra-osetr', slug: 'ikra-osetrovaya', name: 'Икра осетровая', price: 4600, per: '100 г', unit: 'банка', step: 1, min: 1, note: 'Банка 100 г', img: 'images/stock/ikra-osetrovaya-banka.jpg', ar: '1200 / 896', pos: '50% 50%', alt: 'Банка осетровой икры 100 г с зелёной крышкой OSETR FISH и ложечкой' },
];

const STORE_KEY = 'osetr-cart';
const byId = Object.fromEntries(GOODS.map((g) => [g.id, g]));
const rub = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';
const fmtQty = (g, q) => g.unit === 'кг'
  ? q.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' кг'
  : g.unit === 'шт'
    ? `${q} шт. (~${q * g.kgEach} кг)`
    : q + ' × 100 г';
// Сумма за количество: у целой рыбы — по примерному весу.
const cost = (g, q) => g.price * q * (g.kgEach || 1);

let cart = load();
// Свои пожелания покупателя (то, чего нет в прайсе): строки текста, цену называет продавец.
const WISH_KEY = 'osetr-wishes';
let wishes = loadWishes();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    // Старые корзины могли хранить осетра в килограммах, а он теперь продаётся целой рыбой.
    return Object.fromEntries(Object.entries(raw).filter(([id, q]) => byId[id] && q > 0)
      .map(([id, q]) => [id, byId[id].unit === 'шт' ? Math.max(1, Math.ceil(q)) : q]));
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
      <span class="good__photo" style="aspect-ratio: ${g.ar}"><img src="${g.img}" alt="${g.alt}" width="300" height="168" decoding="async"${g.pos ? ` style="object-position: ${g.pos}"` : ''}></span>
      <div><h3 class="good__name"><a href="/${g.slug}/">${g.name}</a></h3><p class="good__unit">${g.note}</p></div>
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
  const total = ids.reduce((s, id) => s + cost(byId[id], cart[id]), 0);

  const badge = $('[data-count]');
  badge.hidden = count === 0;
  badge.textContent = count;

  $('[data-empty]').hidden = count > 0;
  $('[data-filled]').hidden = count === 0;
  $('[data-total]').textContent = rub(total);
  $('[data-total-note]').hidden = !wishes.length;
  $('[data-list]').innerHTML = ids.map((id) => {
    const g = byId[id];
    return `<li class="line" data-id="${id}">
      <span class="line__name">${g.name}</span>
      <span class="line__sum">${rub(cost(g, cart[id]))}</span>
      <span class="line__ctrl">${stepper(g, cart[id], 'data-qty')}</span>
      <button class="icon-btn" type="button" data-remove aria-label="Убрать ${g.name}">${icon('trash')}</button>
    </li>`;
  }).join('') + wishes.map((w, i) => `
    <li class="line line--wish" data-wish="${i}">
      <span class="line__name">${esc(w)}</span>
      <span class="line__note">Своё пожелание, цену назовёт продавец</span>
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
  const arrow = e.target.closest('[data-strip]');
  if (arrow) {
    const track = $('[data-strip-track]');
    const step = track.querySelector('.card').offsetWidth + 24;
    track.scrollBy({ left: Number(arrow.dataset.strip) * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
  const total = ids.reduce((s, id) => s + cost(byId[id], items[id]), 0);
  const name = withForm ? $('[data-name]').value.trim() : '';
  const comment = withForm ? $('[data-comment]').value.trim() : '';
  const lines = ids.map((id, i) => {
    const g = byId[id];
    return `${i + 1}. ${g.name}: ${fmtQty(g, items[id])} = ${rub(cost(g, items[id]))}`;
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

// Видео из коптильни играет без звука, только пока его видно на экране.
const clip = $('[data-autoplay]');
if (clip && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) clip.play().catch(() => {}); else clip.pause();
  }, { threshold: 0.3 }).observe(clip);
} else if (clip) {
  clip.controls = true;
}

// Фото и видео из ленты открываются крупно, целиком, со стрелками и клавишами.
const lb = $('[data-lightbox]');
const lbCards = [...document.querySelectorAll('.card')];
let lbIndex = 0;
function lbShow(i) {
  lbIndex = (i + lbCards.length) % lbCards.length;
  const card = lbCards[lbIndex];
  const src = card.querySelector('img, video');
  const box = $('[data-lb-media]');
  box.innerHTML = '';
  if (src.tagName === 'VIDEO') {
    const v = document.createElement('video');
    Object.assign(v, { src: src.getAttribute('src'), poster: src.getAttribute('poster'), controls: true, autoplay: true, loop: true, playsInline: true });
    box.append(v);
  } else {
    const img = document.createElement('img');
    Object.assign(img, { src: src.getAttribute('src'), alt: src.alt });
    box.append(img);
  }
  $('[data-lb-caption]').innerHTML = card.querySelector('figcaption').innerHTML;
}
function lbOpen(card) {
  if (!lb || !lb.showModal) return;
  lbShow(lbCards.indexOf(card));
  lb.showModal();
}
if (lb) {
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-lb-open]');
    if (opener) { lbOpen(opener.closest('.card')); return; }
    if (!lb.open) return;
    const nav = e.target.closest('[data-lb]');
    if (nav) { lbShow(lbIndex + Number(nav.dataset.lb)); return; }
    if (e.target.closest('[data-lb-close]') || e.target === lb || e.target.closest('.lightbox__stage') === null && !e.target.closest('.icon-btn')) lb.close();
  });
  document.addEventListener('keydown', (e) => {
    const opener = e.target.closest && e.target.closest('[data-lb-open]');
    if (opener && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); lbOpen(opener.closest('.card')); return; }
    if (!lb.open) return;
    if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
  });
  // Закрыли — останавливаем видео.
  lb.addEventListener('close', () => { $('[data-lb-media]').innerHTML = ''; });
}

renderGoods();
renderCart();

// Со страницы товара ведёт ссылка /?cart=1 — сразу открываем корзину.
if (new URLSearchParams(location.search).has('cart')) {
  history.replaceState(null, '', location.pathname + location.hash);
  openCart();
}

// Нажали на логотип в шапке: рыбка вздрагивает хвостом, из неё поднимаются пузырьки.
const logo = $('.top .mark');
if (logo && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const body = logo.querySelector('.mark__fish');
  logo.addEventListener('click', () => {
    body.classList.remove('is-flick');
    void body.offsetWidth;
    body.classList.add('is-flick');
    for (let i = 0; i < 4; i++) {
      const b = document.createElement('span');
      b.className = 'mark__bub';
      b.style.animationDelay = `${i * 110}ms`;
      b.style.left = `${34 + Math.random() * 8}px`;
      b.style.setProperty('--bx', `${Math.round(Math.random() * 14 - 4)}px`);
      b.style.width = b.style.height = `${5 + Math.round(Math.random() * 4)}px`;
      logo.append(b);
      b.addEventListener('animationend', () => b.remove());
    }
  });
}

// Волна под первым экраном двигается при прокрутке: задняя уходит влево, передняя вправо.
const waveBack = $('.wave--hero .wave__back');
const waveFront = $('.wave--hero .wave__front');
if (waveBack && waveFront && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const make = (path, base, amp, period) => {
    let d = `M${-period} ${base}`;
    for (let x = -period; x <= 1440 + period; x += period / 36) {
      d += ` L${x.toFixed(1)} ${(base - amp * Math.sin((2 * Math.PI * x) / period)).toFixed(1)}`;
    }
    path.setAttribute('d', `${d} V220 H${-period}Z`);
  };
  const back = { path: waveBack, period: 1440, speed: -0.7 };
  const front = { path: waveFront, period: 960, speed: 1.1 };
  make(back.path, 116, 36, back.period);
  make(front.path, 174, 26, front.period);
  let ticking = false;
  const move = () => {
    ticking = false;
    const y = Math.min(scrollY, innerHeight * 1.5);
    for (const w of [back, front]) {
      const shift = (((y * w.speed) % w.period) + w.period) % w.period;
      w.path.style.transform = `translateX(${(-shift).toFixed(1)}px)`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
  move();
}
