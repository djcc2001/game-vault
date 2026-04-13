/**
 * inputHandler.js — Stickman Fight Legends Pro
 *
 * P1:  A/D=move  W=jump  S=defend  G=puño  H=patada  J=especial
 * P2:  ←/→=move  ↑=jump  ↓=defend  7=puño  8=patada  9=especial
 *      (también Numpad 7/8/9)
 */
const InputHandler = (() => {
  const keys = {}, prevKeys = {};

  function init() {
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',
           'Digit7','Digit8','Digit9','Numpad7','Numpad8','Numpad9'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Escape') window.dispatchEvent(new CustomEvent('game:togglePause'));
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
  }

  function endFrame()        { Object.assign(prevKeys, keys); }
  function isDown(c)         { return !!keys[c]; }
  function justPressed(c)    { return !!keys[c] && !prevKeys[c]; }

  function p1() {
    return {
      left:    isDown('KeyA'),
      right:   isDown('KeyD'),
      jump:    justPressed('KeyW'),
      defend:  isDown('KeyS'),
      attack:  justPressed('KeyG'),   // puño
      kick:    justPressed('KeyH'),   // patada
      special: justPressed('KeyJ'),   // especial
    };
  }

  function p2() {
    return {
      left:    isDown('ArrowLeft'),
      right:   isDown('ArrowRight'),
      jump:    justPressed('ArrowUp'),
      defend:  isDown('ArrowDown'),
      attack:  justPressed('Digit7') || justPressed('Numpad7'),  // puño
      kick:    justPressed('Digit8') || justPressed('Numpad8'),  // patada
      special: justPressed('Digit9') || justPressed('Numpad9'),  // especial
    };
  }

  return { init, endFrame, isDown, justPressed, p1, p2 };
})();
