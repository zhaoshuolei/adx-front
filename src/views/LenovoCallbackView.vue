<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, BadgeCheck, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-vue-next'
import { applyLenovoPermission, clearLenovoLoginRedirect, consumeLenovoLoginState } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import type { LenovoIdCallbackRequest } from '@/types/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const state = ref<'loading' | 'success' | 'permission' | 'applied' | 'error'>('loading')
const message = ref('正在验证联想账号…')
const payload = ref<LenovoIdCallbackRequest | null>(null)
let redirectTarget = '/overview'

const isBusy = computed(() => state.value === 'loading')

function paramsFromUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = route.query
  const read = (key: string) => {
    const queryValue = query[key]
    if (typeof queryValue === 'string') return queryValue
    return hash.get(key) || ''
  }

  return {
    accessToken: read('accessToken') || read('access_token') || read('token'),
    tokenType: read('tokenType') || read('token_type') || 'Bearer',
    username: read('username') || undefined,
    displayName: read('displayName') || read('display_name') || undefined,
    state: read('state') || undefined,
    error: read('error'),
    errorDescription: read('error_description') || read('errorDescription'),
  }
}

async function login() {
  state.value = 'loading'
  message.value = '正在验证联想账号…'
  const values = paramsFromUrl()
  try {
    redirectTarget = consumeLenovoLoginState(values.state)
    if (values.error) throw new Error(values.errorDescription || `联想授权失败：${values.error}`)
    if (!values.accessToken) throw new Error('联想回调未返回 access_token')
    payload.value = {
      accessToken: values.accessToken,
      tokenType: values.tokenType,
      username: values.username,
      displayName: values.displayName,
    }
    await auth.loginWithLenovo(payload.value)
    state.value = 'success'
    message.value = '登录成功，正在进入 ADX 管理中心…'
    clearLenovoLoginRedirect()
    await router.replace(redirectTarget)
  } catch (reason) {
    const errorMessage = reason instanceof Error ? reason.message : '联想一键登录失败'
    if (payload.value && /权限|permission|forbidden|403/i.test(errorMessage)) {
      state.value = 'permission'
      message.value = '该联想账号尚未获得 ADX 访问权限，可以提交权限申请。'
    } else {
      state.value = 'error'
      message.value = errorMessage
    }
  }
}

async function requestPermission() {
  if (!payload.value) return
  state.value = 'loading'
  message.value = '正在提交 ADX 权限申请…'
  try {
    const result = await applyLenovoPermission(payload.value)
    state.value = 'applied'
    message.value = result || '权限申请已提交，等待管理员审批。'
    clearLenovoLoginRedirect()
  } catch (reason) {
    state.value = 'error'
    message.value = reason instanceof Error ? reason.message : '权限申请提交失败'
  }
}

function restart() {
  clearLenovoLoginRedirect()
  void router.replace('/login')
}

onMounted(login)
</script>

<template>
  <main class="sso-page">
    <section class="sso-card" :class="state">
      <span class="sso-icon">
        <LoaderCircle v-if="state === 'loading'" class="adx-icon spinning" />
        <BadgeCheck v-else-if="state === 'success'" class="adx-icon" />
        <ShieldCheck v-else-if="state === 'permission' || state === 'applied'" class="adx-icon" />
        <CircleAlert v-else class="adx-icon" />
      </span>
      <p class="sso-kicker">LENOVO ID SSO</p>
      <h1>{{ state === 'success' ? '登录成功' : state === 'permission' ? '需要申请权限' : state === 'applied' ? '申请已提交' : state === 'error' ? '登录未完成' : '联想一键登录' }}</h1>
      <p class="sso-message">{{ message }}</p>
      <div v-if="state === 'permission'" class="sso-actions"><button class="adx-button adx-button--secondary" type="button" @click="restart"><ArrowLeft class="adx-icon" />返回登录</button><button class="adx-button adx-button--primary" type="button" @click="requestPermission"><ShieldCheck class="adx-icon" />申请 ADX 权限</button></div>
      <div v-else-if="state === 'error' || state === 'applied'" class="sso-actions"><button class="adx-button adx-button--primary" type="button" @click="restart"><ArrowLeft class="adx-icon" />返回登录</button></div>
      <div v-if="state === 'loading'" class="sso-progress"><i /></div>
    </section>
  </main>
</template>

<style scoped>
.sso-page { display: grid; place-items: center; width: 100%; height: 100vh; padding: 30px; color: var(--adx-text-strong); background: var(--adx-bg-app); }
.sso-card { width: min(430px, 100%); padding: 34px; border-radius: 22px; background: var(--adx-surface); box-shadow: var(--adx-shadow-menu); text-align: center; }
.sso-icon { display: grid; place-items: center; width: 58px; height: 58px; margin: 0 auto; border-radius: 18px; color: var(--adx-success); background: var(--adx-brand-soft); }
.sso-icon .adx-icon { width: 26px; height: 26px; }
.sso-card.error .sso-icon { color: var(--adx-danger); background: var(--adx-danger-soft); }
.sso-kicker { margin: 20px 0 0; color: var(--adx-success); font-size: 9px; font-weight: 750; letter-spacing: .13em; }
.sso-card h1 { margin: 9px 0 0; font-size: 24px; letter-spacing: -.5px; }
.sso-message { margin: 10px auto 0; max-width: 330px; color: var(--adx-text-muted); font-size: 10px; line-height: 1.7; }
.sso-actions { display: flex; justify-content: center; gap: 8px; margin-top: 24px; }
.sso-progress { height: 4px; margin-top: 24px; overflow: hidden; border-radius: 99px; background: var(--adx-divider); }
.sso-progress i { display: block; width: 40%; height: 100%; border-radius: inherit; background: var(--adx-brand-500); animation: sso-progress 1.1s ease-in-out infinite alternate; }
.spinning { animation: sso-spin .9s linear infinite; }
@keyframes sso-spin { to { transform: rotate(360deg); } }
@keyframes sso-progress { from { transform: translateX(-10%); } to { transform: translateX(160%); } }
</style>
