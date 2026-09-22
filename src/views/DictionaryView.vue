<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CircleAlert, Pencil, Plus, Search, Trash2, X } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { request } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

interface DictionaryItem {
  id: number
  name: string
  width?: number
  height?: number
  sortOrder?: number
  parentId?: number
  iabCode?: string
  specId?: string
  adType?: number
  creativeType?: number
  aspectRatio?: string
  minWidth?: number
  minHeight?: number
  maxFileSize?: number
  acceptedFormats?: string
  enabled?: boolean
}

interface DictionaryField {
  key: string
  label: string
  type?: string
  required?: boolean
  placeholder?: string
}

type DictionaryKey = 'ad-sizes' | 'app-categories' | 'trades' | 'tags' | 'creative-specs'

const tabs: Array<{ key: DictionaryKey; label: string; description: string }> = [
  { key: 'ad-sizes', label: '广告尺寸', description: '广告位和素材允许使用的宽高尺寸。' },
  { key: 'app-categories', label: '应用分类', description: '媒体应用的一级、二级分类体系。' },
  { key: 'trades', label: '行业', description: '广告投放行业和 IAB 分类编码。' },
  { key: 'tags', label: '广告位标签', description: '用于广告位分组和策略筛选的标签。' },
  { key: 'creative-specs', label: '素材规格', description: '图片、视频素材的尺寸和格式约束。' },
]

const auth = useAuthStore()
const toast = useToastStore()
const active = ref<DictionaryKey>('ad-sizes')
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const rows = ref<DictionaryItem[]>([])
const editorOpen = ref(false)
const editing = ref<DictionaryItem | null>(null)
const saving = ref(false)
const form = reactive<Record<string, string | number | boolean | undefined>>({})
const deleteTarget = ref<DictionaryItem | null>(null)
const deleting = ref(false)

const currentTab = computed(() => tabs.find((tab) => tab.key === active.value) || tabs[0]!)
const filteredRows = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return rows.value
  return rows.value.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query)))
})

const fields = computed<DictionaryField[]>(() => {
  switch (active.value) {
    case 'ad-sizes': return [{ key: 'name', label: '尺寸名称', required: true }, { key: 'width', label: '宽度（px）', type: 'number', required: true }, { key: 'height', label: '高度（px）', type: 'number', required: true }, { key: 'sortOrder', label: '排序', type: 'number' }]
    case 'app-categories': return [{ key: 'name', label: '分类名称', required: true }, { key: 'parentId', label: '父分类 ID', type: 'number' }, { key: 'sortOrder', label: '排序', type: 'number' }]
    case 'trades': return [{ key: 'name', label: '行业名称', required: true }, { key: 'iabCode', label: 'IAB 编码', placeholder: 'IAB-1' }, { key: 'sortOrder', label: '排序', type: 'number' }]
    case 'tags': return [{ key: 'name', label: '标签名称', required: true }, { key: 'sortOrder', label: '排序', type: 'number' }]
    case 'creative-specs': return [{ key: 'specId', label: '规格标识', required: true, placeholder: 'splash_image' }, { key: 'name', label: '规格名称', required: true }, { key: 'adType', label: '广告类型', type: 'number' }, { key: 'creativeType', label: '创意类型', type: 'number' }, { key: 'aspectRatio', label: '宽高比', required: true, placeholder: '9:16' }, { key: 'minWidth', label: '最小宽度', type: 'number' }, { key: 'minHeight', label: '最小高度', type: 'number' }, { key: 'maxFileSize', label: '文件大小上限', type: 'number' }, { key: 'acceptedFormats', label: '接受格式', required: true, placeholder: 'JPG,PNG' }, { key: 'sortOrder', label: '排序', type: 'number' }]
  }
})

const columns = computed(() => {
  switch (active.value) {
    case 'ad-sizes': return [{ key: 'name', label: '尺寸名称' }, { key: 'width', label: '宽度' }, { key: 'height', label: '高度' }, { key: 'sortOrder', label: '排序' }]
    case 'app-categories': return [{ key: 'name', label: '分类名称' }, { key: 'parentId', label: '父分类' }, { key: 'sortOrder', label: '排序' }]
    case 'trades': return [{ key: 'name', label: '行业名称' }, { key: 'iabCode', label: 'IAB 编码' }, { key: 'sortOrder', label: '排序' }]
    case 'tags': return [{ key: 'name', label: '标签名称' }, { key: 'sortOrder', label: '排序' }]
    case 'creative-specs': return [{ key: 'specId', label: '规格标识' }, { key: 'name', label: '规格名称' }, { key: 'adType', label: '广告类型' }, { key: 'creativeType', label: '创意类型' }, { key: 'aspectRatio', label: '宽高比' }, { key: 'acceptedFormats', label: '格式' }]
  }
})

