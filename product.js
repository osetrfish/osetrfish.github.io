// Страница товара: «В корзину» кладёт товар в ту же корзину, что на главной (localStorage), и показывает счётчик в шапке.
const STORE_KEY = 'osetr-cart';
const WISH_KEY = 'osetr-wishes';

const read = (key, empty) => {
  try { return JSON.parse(localStorage.getItem(key) || empty); } catch { return JSON.parse(empty); }
};

function updateCount() {
  const badge = document.querySelector('[data-count]');
  if (!badge) return;
  const count = Object.keys(read(STORE_KEY, '{}')).length + read(WISH_KEY, '[]').length;
  badge.hidden = count === 0;
  badge.textContent = count;
}

const product = document.querySelector('[data-product]');
const addBtn = document.querySelector('[data-product-add]');
if (product && addBtn) {
  addBtn.addEventListener('click', () => {
    const id = product.dataset.product;
    const step = Number(product.dataset.step) || 1;
    const cart = read(STORE_KEY, '{}');
    cart[id] = Math.round(((cart[id] || 0) + step) * 10) / 10;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch { /* приватный режим: корзина не сохранится */ }
    updateCount();
    const badge = document.querySelector('[data-count]');
    badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
    document.querySelector('[data-product-done]').hidden = false;
    addBtn.lastChild.textContent = 'Добавить ещё';
  });
}

updateCount();
