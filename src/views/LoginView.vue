<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, BadgeCheck, BarChart3, Image, LockKeyhole, Radio, RefreshCw, ShieldCheck, SunMoon, UserRound } from 'lucide-vue-next'
import { beginLenovoLogin, getCaptcha, isLenovoLoginConfigured, mockMode } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const captchaImage = ref('')
const errorMessage = ref('')
const captchaLoading = ref(false)
const lenovoConfigured = isLenovoLoginConfigured()

const form = reactive({
  username: mockMode ? 'admin' : '',
  password: mockMode ? 'admin123' : '',
  captchaId: '',
  captchaCode: mockMode ? '1234' : '',
  remember: true,
})

const nextThemeDark = computed(() => theme.effective !== 'dark')

async function refreshCaptcha() {
  captchaLoading.value = true
  errorMessage.value = ''
  try {
    const captcha = await getCaptcha()
    form.captchaId = captcha.captchaId
    captchaImage.value = captcha.image
    form.captchaCode = mockMode ? '1234' : ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '验证码加载失败'
  } finally {
    captchaLoading.value = false
  }
}

async function submit() {
  errorMessage.value = ''
  if (!form.username || !form.password || !form.captchaId || !form.captchaCode) {
    errorMessage.value = '请完整填写账号、密码和验证码'
    return
  }
  try {
    await auth.login({
      username: form.username,
      password: form.password,
      captchaId: form.captchaId,
      captchaCode: form.captchaCode,
    })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/overview'
    await router.replace(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败'
    await refreshCaptcha()
  }
}

function toggleTheme() {
  theme.setPreference(nextThemeDark.value ? 'dark' : 'light')
}

function oneClickLogin() {
  errorMessage.value = ''
  try {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/overview'
    beginLenovoLogin(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法发起联想一键登录'
  }
}

onMounted(refreshCaptcha)
</script>

<template>
  <main class="login-page">
    <button class="login-theme" type="button" :aria-label="nextThemeDark ? '切换深色主题' : '切换浅色主题'" @click="toggleTheme"><SunMoon class="adx-icon" /></button>
    <section class="login-story">
      <div class="login-story__glow" />
      <header class="login-brand"><span class="adx-brand-mark"><BarChart3 class="adx-icon" /></span><span class="adx-brand-copy"><strong>ADX 管理中心</strong><span>Advertising OS</span></span></header>
      <div class="login-story__copy">
        <span class="login-story__eyebrow">ADX ADMIN API</span>
        <h1>让每一次竞价<br>都清晰可控</h1>
        <p>统一管理媒体、广告位、DSP 配置、分组策略、结算对账与实时运行状态。</p>
        <div class="login-signals">
          <div><ShieldCheck class="adx-icon" /><span><strong>权限清晰</strong><small>角色与菜单权限统一管理</small></span></div>
          <div><Radio class="adx-icon" /><span><strong>链路可观测</strong><small>请求、竞价、填充、错误实时可见</small></span></div>
          <div><BarChart3 class="adx-icon" /><span><strong>经营可分析</strong><small>收益、eCPM、结算与对账一体化</small></span></div>
        </div>
      </div>
      <footer class="login-story__foot"><span><i />服务运行正常</span><span>strategy-v248</span></footer>
    </section>

    <section class="login-form-wrap">
      <div class="login-card">
        <div class="login-card__head"><span class="login-card__kicker">安全登录</span><h2>欢迎回来</h2><p>使用联想账号一键登录，或使用管理账号登录。</p></div>
        <button class="login-lenovo" type="button" @click="oneClickLogin"><BadgeCheck class="adx-icon" /><span><strong>联想一键登录</strong><small>使用 Lenovo ID 安全登录 ADX</small></span><ArrowRight class="adx-icon" /></button>
        <div class="login-divider"><span>或使用账号密码登录</span></div>
        <form class="login-form" @submit.prevent="submit">
          <label class="adx-field"><span class="adx-field__label">用户名</span><span class="adx-input-shell login-input"><UserRound class="adx-icon" /><input v-model.trim="form.username" name="username" autocomplete="username" placeholder="请输入用户名" /></span></label>
          <label class="adx-field"><span class="adx-field__label">密码</span><span class="adx-input-shell login-input"><LockKeyhole class="adx-icon" /><input v-model="form.password" name="password" type="password" autocomplete="current-password" placeholder="请输入密码" /></span></label>
          <label class="adx-field"><span class="adx-field__label">图形验证码</span><span class="login-captcha-row"><span class="adx-input-shell login-input"><Image class="adx-icon" /><input v-model.trim="form.captchaCode" name="captchaCode" autocomplete="off" maxlength="6" placeholder="请输入验证码" /></span><button class="login-captcha" type="button" :aria-label="'刷新验证码'" :disabled="captchaLoading" @click="refreshCaptcha"><img v-if="captchaImage" :src="captchaImage" alt="图形验证码" /><RefreshCw v-else class="adx-icon" /></button></span></label>
          <div class="login-options"><label><input v-model="form.remember" type="checkbox" />记住用户名</label><span v-if="mockMode" class="login-demo">演示环境 · admin / admin123 / 1234</span></div>
          <p v-if="errorMessage" class="login-error" role="alert">{{ errorMessage }}</p>
          <p v-if="!lenovoConfigured && !mockMode" class="login-config-hint">联想一键登录需要配置授权地址后才能使用。</p>
          <button class="login-submit" type="submit" :disabled="auth.loading">{{ auth.loading ? '正在登录…' : '登录' }}<ArrowRight class="adx-icon" /></button>
        </form>
        <p class="login-footnote">登录即表示你已阅读并同意平台安全规范。访问令牌有效期 15 分钟，过期后将自动刷新。</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page { position: relative; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(440px, .85fr); width: 100%; height: 100vh; overflow: hidden; color: var(--adx-text-strong); background: var(--adx-bg-app); }
.login-theme { position: fixed; z-index: 20; top: 22px; right: 24px; display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 12px; color: var(--adx-text-body); background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.login-story { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 34px 48px 27px; color: #dff8ef; background: #0e3835; overflow: hidden; }
.login-story__glow { position: absolute; right: -160px; bottom: -190px; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(72,217,169,.24), rgba(72,217,169,0)); }
.login-brand { position: relative; display: flex; align-items: center; gap: 12px; }
.login-brand .adx-brand-mark { width: 42px; height: 42px; border-radius: 13px; color: #0e3835; background: #75ddb6; }
.login-brand .adx-brand-copy strong { color: #f0fff9; font-size: 17px; }
.login-brand .adx-brand-copy span { color: #85b7a8; }
.login-story__copy { position: relative; width: min(610px, 90%); margin: auto 0; }
.login-story__eyebrow { display: inline-flex; align-items: center; gap: 7px; color: #75ddb6; font-size: 10px; font-weight: 700; letter-spacing: .13em; }
.login-story__eyebrow::before { width: 22px; height: 2px; background: #75ddb6; content: ""; }
.login-story h1 { margin: 18px 0 0; color: #f1fff9; font-size: clamp(38px, 4.2vw, 62px); font-weight: 760; letter-spacing: -2px; line-height: 1.08; }
.login-story__copy > p { max-width: 510px; margin: 18px 0 0; color: #a7c9bf; font-size: 13px; line-height: 1.8; }
.login-signals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 38px; }
.login-signals > div { display: flex; align-items: flex-start; gap: 9px; padding: 14px; border: 1px solid rgba(117,221,182,.14); border-radius: 14px; background: rgba(255,255,255,.035); }
.login-signals .adx-icon { flex: 0 0 auto; width: 15px; height: 15px; color: #75ddb6; }
.login-signals strong { display: block; color: #e2f8f0; font-size: 10px; }
.login-signals small { display: block; margin-top: 5px; color: #7fa99d; font-size: 8px; line-height: 1.45; }
.login-story__foot { position: relative; display: flex; align-items: center; justify-content: space-between; color: #7ca99c; font-size: 9px; }
.login-story__foot span:first-child { display: inline-flex; align-items: center; gap: 7px; }
.login-story__foot i { width: 7px; height: 7px; border-radius: 50%; background: #64e0bb; box-shadow: 0 0 0 4px rgba(100,224,187,.1); }
.login-form-wrap { display: grid; place-items: center; min-width: 0; padding: 48px; background: var(--adx-surface); }
.login-card { width: min(410px, 100%); }
.login-card__kicker { color: var(--adx-success); font-size: 10px; font-weight: 700; letter-spacing: .05em; }
.login-card h2 { margin: 9px 0 0; font-size: 28px; letter-spacing: -.6px; }
.login-card__head p { margin: 8px 0 0; color: var(--adx-text-muted); font-size: 11px; }
.login-form { display: grid; gap: 16px; margin-top: 28px; }
.login-lenovo { display: grid; grid-template-columns: 24px minmax(0, 1fr) 18px; align-items: center; gap: 10px; width: 100%; min-height: 58px; margin-top: 24px; padding: 10px 13px; border: 1px solid #c9eee0; border-radius: 13px; color: var(--adx-success); background: var(--adx-brand-soft); text-align: left; }
.login-lenovo:hover { border-color: var(--adx-brand-500); background: #dcf5eb; }
.login-lenovo > .adx-icon { width: 19px; height: 19px; }
.login-lenovo > .adx-icon:last-child { width: 15px; height: 15px; }
.login-lenovo strong { display: block; color: var(--adx-text-strong); font-size: 11px; }
.login-lenovo small { display: block; margin-top: 3px; color: var(--adx-text-muted); font-size: 8px; }
.login-divider { display: flex; align-items: center; gap: 10px; margin-top: 18px; color: var(--adx-text-muted); font-size: 8px; }
.login-divider::before,
.login-divider::after { flex: 1; height: 1px; background: var(--adx-divider); content: ""; }
.login-form { margin-top: 18px; }
.login-config-hint { margin: -5px 0 0; color: var(--adx-warning); font-size: 8px; text-align: center; }
.login-input { height: 44px; }
.login-input input { font-size: 11px; }
.login-captcha-row { display: grid; grid-template-columns: minmax(0, 1fr) 122px; gap: 10px; }
.login-captcha { display: grid; place-items: center; height: 44px; padding: 0; overflow: hidden; border: 0; border-radius: 11px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.login-captcha img { width: 100%; height: 100%; object-fit: cover; }
.login-options { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--adx-text-muted); font-size: 9px; }
.login-options label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.login-options input { accent-color: var(--adx-brand-500); }
.login-demo { padding: 5px 7px; border-radius: 7px; color: var(--adx-success); background: var(--adx-brand-soft); font-size: 8px; }
.login-error { margin: 0; padding: 10px 11px; border-radius: 10px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 9px; }
.login-submit { display: flex; align-items: center; justify-content: center; gap: 9px; height: 44px; border: 0; border-radius: 12px; color: #fff; background: var(--adx-brand-600); font-size: 11px; font-weight: 650; }
.login-submit:hover { background: #0b966d; }
.login-submit:disabled { cursor: wait; opacity: .65; }
.login-submit .adx-icon { width: 16px; height: 16px; }
.login-footnote { margin: 18px 0 0; color: var(--adx-text-muted); font-size: 8px; line-height: 1.6; text-align: center; }

@media (max-width: 1260px) {
  .login-page { grid-template-columns: minmax(0, 1fr) 450px; }
  .login-story { padding-right: 36px; padding-left: 36px; }
  .login-signals { grid-template-columns: 1fr; max-width: 260px; }
}
</style>
