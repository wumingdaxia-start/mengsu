(() => {
  'use strict';
  if (parent === window) return;
  let parentOrigin;
  try {
    parentOrigin = new URL(document.referrer).origin;
    const allowedParents = ['http://127.0.0.1:8000', 'http://localhost:8000'];
    if (parentOrigin !== location.origin && !allowedParents.includes(parentOrigin)) return;
  } catch { return; }
  document.documentElement.dataset.mengsuEmbed = 'true';
  const send = type => parent.postMessage({ type }, parentOrigin);
  let manualGender = '男';
  let profileGender = '';
  let lastIdentity;
  let lastName;
  function syncState(event) {
    const { user, gender } = event.detail;
    const identity = user?.id || null;
    const name = user?.name || '';
    if (identity && identity === lastIdentity && name !== lastName) send('mengsu:profile-change');
    lastName = name;
    const nextGender = gender === '男' || gender === '女' ? gender : '';
    if (identity !== lastIdentity || nextGender !== profileGender) {
      if (identity !== lastIdentity) {
        manualGender = '男';
        parent.postMessage({ type: identity ? 'mengsu:safety-auth' : 'mengsu:safety-logout' }, parentOrigin);
      }
      lastIdentity = identity;
      profileGender = nextGender;
      document.querySelector('.mengsu-role-panel')?.remove();
    }
    rolePanel();
  }
  // The health app owns account loading; reuse its validated state instead of
  // fetching the same identity and records again or polling every five seconds.
  window.addEventListener('mengsu:health-state', syncState);
  window.addEventListener('storage', event => {
    if (event.key === 'mengsu-auth-change') window.dispatchEvent(new Event('focus'));
  });
  function rolePanel() {
    if ((location.hash.slice(1) || 'home') !== 'home') return;
    const page = document.querySelector('#page');
    if (!page || page.querySelector('.mengsu-role-panel')) return;
    const gender = profileGender || manualGender;
    const panel = document.createElement('section');
    panel.className = 'mengsu-role-panel';
    panel.setAttribute('aria-labelledby', 'mengsu-role-title');
    panel.innerHTML = `<div class="mengsu-role-copy"><p class="mengsu-role-eyebrow">YOUR HEALTH PROFILE</p><h2 id="mengsu-role-title">健康档案 · 角色形象</h2><p>${profileGender ? '已根据个人档案中的性别显示对应人物。' : '选择一个角色，作为健康总览中的陪伴形象。填写个人档案性别后会自动按档案显示。'}</p><div class="mengsu-role-switch" role="group" aria-label="选择角色"><button type="button" data-gender="男" class="${gender === '男' ? 'selected' : ''}" ${profileGender ? 'aria-disabled="true"' : ''}>男</button><button type="button" data-gender="女" class="${gender === '女' ? 'selected' : ''}" ${profileGender ? 'aria-disabled="true"' : ''}>女</button></div></div><div class="mengsu-role-figure"><img src="/avatars/health-avatar-${gender === '女' ? 'female' : 'male'}-clean.webp" alt="${gender === '女' ? '女性' : '男性'}健康档案形象" /><span>${profileGender ? '个人档案已设定' : '当前角色'}</span></div>`;
    panel.querySelectorAll('[data-gender]').forEach(button => button.addEventListener('click', () => {
      if (profileGender) return;
      manualGender = button.dataset.gender;
      panel.remove();
      rolePanel();
    }));
    page.prepend(panel);
  }
  function mount() {
    // Keep the original account menu, but open the shared login for guests.
    document.addEventListener('click', event => {
      const account = event.target.closest('#topAccountButton, a[href^="/account/"]');
      if (!account || (lastIdentity && account.tagName !== 'A')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      send('mengsu:login');
    }, true);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mengsu-return-entry';
    button.textContent = '返回主页面';
    button.addEventListener('click', () => send('mengsu:return-entry'));
    const actions = document.querySelector('.top-actions');
    if (actions) actions.prepend(button);
    else { button.classList.add('mengsu-return-floating'); document.body.append(button); }
    const menu = document.querySelector('.sidebar nav');
    menu?.addEventListener('click', event => { if (event.target.closest('a[data-route]')) document.querySelector('.sidebar')?.classList.remove('open'); });
    const page = document.querySelector('#page');
    if (page) {
      const observer = new MutationObserver(() => { if ((location.hash.slice(1) || 'home') === 'home') window.setTimeout(rolePanel, 0); });
      observer.observe(page, { childList: true, subtree: true });
      window.addEventListener('hashchange', rolePanel);
    }
    rolePanel();
    send('mengsu:safety-ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
