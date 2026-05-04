import { gameStore, publishRound, nextRound, revealAnswer, openAnswering } from "./game.js";

export function initShortcuts(callbacks = {}) {
  const { sendReactionSignal } = callbacks;

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.key === 'Escape') {
      const overlay = document.querySelector('.shortcut-overlay');
      if (overlay) overlay.classList.remove('visible');
      return;
    }

    if (!gameStore.isGame) return;

    const flash = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('shortcut-flash');
        setTimeout(() => el.classList.remove('shortcut-flash'), 300);
      }
    };

    switch (e.key) {
      case ' ':
        e.preventDefault();
        const pubBtn = document.getElementById('publishBtn');
        if (pubBtn && !pubBtn.disabled) {
          publishRound();
          flash('publishBtn');
        }
        break;
      case 'Enter':
        e.preventDefault();
        nextRound();
        flash('roundNav');
        break;
      case 'r':
      case 'R':
        const revBtn = document.getElementById('revealBtn');
        if (revBtn && !revBtn.disabled) {
          revealAnswer();
          flash('revealBtn');
        }
        break;
      case 's':
      case 'S':
        const sigBtn = document.getElementById('reactionSignalBtn');
        if (sigBtn && !sigBtn.disabled) {
          if (sendReactionSignal) sendReactionSignal();
          flash('reactionSignalBtn');
        }
        break;
      case 'a':
      case 'A':
        const openBtn = document.getElementById('openAnswerBtn');
        if (openBtn && !openBtn.disabled && openBtn.style.display !== 'none') {
          openAnswering();
          flash('openAnswerBtn');
        }
        break;
      case '?':
      case 'h':
      case 'H':
        const overlay = document.querySelector('.shortcut-overlay');
        if (overlay) overlay.classList.toggle('visible');
        break;
    }
  });
}
