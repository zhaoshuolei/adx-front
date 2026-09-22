<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CheckCircle2, ChevronDown, Layers3, Plus, RefreshCw, Rocket, Save, Settings2, ShieldCheck, Users, X } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { getStrategies, publishStrategy, saveStrategy, type StrategyGroup, type StrategyPlan } from '@/services/special'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

interface SourceOption { id: number; name: string; dsp: string; ecpm: number }

const sources: SourceOption[] = [
  { id: 201, name: '向新 Store 横幅', dsp: '向新 DSP', ecpm: 19.8 },
  { id: 202, name: '聚点信息流原生', dsp: '聚点 DSP', ecpm: 18.6 },
  { id: 203, name: '云图激励视频', dsp: '云图 DSP', ecpm: 21.4 },
  { id: 204, name: '星云开屏广告', dsp: '星云 DSP', ecpm: 23.2 },
  { id: 205, name: '极光插屏', dsp: '极光 DSP', ecpm: 16.9 },
]

const auth = useAuthStore()
const toast = useToastStore()
const loading = ref(true)
const error = ref('')
const plans = ref<StrategyPlan[]>([])
const selectedId = ref<number | null>(null)
const planDrawer = ref(false)
const groupDrawer = ref(false)
const saving = ref(false)
const publishing = ref(false)
const publishConfirm = ref(false)
const editingPlan = reactive({ id: 0, name: '', code: '', globalTimeoutMs: 420, refreshAfterMs: 30000, maxAgeMs: 300000, remark: '', status: 1 })
const editingGroup = reactive<{ id: number; name: string; rule: string; timeoutMs: number; members: Array<{ sourceId: number; weight: number }> }>({ id: 0, name: '', rule: 'all', timeoutMs: 180, members: [] })

const selected = computed(() => plans.value.find((plan) => plan.id === selectedId.value) || plans.value[0] || null)
const publishedCount = computed(() => plans.value.filter((plan) => plan.publishedVersion).length)
const draftCount = computed(() => plans.value.filter((plan) => !plan.publishedVersion || plan.version > plan.publishedVersion).length)
const memberCount = computed(() => plans.value.reduce((sum, plan) => sum + plan.groups.reduce((groupSum, group) => groupSum + group.members.length, 0), 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    plans.value = await getStrategies(auth.accessToken)
    if (!plans.value.some((plan) => plan.id === selectedId.value)) selectedId.value = plans.value[0]?.id ?? null
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '策略方案加载失败'
  } finally {
    loading.value = false
  }
}

function openPlanEditor(plan?: StrategyPlan) {
  const target = plan || selected.value
  Object.assign(editingPlan, target ? { id: target.id, name: target.name, code: target.code, globalTimeoutMs: target.globalTimeoutMs, refreshAfterMs: target.refreshAfterMs, maxAgeMs: target.maxAgeMs, remark: target.remark, status: target.status } : { id: 0, name: '', code: '', globalTimeoutMs: 420, refreshAfterMs: 30000, maxAgeMs: 300000, remark: '', status: 1 })
  planDrawer.value = true
}

async function savePlan() {
  if (!editingPlan.name.trim() || !editingPlan.code.trim()) { toast.show('请填写方案名称和编码'); return }
  saving.value = true
  try {
    const existing = plans.value.find((plan) => plan.id === editingPlan.id)
    const saved = await saveStrategy(auth.accessToken, {
      id: editingPlan.id,
      code: editingPlan.code,
      name: editingPlan.name,
      bidMode: 'composite',
      globalTimeoutMs: editingPlan.globalTimeoutMs,
      refreshAfterMs: editingPlan.refreshAfterMs,
      maxAgeMs: editingPlan.maxAgeMs,
      status: editingPlan.status,
      remark: editingPlan.remark,
      version: existing?.version || 0,
      publishedVersion: existing?.publishedVersion,
      updatedAt: new Date().toISOString(),
      groups: existing?.groups || [],
    })
    planDrawer.value = false
    toast.show(existing ? '方案配置已保存' : '方案已创建')
    await load()
    selectedId.value = saved.id
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '方案保存失败')
  } finally {
    saving.value = false
  }
}

function openGroupEditor(group?: StrategyGroup) {
  Object.assign(editingGroup, group ? { id: group.id, name: group.name, rule: group.rule, timeoutMs: group.timeoutMs, members: group.members.map((member) => ({ sourceId: member.sourceId, weight: member.weight })) } : { id: 0, name: '', rule: 'all', timeoutMs: 180, members: [] })
  groupDrawer.value = true
}

