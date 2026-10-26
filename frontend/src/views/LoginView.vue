<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
function destination() { return ['/activity', '/health-analysis'].includes(route.query.next) ? route.query.next : '/home' }
const email = ref('')
const password = ref('')
const remember = ref(true)
const message = ref('')

function submit() {
  if (!email.value.trim() || !password.value.trim()) {
    message.value = '请填写手机号或邮箱和密码'
    return
  }
  sessionStorage.setItem('mengsu-auth', JSON.stringify({ email: email.value.trim(), remembered: remember.value }))
  sessionStorage.setItem('mengsu-entered', '1')
  router.push(destination())
}

function continueGuest() {
  sessionStorage.setItem('mengsu-entered', '1')
  router.push(destination())
}
</script>

<template>
  <main class="login-page">
    <div class="login-wash" aria-hidden="true" />
    <header class="login-header">
      <button class="login-brand" type="button" @click="router.push('/entry')">
        <span class="login-brand-mark">⌁</span>
        <span><strong>梦溯</strong><small>MENGSU</small></span>
      </button>
      <button class="login-back" type="button" @click="router.push('/entry')">回到入口 <span aria-hidden="true">↗</span></button>
    </header>

    <section class="login-layout">
      <div class="login-intro">
        <p class="login-kicker">A QUIET PLACE TO RETURN TO</p>
        <h1>让每一次记录，<br /><em>都有回来的地方。</em></h1>
        <p class="login-copy">把梦境、身体感受和生活片段留在这里，慢慢看见自己的节奏。</p>
        <div class="login-orbit" aria-hidden="true"><i /><i /><i /></div>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <button class="login-return" type="button" @click="router.push('/entry')">← 返回水波首页</button>
        <div class="login-form-heading"><p>欢迎回来</p><h2>进入梦溯</h2><span>登录后继续你的记录</span></div>
        <label>手机号或邮箱<input v-model="email" type="text" autocomplete="username" placeholder="请输入手机号或邮箱" /></label>
        <label>密码<input v-model="password" type="password" autocomplete="current-password" placeholder="输入你的密码" /></label>
        <div class="login-form-options"><label class="remember"><input v-model="remember" type="checkbox" /> <span>记住我</span></label><button type="button" class="forgot">忘记密码？</button></div>
        <p v-if="message" class="login-message" role="status">{{ message }}</p>
        <button class="login-submit" type="submit">登录梦溯 <span aria-hidden="true">→</span></button>
        <div class="login-divider"><span>或</span></div>
        <button class="login-guest" type="button" @click="continueGuest">先以访客方式进入</button>
        <p class="login-note">你的记录保存在本机，登录界面仅用于进入个人空间。</p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page { position: relative; min-height: 100dvh; overflow: hidden; color: #42546a; background: #edf3f5 url('/entry-ripples/assets/water.jpg') center/cover no-repeat; }
.login-page::before { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, rgba(235,242,243,.91), rgba(239,235,246,.78) 54%, rgba(237,246,244,.6)); pointer-events: none; }
.login-wash { position: absolute; width: 38vw; height: 38vw; min-width: 280px; min-height: 280px; right: 4%; bottom: -15%; border-radius: 50%; background: rgba(207, 218, 243, .42); filter: blur(42px); animation: login-breathe 9s cubic-bezier(.77,0,.175,1) infinite; }
.login-header, .login-layout { position: relative; z-index: 1; }
.login-header { display: flex; justify-content: space-between; align-items: center; padding: 30px clamp(24px, 6vw, 92px); }
.login-brand, .login-back, .forgot { border: 0; background: transparent; color: inherit; box-shadow: none; }
.login-brand { display: flex; align-items: center; gap: 11px; padding: 0; text-align: left; }
.login-brand-mark { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(96,116,141,.28); border-radius: 50%; font: 500 25px/1 var(--display); }
.login-brand strong { display: block; color: #31445b; font: 500 22px/1 var(--display); }.login-brand small { display: block; margin-top: 3px; color: #8a9aa9; font-size: 9px; letter-spacing: .22em; }
.login-back { padding: 10px 0; font-size: 13px; color: #62758a; }.login-back:hover, .forgot:hover { color: #75678d; box-shadow: none; }
.login-layout { display: grid; place-items: center; max-width: 900px; min-height: calc(100dvh - 110px); margin: 0 auto; padding: 24px 34px 72px; }
.login-intro { display: none; }.login-kicker { margin: 0 0 24px; color: #8498a6; font-size: 11px; letter-spacing: .2em; }.login-intro h1 { margin: 0; color: #34485e; font: 500 clamp(34px, 4.3vw, 62px)/1.35 var(--display); letter-spacing: .02em; }.login-intro h1 em { color: #776b91; font-style: normal; }.login-copy { max-width: 390px; margin: 28px 0 0; color: #6e8291; font-size: 15px; line-height: 1.9; }
.login-orbit { position: absolute; right: 7%; bottom: 3%; width: 190px; height: 190px; border: 1px dashed rgba(114,132,162,.38); border-radius: 50%; transform: rotate(-15deg); }.login-orbit::before, .login-orbit::after { content: ''; position: absolute; border-radius: 50%; background: #f5bdc9; box-shadow: 0 0 0 8px rgba(245,189,201,.12); }.login-orbit::before { width: 8px; height: 8px; top: 21px; right: 30px; }.login-orbit::after { width: 6px; height: 6px; left: 24px; bottom: 37px; background: #aecdd1; box-shadow: 0 0 0 7px rgba(174,205,209,.15); }.login-orbit i { position: absolute; inset: 23px; border: 1px solid rgba(167,188,212,.32); border-radius: 50%; }.login-orbit i:nth-child(2) { inset: 48px; border-color: rgba(190,172,214,.3); }.login-orbit i:nth-child(3) { inset: 73px; border-color: rgba(167,188,212,.3); }
.login-form { width: min(100%, 646px); padding: 52px 55px 39px; border: 1px solid rgba(255,255,255,.82); border-radius: 28px; background: rgba(250,251,253,.74); box-shadow: 0 24px 70px rgba(89,103,133,.15); backdrop-filter: blur(20px); }.login-form-heading { margin-bottom: 37px; }.login-form-heading p { margin: 0 0 4px; color: #8b7fa1; font-size: 16px; }.login-form-heading h2 { margin: 0; color: #3e5065; font: 500 42px/1.25 var(--display); }.login-form-heading span { display: block; margin-top: 5px; color: #8b9aa8; font-size: 17px; }.login-form > label { display: grid; gap: 9px; margin-top: 24px; color: #66788a; font-size: 16px; }.login-form input:not([type='checkbox']) { height: 71px; margin: 0; border-color: rgba(185,199,211,.75); border-radius: 15px; background: rgba(249,252,252,.72); color: #3e5065; font-size: 18px; padding: 12px 20px; }.login-form input:not([type='checkbox']):focus { border-color: #b8a7ce; box-shadow: 0 0 0 3px rgba(185,167,208,.18); }
.login-form-options { display: flex; justify-content: space-between; align-items: center; margin: 22px 0 24px; }.remember { display: flex; align-items: center; gap: 9px; color: #8796a3; font-size: 16px; }.remember input { width: 20px; height: 20px; accent-color: #9c8bb7; }.forgot { padding: 0; color: #8d839c; font-size: 16px; }.login-message { margin: -4px 0 12px; color: #a75f78; font-size: 13px; }.login-submit, .login-guest { width: 100%; border-radius: 15px; }.login-submit { min-height: 68px; border-color: #869bb5; background: #7189a6; color: #fff; font-size: 22px; }.login-submit:hover { background: #637d9d; box-shadow: 0 8px 18px rgba(94,119,151,.2); }.login-submit span { margin-left: 12px; }.login-divider { display: flex; align-items: center; gap: 18px; margin: 31px 0 23px; color: #a5adb2; font-size: 15px; }.login-divider::before, .login-divider::after { content: ''; height: 1px; flex: 1; background: rgba(175,188,198,.46); }.login-guest { min-height: 62px; padding: 9px 14px; border: 1px solid rgba(156,171,187,.62); background: rgba(255,255,255,.4); color: #718295; font-size: 18px; }.login-guest:hover { border-color: #a897bd; color: #75678d; box-shadow: none; }.login-note { margin: 24px 0 0; color: #a0a9b0; font-size: 13px; line-height: 1.6; text-align: center; }
@keyframes login-breathe { 0%,100% { transform: translate3d(0,0,0) scale(.96); opacity: .5; } 50% { transform: translate3d(-2vw,-2vh,0) scale(1.04); opacity: .82; } }
@media (max-width: 760px) { .login-header { padding: 22px 20px; }.login-layout { display: block; min-height: auto; padding: 34px 20px 52px; }.login-form { padding: 34px 24px 28px; border-radius: 22px; }.login-form-heading p { font-size: 14px; }.login-form-heading h2 { font-size: 34px; }.login-form-heading span { font-size: 14px; }.login-form > label { font-size: 14px; }.login-form input:not([type='checkbox']) { height: 58px; font-size: 16px; }.remember, .forgot { font-size: 14px; }.login-submit { min-height: 58px; font-size: 18px; }.login-guest { min-height: 54px; font-size: 16px; }.login-note { font-size: 11px; }.login-back { font-size: 12px; } }
.login-header { display: none; }
.login-layout { min-height: 100dvh; max-width: none; padding: clamp(40px, 13.5vh, 153px) 24px clamp(40px, 10.5vh, 120px); }
.login-form { background: rgba(250,251,253,.86); padding-top: 52px; padding-bottom: 48px; }
.login-form-heading { margin-bottom: 45px; }
.login-form-heading h2 { margin-top: 10px; }
.login-form-heading span { margin-top: 10px; }
.login-form > label { gap: 12px; margin-top: 26px; }
.login-form-options { margin-top: 24px; margin-bottom: 28px; }
.login-divider { margin-top: 36px; margin-bottom: 27px; }
.login-note { margin-top: 27px; }
@media (max-width: 600px) {
  .login-layout { display: grid; padding: 32px 18px; }
  .login-form { padding: 32px 24px; }
  .login-form-heading { margin-bottom: 30px; }
}
.login-layout { padding: 32px 18px; }
.login-form { zoom: .7; }
.login-return { display: block; margin: 0 0 20px; padding: 4px 0; border: 0; background: transparent; color: #718295; font-size: 15px; box-shadow: none; }
@media (prefers-reduced-motion: reduce) { .login-wash { animation: none; } }
</style>
