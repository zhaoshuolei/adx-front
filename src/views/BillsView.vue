<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, CheckCircle2, CircleAlert, FileSpreadsheet, RefreshCw, Upload, X } from 'lucide-vue-next'
import { getBillBatches, uploadBill, type BillBatch } from '@/services/special'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const loading = ref(true)
const error = ref('')
const batches = ref<BillBatch[]>([])
const uploadOpen = ref(false)
const uploading = ref(false)
const file = ref<File | null>(null)
const dsp = ref('向新 DSP')
const billingDate = ref('2026-09-22')
const dragActive = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 })
const integer = new Intl.NumberFormat('zh-CN')

const stats = computed(() => ({
  total: batches.value.length,
  success: batches.value.filter((item) => item.status === 'SUCCESS').length,
  failedRows: batches.value.reduce((sum, item) => sum + item.failedRows, 0),
  amount: batches.value.reduce((sum, item) => sum + item.totalCost, 0),
}))

const visibleBatches = computed(() => batches.value)

function statusMeta(status: BillBatch['status']) {
  if (status === 'SUCCESS') return { label: '导入成功', tone: 'success' }
  if (status === 'PARTIAL_FAILED') return { label: '部分失败', tone: 'warning' }
  if (status === 'IMPORTING') return { label: '导入中', tone: 'info' }
  return { label: '导入失败', tone: 'danger' }
}

function dateText(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    batches.value = await getBillBatches(auth.accessToken)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '账单批次加载失败'
  } finally {
    loading.value = false
  }
}

function openUpload() {
  file.value = null
  uploadOpen.value = true
}

function chooseFile() { inputRef.value?.click() }
function handleFile(selected?: File | null) { if (selected) file.value = selected }
function handleDrop(event: DragEvent) { dragActive.value = false; handleFile(event.dataTransfer?.files?.[0]) }

