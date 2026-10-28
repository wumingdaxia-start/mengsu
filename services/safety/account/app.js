const loginView = document.querySelector('#loginView');
const dashboardView = document.querySelector('#dashboardView');
const form = document.querySelector('#loginForm');
const accountInput = document.querySelector('#account');
const passwordInput = document.querySelector('#password');
const formError = document.querySelector('#formError');
const submitButton = document.querySelector('#submitButton');
const toast = document.querySelector('#toast');
const adminMode = new URLSearchParams(location.search).get('mode') === 'admin';
if(adminMode){
 document.body.classList.add('admin-mode');
 document.title='管理员登录｜安康盾';
 document.querySelector('.welcome').textContent='安全健康管理中心';
 document.querySelector('.hero-copy h1').innerHTML='面向管理团队的<br><em>健康安全工作台</em>';
 document.querySelector('.hero-copy > p').textContent='集中查看用户健康记录与挑战进展，发现需要关注的整体趋势。';
 document.querySelectorAll('.trust-row span').forEach((item,index)=>{item.querySelector('b').textContent=['分权','汇总','审计'][index];item.querySelector('small').textContent=['账号角色隔离','跨用户统计','记录来源可追溯'][index]});
 document.querySelectorAll('.service-card').forEach(item=>item.hidden=true);
 document.querySelector('#loginHeading').textContent='安全健康管理员登录';
 document.querySelector('#loginDescription').textContent='进入独立管理后台，查看用户健康记录汇总';
 document.querySelector('#adminEntry').textContent='返回普通用户登录 →';
 document.querySelector('#adminEntry').href='/account/';
 document.querySelector('.demo-box').textContent='请输入管理员账号和密码';
}
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function showDashboard(user) {
  document.querySelector('#displayName').textContent = user.name;
  document.querySelector('#displayAccount').textContent = user.account;
  document.querySelector('#displayRole').textContent = user.role;
  document.querySelector('#displayPhone').textContent = user.phone;
  loginView.hidden = true; dashboardView.hidden = false;
}
function returnToHealthSite() { const target = new URLSearchParams(location.search).get('returnTo'); if (target && target.startsWith('/') && !target.startsWith('//') && (adminMode?target.startsWith('/admin'):!target.startsWith('/admin'))) { setTimeout(() => location.href = target, 500); return true; } if(adminMode){setTimeout(()=>location.href='/admin/',500);return true} return false; }
async function request(url, options) {
  const response = await fetch(url, options), data = await response.json();
  if (!response.ok) throw new Error(data.message || '请求失败，请稍后重试');
  return data;
}
form.addEventListener('submit', async event => {
  event.preventDefault(); formError.textContent = '';
  const account = accountInput.value.trim(), password = passwordInput.value;
  if (!account || !password) { formError.textContent = '请输入完整的账号和密码'; (!account ? accountInput : passwordInput).focus(); return; }
  submitButton.disabled = true; submitButton.classList.add('loading'); submitButton.querySelector('span').textContent = '正在验证';
  try {
    await request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account, password, mode:adminMode?'admin':'user', remember: document.querySelector('#remember').checked }) });
    const { user } = await request('/api/me'); showDashboard(user); showToast('登录成功'); returnToHealthSite();
  } catch (error) { formError.textContent = error.message; passwordInput.select(); }
  finally { submitButton.disabled = false; submitButton.classList.remove('loading'); submitButton.querySelector('span').textContent = '登录'; }
});
document.querySelector('#togglePassword').addEventListener('click', event => { const visible = passwordInput.type === 'text'; passwordInput.type = visible ? 'password' : 'text'; event.currentTarget.setAttribute('aria-label', visible ? '显示密码' : '隐藏密码'); });
document.querySelector('#forgotButton').addEventListener('click', () => showToast('请联系健康安全管理员重置密码'));
document.querySelectorAll('footer button').forEach(button => button.addEventListener('click', () => showToast('协议页面正在完善中')));
document.querySelector('#logoutButton').addEventListener('click', async () => { await request('/api/logout', { method: 'POST' }); dashboardView.hidden = true; loginView.hidden = false; passwordInput.value = ''; showToast('已安全退出'); });
request('/api/me').then(({ user }) => { if((user.role==='健康安全管理员')!==adminMode){formError.textContent='当前账号属于另一种登录入口，请切换登录入口';return}showDashboard(user); returnToHealthSite(); }).catch(() => {});