const mockRows: Record<DictionaryKey, DictionaryItem[]> = {
  'ad-sizes': [
    { id: 1, name: '640x100 横幅', width: 640, height: 100, sortOrder: 1 },
    { id: 2, name: '1080x1920 开屏', width: 1080, height: 1920, sortOrder: 2 },
    { id: 3, name: '1280x720 激励视频', width: 1280, height: 720, sortOrder: 3 },
    { id: 4, name: '720x1280 插屏', width: 720, height: 1280, sortOrder: 4 },
  ],
  'app-categories': [
    { id: 1, name: '工具', sortOrder: 1 },
    { id: 2, name: '浏览器', parentId: 1, sortOrder: 2 },
    { id: 3, name: '文件管理', parentId: 1, sortOrder: 3 },
    { id: 4, name: '内容资讯', sortOrder: 4 },
  ],
  trades: [
    { id: 1, name: '电商零售', iabCode: 'IAB-1', sortOrder: 1 },
    { id: 2, name: '汽车', iabCode: 'IAB-2', sortOrder: 2 },
    { id: 3, name: '软件与科技', iabCode: 'IAB-4', sortOrder: 3 },
    { id: 4, name: '金融', iabCode: 'IAB-7', sortOrder: 4 },
  ],
  tags: [
    { id: 1, name: '核心流量', sortOrder: 1 },
    { id: 2, name: '品牌安全', sortOrder: 2 },
    { id: 3, name: '高价值', sortOrder: 3 },
    { id: 4, name: '新客', sortOrder: 4 },
  ],
  'creative-specs': [
    { id: 1, specId: 'splash_image', name: '开屏图片', adType: 2, creativeType: 2, aspectRatio: '9:16', minWidth: 1080, minHeight: 1920, maxFileSize: 5242880, acceptedFormats: 'JPG,PNG', sortOrder: 1 },
    { id: 2, specId: 'reward_video', name: '激励视频', adType: 4, creativeType: 4, aspectRatio: '16:9', minWidth: 1280, minHeight: 720, maxFileSize: 20971520, acceptedFormats: 'MP4', sortOrder: 2 },
    { id: 3, specId: 'banner_image', name: '横幅图片', adType: 5, creativeType: 2, aspectRatio: '6.4:1', minWidth: 640, minHeight: 100, maxFileSize: 1048576, acceptedFormats: 'JPG,PNG', sortOrder: 3 },
  ],
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      await new Promise((resolve) => setTimeout(resolve, 260))
      rows.value = structuredClone(mockRows[active.value])
    } else {
      rows.value = await request<DictionaryItem[]>(`/business/dictionary/${active.value}`, {}, auth.accessToken)
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '字典数据加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(key: DictionaryKey) {
  active.value = key
  keyword.value = ''
  void load()
}

function openEditor(item?: DictionaryItem) {
  editing.value = item || null
  Object.keys(form).forEach((key) => delete form[key])
  fields.value.forEach((field) => { form[field.key] = item ? String(item[field.key as keyof DictionaryItem] ?? '') : '' })
  editorOpen.value = true
}