async function submitUpload() {
  if (!file.value) { toast.show('请先选择账单文件'); return }
  uploading.value = true
  try {
    const batch = await uploadBill(auth.accessToken, { file: file.value, dsp: dsp.value, billingDate: billingDate.value })
    toast.show(batch.status === 'SUCCESS' ? '账单导入成功' : '账单已导入，请处理失败明细')
    uploadOpen.value = false
    await load()
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '账单上传失败')
  } finally {
    uploading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="bills-page">
    <header class="adx-page-header"><div><p class="adx-page-kicker">财务结算 · 账单导入</p><h1 class="adx-page-title">DSP 账单</h1><p class="adx-page-description">上传 DSP 结算账单，查看导入批次、校验结果、失败明细和结算金额。</p></div><div class="adx-page-actions"><button class="adx-button adx-button--secondary" type="button" @click="load"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button><button class="adx-button adx-button--primary" type="button" @click="openUpload"><Upload class="adx-icon" />上传账单</button></div></header>
    <div v-if="error" class="bills-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load">重新加载</button></div>
    <section class="bills-stats"><article><span>导入批次</span><strong>{{ stats.total }}</strong><small>最近导入记录</small></article><article><span>成功批次</span><strong>{{ stats.success }}</strong><small>全部行校验通过</small></article><article><span>失败明细</span><strong>{{ integer.format(stats.failedRows) }}</strong><small>需要财务处理</small></article><article><span>账单金额</span><strong>{{ currency.format(stats.amount) }}</strong><small>当前批次合计</small></article></section>
    <section class="adx-panel bills-table-panel"><div class="adx-panel__head"><div><h2 class="adx-panel__title">导入批次</h2><p class="adx-panel__meta">支持 CSV 与 XLSX，批次完成校验后进入对账流程</p></div><span class="adx-status adx-status--info">共 {{ visibleBatches.length }} 批</span></div>
      <div v-if="loading" class="bills-loading"><div v-for="index in 5" :key="index" class="adx-skeleton" /></div>
      <div v-else-if="visibleBatches.length" class="adx-table-wrap"><table class="adx-table bills-table"><thead><tr><th>文件</th><th>DSP</th><th>账单日期</th><th>状态</th><th>行数</th><th>成功 / 失败</th><th>账单金额</th><th>导入时间</th><th>操作人</th><th>操作</th></tr></thead><tbody><tr v-for="batch in visibleBatches" :key="batch.id"><td><div class="bills-file"><FileSpreadsheet class="adx-icon" /><span><strong>{{ batch.fileName }}</strong><small>批次 #{{ batch.id }}</small></span></div></td><td>{{ batch.dsp }}</td><td>{{ batch.billingDate }}</td><td><span class="adx-status" :class="`adx-status--${statusMeta(batch.status).tone}`">{{ statusMeta(batch.status).label }}</span></td><td>{{ integer.format(batch.totalRows) }}</td><td><span class="bills-success">{{ integer.format(batch.successRows) }}</span> / <span class="bills-failed">{{ integer.format(batch.failedRows) }}</span></td><td>{{ currency.format(batch.totalCost) }}</td><td>{{ dateText(batch.importedAt) }}</td><td>{{ batch.importedBy }}</td><td><button class="bills-detail" type="button" @click="toast.show(batch.failedRows ? `下载批次 #${batch.id} 错误明细` : '该批次没有错误明细')">{{ batch.failedRows ? '下载错误' : '查看详情' }}</button></td></tr></tbody></table></div>
      <div v-else class="bills-empty"><FileSpreadsheet class="adx-icon" /><strong>还没有账单批次</strong><span>上传第一份 DSP 账单后，会在这里显示导入结果。</span><button class="adx-button adx-button--primary" type="button" @click="openUpload"><Upload class="adx-icon" />上传账单</button></div>
    </section>
    <Teleport to="body"><Transition name="adx-fade"><div v-if="uploadOpen" class="adx-overlay" @click="uploading ? undefined : uploadOpen = false" /></Transition><Transition name="adx-drawer"><aside v-if="uploadOpen" class="adx-drawer" role="dialog" aria-modal="true"><header class="adx-drawer__head"><div><p class="adx-drawer__kicker">IMPORT DSP BILL</p><h2 class="adx-drawer__title">上传 DSP 账单</h2><p class="adx-drawer__description">选择账单文件和对应结算日期，系统会完成格式、重复行和金额校验。</p></div><button class="adx-drawer__close" type="button" aria-label="关闭" :disabled="uploading" @click="uploadOpen = false"><X class="adx-icon" /></button></header><div class="adx-drawer__body"><div class="bill-upload-form"><label class="adx-field"><span class="adx-field__label">DSP 渠道 *</span><span class="adx-input-shell"><select v-model="dsp"><option>向新 DSP</option><option>聚点 DSP</option><option>云图 DSP</option><option>星云 DSP</option></select></span></label><label class="adx-field"><span class="adx-field__label">账单日期 *</span><span class="adx-input-shell"><input v-model="billingDate" type="date" /></span></label><input ref="inputRef" type="file" accept=".csv,.xlsx" hidden @change="handleFile(($event.target as HTMLInputElement).files?.[0])" /><button class="bill-dropzone" :class="{ active: dragActive, chosen: file }" type="button" @click="chooseFile" @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false" @drop.prevent="handleDrop"><Upload class="adx-icon" /><strong>{{ file ? file.name : '点击或拖拽账单文件到这里' }}</strong><span>{{ file ? `${(file.size / 1024).toFixed(1)} KB` : '支持 CSV、XLSX，单文件不超过 20MB' }}</span></button><div class="bill-upload-tip"><AlertTriangle class="adx-icon" /><p>同一 DSP 和账单日期重复上传时，系统会创建新批次并在对账页标记差异。</p></div></div></div><footer class="adx-drawer__foot"><button class="adx-button adx-button--secondary" type="button" :disabled="uploading" @click="uploadOpen = false">取消</button><button class="adx-button adx-button--primary" type="button" :disabled="uploading || !file" @click="submitUpload"><component :is="uploading ? RefreshCw : Upload" class="adx-icon" :class="{ spinning: uploading }" />{{ uploading ? '正在导入…' : '开始导入' }}</button></footer></aside></Transition></Teleport>
  </div>
</template>

<style scoped>
.bills-page { min-width: 0; }
.bills-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.bills-error .adx-icon { width: 15px; height: 15px; }
.bills-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; }
.bills-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.bills-stats article { min-height: 102px; padding: 14px 15px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.bills-stats span { color: var(--adx-text-muted); font-size: 9px; }
.bills-stats strong { display: block; margin-top: 12px; font-size: 21px; }
.bills-stats small { display: block; margin-top: 7px; color: var(--adx-text-muted); font-size: 8px; }
.bills-table-panel { margin-top: 12px; }
.bills-loading { display: grid; gap: 7px; padding: 12px; }
.bills-loading .adx-skeleton { height: 44px; }
.bills-file { display: flex; align-items: center; gap: 8px; }
.bills-file .adx-icon { width: 17px; height: 17px; color: var(--adx-success); }
.bills-file strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.bills-file small { display: block; margin-top: 3px; color: var(--adx-text-muted); font-size: 8px; }
.bills-success { color: var(--adx-success); }
.bills-failed { color: var(--adx-danger); }
.bills-detail { height: 27px; padding: 0 8px; border: 0; border-radius: 8px; color: var(--adx-success); background: var(--adx-brand-soft); font-size: 8px; }
.bills-empty { display: grid; place-items: center; align-content: center; min-height: 280px; color: var(--adx-text-muted); text-align: center; }
.bills-empty > .adx-icon { width: 30px; height: 30px; color: var(--adx-success); }
.bills-empty strong { margin-top: 13px; color: var(--adx-text-strong); font-size: 11px; }
.bills-empty span { margin-top: 6px; font-size: 9px; }
.bills-empty .adx-button { margin-top: 15px; }
.bill-upload-form { display: grid; gap: 15px; }
.bill-upload-form select { appearance: auto; }
.bill-dropzone { display: grid; place-items: center; min-height: 190px; padding: 20px; border: 1px dashed #c8d4dc; border-radius: 15px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.bill-dropzone.active,
.bill-dropzone.chosen { border-color: var(--adx-brand-500); background: var(--adx-brand-soft); }
.bill-dropzone .adx-icon { width: 28px; height: 28px; color: var(--adx-success); }
.bill-dropzone strong { margin-top: 12px; color: var(--adx-text-strong); font-size: 10px; }
.bill-dropzone span { margin-top: 6px; color: var(--adx-text-muted); font-size: 8px; }
.bill-upload-tip { display: flex; gap: 8px; padding: 11px; border-radius: 11px; color: var(--adx-warning); background: var(--adx-warning-soft); }
.bill-upload-tip .adx-icon { flex: 0 0 auto; width: 15px; height: 15px; }
.bill-upload-tip p { margin: 0; font-size: 8px; line-height: 1.55; }
.spinning { animation: bills-spin .9s linear infinite; }
@keyframes bills-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) { .bills-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
