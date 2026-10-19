/* Quiet chapter fades. The latest request wins, including during an existing fade. */
(() => {
  let revision = 0;
  let transition = null;
  let animations = [];
  function clear() {
    transition?.skipTransition();
    transition = null;
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function run(apply, immediate = false) {
    const ticket = ++revision;
    clear();
    if (immediate || document.hidden) { apply(); return; }
    if (document.startViewTransition) {
      try {
        const next = document.startViewTransition(() => {
          if (ticket === revision) apply();
        });
        transition = next;
        next.ready.catch(() => {});
        next.finished.catch(() => {}).finally(() => {
          if (transition === next) transition = null;
        });
        return;
      } catch { /* Older browsers use the same fade without document snapshots. */ }
    }
    const surfaces = [...document.querySelectorAll('#stage,.mengsu-copy,.mengsu-caption')];
    const curve = 'cubic-bezier(.22,1,.36,1)';
    animations = surfaces.map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180, easing: curve, fill: 'forwards'
    }));
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (ticket !== revision) return;
      apply();
      animations.forEach(animation => animation.cancel());
      animations = surfaces.map(el => el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 300, easing: curve
      }));
      return Promise.all(animations.map(animation => animation.finished));
    }).catch(() => {}).finally(() => {
      if (ticket === revision) animations = [];
    });
  }
  window.MengsuChapterTransition = { run };
})();