function toggleGroupMember(sourceId: number) {
  const index = editingGroup.members.findIndex((member) => member.sourceId === sourceId)
  if (index >= 0) editingGroup.members.splice(index, 1)
  else editingGroup.members.push({ sourceId, weight: 50 })
}

async function saveGroup() {
  if (!selected.value || !editingGroup.name.trim()) { toast.show('请填写分组名称'); return }
  saving.value = true
  try {
    const members = editingGroup.members.map((member) => ({ sourceId: member.sourceId, sourceName: sources.find((source) => source.id === member.sourceId)?.name || '', weight: member.weight }))
    if (editingGroup.id) {
      const group = selected.value.groups.find((item) => item.id === editingGroup.id)
      if (group) Object.assign(group, { name: editingGroup.name, rule: editingGroup.rule, timeoutMs: editingGroup.timeoutMs, members })
    } else {
      selected.value.groups.push({ id: Math.max(0, ...selected.value.groups.map((group) => group.id)) + 1, name: editingGroup.name, rule: editingGroup.rule, timeoutMs: editingGroup.timeoutMs, members })
    }
    selected.value.version += 1
    selected.value.updatedAt = new Date().toISOString()
    groupDrawer.value = false
    toast.show('策略分组已保存')
  } finally {
    saving.value = false
  }
}

