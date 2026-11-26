import './ui.css';
import template from './ui.html?raw';
import { PoolGame } from './game.js';
import { UI } from './ui.js';

const root = document.getElementById('root') || document.body;
root.innerHTML = template;

const canvas = document.getElementById('game-canvas');
const ui = new UI();

let game = null;

// Two rAF hops let the loader (and the menu's entry animation) paint before the
// heavy scene work starts — the transition feels instant instead of janky.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    try {
      game = new PoolGame(canvas, ui);
      ui.game = game;
      UI.instance = ui;
      window.__pool = game;
      window.__ui = ui;
    } catch (err) {
      console.error(err);
      const boot = document.getElementById('boot');
      if (boot) {
        boot.innerHTML =
          '<div class="boot-inner"><div class="boot-label" style="letter-spacing:.06em;line-height:2.1">' +
          'مرورگر شما از WebGL پشتیبانی نمی‌کند<br/>Please enable WebGL / hardware acceleration</div></div>';
      }
      return;
    }

    const start = performance.now();
    const finish = () => {
      if (performance.now() - start < 380) return requestAnimationFrame(finish);
      ui.bootDone();
    };
    requestAnimationFrame(finish);
  });
});

// Safety net: never leave the loader in the way of the menu.
setTimeout(() => {
  const boot = document.getElementById('boot');
  if (boot) boot.classList.add('done');
}, 4500);

// Suspend on tab hide so audio and physics don't pile up.
document.addEventListener('visibilitychange', () => {
  if (!game) return;
  if (document.hidden) {
    if (game.mode !== 'menu' && game.mode !== 'over' && game.mode !== 'paused') game.pause();
  }
});