async function save() {
  const payload: Record<string, string | number | boolean | undefined> = {}
  fields.value.forEach((field) => {
    const value = form[field.key]
    payload[field.key] = field.type === 'number' ? Number(value || 0) : value
  })
  saving.value = true
  try {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const store = mockRows[active.value]
      if (editing.value) {
        const index = store.findIndex((row) => row.id === editing.value?.id)
        if (index >= 0) store.splice(index, 1, { ...store[index], ...payload, id: editing.value.id } as DictionaryItem)
      } else {
        store.push({ id: Math.max(0, ...store.map((row) => row.id)) + 1, ...payload } as DictionaryItem)
      }
    } else {
      const path = `/business/dictionary/${active.value}${editing.value ? `/${editing.value.id}` : ''}`
      await request<DictionaryItem>(path, { method: editing.value ? 'PUT' : 'POST', body: JSON.stringify(payload) }, auth.accessToken)
    }
    editorOpen.value = false
    toast.show(editing.value ? '字典项已更新' : '字典项已创建')
    await load()
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const store = mockRows[active.value]
      const index = store.findIndex((row) => row.id === deleteTarget.value?.id)
      if (index >= 0) store.splice(index, 1)
    }
    else await request<void>(`/business/dictionary/${active.value}/${deleteTarget.value.id}`, { method: 'DELETE' }, auth.accessToken)
    deleteTarget.value = null
    toast.show('字典项已删除')
    await load()
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="dictionary-page">
    <header class="adx-page-header"><div><p class="adx-page-kicker">系统设置 · 基础字典</p><h1 class="adx-page-title">字典管理</h1><p class="adx-page-description">统一维护广告尺寸、应用分类、行业、广告位标签和素材规格。</p></div><button class="adx-button adx-button--primary" type="button" @click="openEditor()"><Plus class="adx-icon" />新增{{ currentTab.label }}</button></header>
    <div v-if="error" class="dictionary-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load">重新加载</button></div>
    <section class="adx-panel dictionary-tabs"><button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: active === tab.key }" @click="switchTab(tab.key)"><strong>{{ tab.label }}</strong><small>{{ tab.description }}</small></button></section>
    <section class="adx-panel dictionary-table-panel"><div class="adx-panel__head"><div><h2 class="adx-panel__title">{{ currentTab.label }}</h2><p class="adx-panel__meta">{{ currentTab.description }}</p></div><label class="adx-input-shell dictionary-search"><Search class="adx-icon" /><input v-model="keyword" placeholder="搜索字典项" /></label></div>
      <div v-if="loading" class="dictionary-loading"><div v-for="index in 6" :key="index" class="adx-skeleton" /></div>
      <div v-else-if="filteredRows.length" class="adx-table-wrap"><table class="adx-table"><thead><tr><th v-for="column in columns" :key="column.key">{{ column.label }}</th><th>操作</th></tr></thead><tbody><tr v-for="row in filteredRows" :key="row.id"><td v-for="column in columns" :key="column.key">{{ row[column.key as keyof DictionaryItem] ?? '—' }}</td><td><div class="dictionary-actions"><button type="button" title="编辑" @click="openEditor(row)"><Pencil class="adx-icon" /></button><button class="danger" type="button" title="删除" @click="deleteTarget = row"><Trash2 class="adx-icon" /></button></div></td></tr></tbody></table></div>
      <div v-else class="dictionary-empty"><Search class="adx-icon" /><strong>暂无字典项</strong><span>调整关键词或新增一条记录。</span></div>
    </section>
    <Teleport to="body"><Transition name="adx-fade"><div v-if="editorOpen" class="adx-overlay" @click="editorOpen = false" /></Transition><Transition name="adx-drawer"><aside v-if="editorOpen" class="adx-drawer" role="dialog" aria-modal="true"><header class="adx-drawer__head"><div><p class="adx-drawer__kicker">DICTIONARY ITEM</p><h2 class="adx-drawer__title">{{ editing ? `编辑${currentTab.label}` : `新增${currentTab.label}` }}</h2><p class="adx-drawer__description">{{ currentTab.description }}</p></div><button class="adx-drawer__close" type="button" aria-label="关闭" @click="editorOpen = false"><X class="adx-icon" /></button></header><div class="adx-drawer__body"><form id="dictionaryForm" class="dictionary-form" @submit.prevent="save"><label v-for="field in fields" :key="field.key" class="adx-field"><span class="adx-field__label">{{ field.label }}<template v-if="field.required"> *</template></span><span class="adx-input-shell"><input v-model="form[field.key]" :type="field.type === 'number' ? 'number' : 'text'" :placeholder="field.placeholder" /></span></label></form></div><footer class="adx-drawer__foot"><button class="adx-button adx-button--secondary" type="button" @click="editorOpen = false">取消</button><button class="adx-button adx-button--primary" form="dictionaryForm" type="submit" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button></footer></aside></Transition></Teleport>
    <ConfirmDialog :open="Boolean(deleteTarget)" title="确认删除字典项？" description="删除前请确认没有广告位、素材或策略引用该字典项。" confirm-label="确认删除" danger :loading="deleting" @close="deleteTarget = null" @confirm="confirmDelete" />
  </div>
</template>

<style scoped>
.dictionary-page { min-width: 0; }
.dictionary-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.dictionary-error .adx-icon { width: 15px; height: 15px; }
.dictionary-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; }
.dictionary-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; padding: 6px; }
.dictionary-tabs button { display: grid; gap: 4px; min-height: 56px; padding: 9px 10px; border: 0; border-radius: 11px; color: var(--adx-text-body); background: transparent; text-align: left; }
.dictionary-tabs button:hover { background: var(--adx-surface-muted); }
.dictionary-tabs button.active { color: var(--adx-success); background: var(--adx-brand-soft); }
.dictionary-tabs strong { font-size: 10px; }
.dictionary-tabs small { overflow: hidden; color: var(--adx-text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.dictionary-table-panel { margin-top: 12px; }
.dictionary-search { width: 230px; }
.dictionary-search input { font-size: 9px; }
.dictionary-loading { display: grid; gap: 7px; padding: 12px; }
.dictionary-loading .adx-skeleton { height: 40px; }
.dictionary-actions { display: flex; gap: 5px; }
.dictionary-actions button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.dictionary-actions button:hover { color: var(--adx-success); background: var(--adx-brand-soft); }
.dictionary-actions button.danger:hover { color: var(--adx-danger); background: var(--adx-danger-soft); }
.dictionary-actions .adx-icon { width: 13px; height: 13px; }
.dictionary-empty { display: grid; place-items: center; align-content: center; min-height: 240px; color: var(--adx-text-muted); text-align: center; }
.dictionary-empty .adx-icon { width: 28px; height: 28px; color: var(--adx-success); }
.dictionary-empty strong { margin-top: 12px; color: var(--adx-text-strong); font-size: 10px; }
.dictionary-empty span { margin-top: 5px; font-size: 8px; }
.dictionary-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 1260px) { .dictionary-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