async function confirmPublish() {
  if (!selected.value) return
  publishing.value = true
  try {
    const version = await publishStrategy(auth.accessToken, selected.value.id)
    selected.value.publishedVersion = version
    selected.value.version = version
    publishConfirm.value = false
    toast.show(`策略方案已发布 v${version}`)
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '策略发布失败')
  } finally {
    publishing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="strategy-page">
    <header class="adx-page-header"><div><p class="adx-page-kicker">广告运营 · 分组策略</p><h1 class="adx-page-title">策略管理</h1><p class="adx-page-description">创建分组策略方案，配置分组规则、广告源权重和超时，并发布到引擎。</p></div><div class="adx-page-actions"><button class="adx-button adx-button--secondary" type="button" @click="load"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button><button class="adx-button adx-button--primary" type="button" @click="openPlanEditor()"><Plus class="adx-icon" />新增方案</button></div></header>
    <div v-if="error" class="strategy-error">{{ error }}<button type="button" @click="load">重新加载</button></div>
    <section class="strategy-metrics"><article><span>策略方案</span><strong>{{ plans.length }}</strong><small>全部分组策略</small></article><article><span>已发布</span><strong>{{ publishedCount }}</strong><small>存在发布版本</small></article><article><span>待发布变更</span><strong>{{ draftCount }}</strong><small>版本落后或未发布</small></article><article><span>广告源成员</span><strong>{{ memberCount }}</strong><small>跨方案分组成员</small></article></section>
    <section class="strategy-layout">
      <aside class="adx-panel strategy-list"><div class="adx-panel__head"><div><h2 class="adx-panel__title">方案列表</h2><p class="adx-panel__meta">选择方案查看分组</p></div></div><div v-if="loading" class="strategy-list-loading"><div v-for="index in 4" :key="index" class="adx-skeleton" /></div><button v-for="plan in plans" v-else :key="plan.id" type="button" :class="{ active: selected?.id === plan.id }" @click="selectedId = plan.id"><span class="strategy-list-icon"><Layers3 class="adx-icon" /></span><span><strong>{{ plan.name }}</strong><small>{{ plan.code }} · {{ plan.groups.length }} 个分组</small></span><i :class="{ published: plan.publishedVersion && plan.version <= plan.publishedVersion }">{{ plan.publishedVersion && plan.version <= plan.publishedVersion ? `v${plan.publishedVersion}` : '待发布' }}</i></button></aside>
      <main v-if="selected" class="strategy-detail">
        <article class="adx-panel strategy-head"><div class="strategy-head__main"><span class="strategy-head-icon"><Settings2 class="adx-icon" /></span><div><div class="strategy-title-line"><h2>{{ selected.name }}</h2><span class="adx-status" :class="selected.publishedVersion && selected.version <= selected.publishedVersion ? 'adx-status--success' : 'adx-status--warning'">{{ selected.publishedVersion && selected.version <= selected.publishedVersion ? `已发布 v${selected.publishedVersion}` : '待发布' }}</span></div><p>{{ selected.remark || '暂无方案说明' }}</p></div></div><div class="strategy-head__actions"><button class="adx-button adx-button--secondary" type="button" @click="openPlanEditor(selected)"><Settings2 class="adx-icon" />编辑方案</button><button class="adx-button adx-button--primary" type="button" @click="publishConfirm = true"><Rocket class="adx-icon" />发布</button></div><div class="strategy-head__stats"><div><span>竞价模式</span><strong>{{ selected.bidMode }}</strong></div><div><span>总超时</span><strong>{{ selected.globalTimeoutMs }}ms</strong></div><div><span>探测间隔</span><strong>{{ selected.refreshAfterMs / 1000 }}s</strong></div><div><span>硬过期</span><strong>{{ selected.maxAgeMs / 1000 }}s</strong></div><div><span>版本</span><strong>v{{ selected.version }}</strong></div></div></article>
        <article class="adx-panel strategy-groups"><div class="adx-panel__head"><div><h2 class="adx-panel__title">策略分组</h2><p class="adx-panel__meta">按规则匹配用户并选择广告源成员</p></div><button class="adx-button adx-button--secondary" type="button" @click="openGroupEditor()"><Plus class="adx-icon" />添加分组</button></div><div v-if="selected.groups.length" class="strategy-group-list"><section v-for="group in selected.groups" :key="group.id"><header><div><span class="strategy-group-icon"><Users class="adx-icon" /></span><div><strong>{{ group.name }}</strong><small>规则：{{ group.rule }} · 超时 {{ group.timeoutMs }}ms</small></div></div><button type="button" @click="openGroupEditor(group)"><Settings2 class="adx-icon" />编辑</button></header><div class="strategy-members"><div v-for="member in group.members" :key="member.sourceId"><span>{{ member.sourceName }}</span><strong>{{ member.weight }}%</strong><i><b :style="{ width: `${member.weight}%` }" /></i></div></div></section></div><div v-else class="strategy-empty"><Layers3 class="adx-icon" /><strong>还没有策略分组</strong><span>添加分组后配置广告源权重。</span></div></article>
      </main>
      <div v-else class="adx-panel strategy-no-selection"><Layers3 class="adx-icon" /><strong>请选择策略方案</strong></div>
    </section>

    <Teleport to="body"><Transition name="adx-fade"><div v-if="planDrawer || groupDrawer" class="adx-overlay" @click="saving ? undefined : (planDrawer = false, groupDrawer = false)" /></Transition><Transition name="adx-drawer"><aside v-if="planDrawer" class="adx-drawer" role="dialog" aria-modal="true"><header class="adx-drawer__head"><div><p class="adx-drawer__kicker">STRATEGY PROFILE</p><h2 class="adx-drawer__title">{{ editingPlan.id ? '编辑策略方案' : '新增策略方案' }}</h2><p class="adx-drawer__description">配置方案编码、超时和缓存过期时间。</p></div><button class="adx-drawer__close" type="button" @click="planDrawer = false"><X class="adx-icon" /></button></header><div class="adx-drawer__body"><form id="planForm" class="strategy-form" @submit.prevent="savePlan"><label class="adx-field"><span class="adx-field__label">方案名称 *</span><span class="adx-input-shell"><input v-model="editingPlan.name" /></span></label><label class="adx-field"><span class="adx-field__label">方案编码 *</span><span class="adx-input-shell"><input v-model="editingPlan.code" :disabled="Boolean(editingPlan.id)" /></span></label><label class="adx-field"><span class="adx-field__label">总超时（ms）</span><span class="adx-input-shell"><input v-model.number="editingPlan.globalTimeoutMs" type="number" /></span></label><label class="adx-field"><span class="adx-field__label">探测间隔（ms）</span><span class="adx-input-shell"><input v-model.number="editingPlan.refreshAfterMs" type="number" /></span></label><label class="adx-field"><span class="adx-field__label">硬过期（ms）</span><span class="adx-input-shell"><input v-model.number="editingPlan.maxAgeMs" type="number" /></span></label><label class="adx-field full"><span class="adx-field__label">备注</span><span class="adx-input-shell strategy-textarea"><textarea v-model="editingPlan.remark" /></span></label></form></div><footer class="adx-drawer__foot"><button class="adx-button adx-button--secondary" type="button" @click="planDrawer = false">取消</button><button class="adx-button adx-button--primary" form="planForm" type="submit" :disabled="saving"><Save class="adx-icon" />{{ saving ? '保存中…' : '保存方案' }}</button></footer></aside></Transition><Transition name="adx-drawer"><aside v-if="groupDrawer" class="adx-drawer" role="dialog" aria-modal="true"><header class="adx-drawer__head"><div><p class="adx-drawer__kicker">STRATEGY GROUP</p><h2 class="adx-drawer__title">{{ editingGroup.id ? '编辑分组' : '添加分组' }}</h2><p class="adx-drawer__description">配置匹配规则、分组超时和广告源权重。</p></div><button class="adx-drawer__close" type="button" @click="groupDrawer = false"><X class="adx-icon" /></button></header><div class="adx-drawer__body"><form id="groupForm" class="strategy-form" @submit.prevent="saveGroup"><label class="adx-field"><span class="adx-field__label">分组名称 *</span><span class="adx-input-shell"><input v-model="editingGroup.name" placeholder="如：核心渠道" /></span></label><label class="adx-field"><span class="adx-field__label">规则表达式</span><span class="adx-input-shell"><input v-model="editingGroup.rule" placeholder="all / 高价值用户" /></span></label><label class="adx-field full"><span class="adx-field__label">分组超时（ms）</span><span class="adx-input-shell"><input v-model.number="editingGroup.timeoutMs" type="number" /></span></label><div class="strategy-source-title full"><span>广告源成员</span><small>勾选并设置权重，权重总和不需要固定为 100%。</small></div><div class="strategy-source-picker full"><button v-for="source in sources" :key="source.id" type="button" :class="{ selected: editingGroup.members.some((member) => member.sourceId === source.id) }" @click="toggleGroupMember(source.id)"><CheckCircle2 class="adx-icon" /><span><strong>{{ source.name }}</strong><small>{{ source.dsp }} · eCPM ¥{{ source.ecpm.toFixed(2) }}</small></span><input v-if="editingGroup.members.some((member) => member.sourceId === source.id)" v-model.number="editingGroup.members.find((member) => member.sourceId === source.id)!.weight" type="number" min="1" max="100" @click.stop /></button></div></form></div><footer class="adx-drawer__foot"><button class="adx-button adx-button--secondary" type="button" @click="groupDrawer = false">取消</button><button class="adx-button adx-button--primary" form="groupForm" type="submit" :disabled="saving"><Save class="adx-icon" />{{ saving ? '保存中…' : '保存分组' }}</button></footer></aside></Transition></Teleport>
    <ConfirmDialog :open="publishConfirm" title="发布策略方案？" :description="`发布后会将“${selected?.name}”的分组和成员配置推送到全部引擎实例。`" confirm-label="确认发布" :loading="publishing" @close="publishConfirm = false" @confirm="confirmPublish" />
  </div>
</template>

<style scoped>
.strategy-page { min-width: 0; }
.strategy-error { display: flex; gap: 10px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 9px; }
.strategy-error button { margin-left: auto; border: 0; color: inherit; background: transparent; }
.strategy-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.strategy-metrics article { min-height: 100px; padding: 14px 15px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.strategy-metrics span { color: var(--adx-text-muted); font-size: 9px; }
.strategy-metrics strong { display: block; margin-top: 12px; font-size: 21px; }
.strategy-metrics small { display: block; margin-top: 7px; color: var(--adx-text-muted); font-size: 8px; }
.strategy-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 12px; margin-top: 12px; }
.strategy-list { align-self: start; padding-bottom: 7px; }
.strategy-list > button { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 9px; width: calc(100% - 14px); min-height: 58px; margin: 5px 7px; padding: 8px 9px; border: 0; border-radius: 11px; color: var(--adx-text-body); background: transparent; text-align: left; }
.strategy-list > button:hover { background: var(--adx-surface-muted); }
.strategy-list > button.active { color: var(--adx-success); background: var(--adx-brand-soft); }
.strategy-list-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.strategy-list > button.active .strategy-list-icon { color: var(--adx-success); background: var(--adx-surface); }
.strategy-list-icon .adx-icon { width: 15px; height: 15px; }
.strategy-list strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.strategy-list small { display: block; margin-top: 4px; color: var(--adx-text-muted); font-size: 8px; }
.strategy-list i { padding: 4px 6px; border-radius: 7px; color: var(--adx-warning); background: var(--adx-warning-soft); font-size: 7px; font-style: normal; }
.strategy-list i.published { color: var(--adx-success); background: var(--adx-success-soft); }
.strategy-list-loading { display: grid; gap: 7px; padding: 8px; }
.strategy-list-loading .adx-skeleton { height: 50px; }
.strategy-detail { display: grid; gap: 12px; min-width: 0; }
.strategy-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; padding: 16px; }
.strategy-head__main { display: flex; align-items: flex-start; gap: 11px; }
.strategy-head-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: var(--adx-success); background: var(--adx-brand-soft); }
.strategy-head-icon .adx-icon { width: 18px; height: 18px; }
.strategy-title-line { display: flex; align-items: center; gap: 9px; }
.strategy-title-line h2 { margin: 0; font-size: 15px; }
.strategy-head__main p { margin: 6px 0 0; color: var(--adx-text-muted); font-size: 8px; }
.strategy-head__actions { display: flex; gap: 7px; }
.strategy-head__stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; padding-top: 13px; border-top: 1px solid var(--adx-divider); }
.strategy-head__stats span { display: block; color: var(--adx-text-muted); font-size: 8px; }
.strategy-head__stats strong { display: block; margin-top: 4px; font-size: 10px; }
.strategy-group-list { display: grid; gap: 9px; padding: 12px; }
.strategy-group-list section { padding: 13px; border-radius: 13px; background: var(--adx-surface-muted); }
.strategy-group-list header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.strategy-group-list header > div { display: flex; align-items: center; gap: 9px; }
.strategy-group-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--adx-success); background: var(--adx-surface); }
.strategy-group-icon .adx-icon { width: 14px; height: 14px; }
.strategy-group-list header strong { display: block; font-size: 9px; }
.strategy-group-list header small { display: block; margin-top: 4px; color: var(--adx-text-muted); font-size: 8px; }
.strategy-group-list header button { display: inline-flex; align-items: center; gap: 5px; border: 0; color: var(--adx-text-muted); background: transparent; font-size: 8px; }
.strategy-group-list header button .adx-icon { width: 12px; height: 12px; }
.strategy-members { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 11px; }
.strategy-members > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px; padding: 8px 9px; border-radius: 9px; background: var(--adx-surface); }
.strategy-members span { overflow: hidden; color: var(--adx-text-body); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.strategy-members strong { font-size: 8px; }
.strategy-members i { grid-column: 1 / -1; height: 3px; overflow: hidden; border-radius: 99px; background: var(--adx-divider); }
.strategy-members i b { display: block; height: 100%; background: var(--adx-brand-500); }
.strategy-empty,
.strategy-no-selection { display: grid; place-items: center; align-content: center; min-height: 250px; color: var(--adx-text-muted); text-align: center; }
.strategy-empty > .adx-icon,
.strategy-no-selection .adx-icon { width: 28px; height: 28px; color: var(--adx-success); }
.strategy-empty strong,
.strategy-no-selection strong { margin-top: 12px; color: var(--adx-text-strong); font-size: 10px; }
.strategy-empty span { margin-top: 5px; font-size: 8px; }
.strategy-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.strategy-form .full { grid-column: 1 / -1; }
.strategy-textarea { height: 90px; padding-top: 10px; }
.strategy-textarea textarea { height: 68px; resize: none; }
.strategy-source-title { display: flex; align-items: center; justify-content: space-between; margin-top: 5px; }
.strategy-source-title span { font-size: 10px; font-weight: 650; }
.strategy-source-title small { color: var(--adx-text-muted); font-size: 8px; }
.strategy-source-picker { display: grid; gap: 7px; }
.strategy-source-picker > button { display: grid; grid-template-columns: 18px minmax(0, 1fr) 68px; align-items: center; gap: 8px; min-height: 50px; padding: 8px 10px; border: 1px solid transparent; border-radius: 11px; color: var(--adx-text-body); background: var(--adx-surface-muted); text-align: left; }
.strategy-source-picker > button.selected { border-color: var(--adx-brand-500); background: var(--adx-brand-soft); }
.strategy-source-picker > button > .adx-icon { width: 15px; height: 15px; color: var(--adx-text-faint); }
.strategy-source-picker > button.selected > .adx-icon { color: var(--adx-success); }
.strategy-source-picker strong { display: block; font-size: 9px; }
.strategy-source-picker small { display: block; margin-top: 3px; color: var(--adx-text-muted); font-size: 7px; }
.strategy-source-picker input { height: 30px; padding: 0 7px; border: 0; border-radius: 8px; color: var(--adx-text-body); background: var(--adx-surface); font-size: 8px; }
.spinning { animation: strategy-spin .9s linear infinite; }
@keyframes strategy-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) { .strategy-layout { grid-template-columns: 240px minmax(0, 1fr); } .strategy-head__stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
