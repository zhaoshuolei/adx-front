export type ResourceValue = string | number | boolean | string[] | null | undefined

export interface ResourceRow {
  id: number
  [key: string]: ResourceValue | number | object
}

export interface ResourceColumn {
  key: string
  label: string
  type?: 'text' | 'subtext' | 'status' | 'number' | 'currency' | 'percent' | 'date' | 'tags' | 'boolean'
  align?: 'left' | 'right'
}

export interface ResourceField {
  key: string
  label: string
  type?: 'text' | 'number' | 'select' | 'textarea' | 'switch'
  options?: Array<{ label: string; value: string | number }>
  required?: boolean
  placeholder?: string
  hint?: string
  disabled?: boolean
}

export interface ResourceFilter {
  key: string
  label: string
  type?: 'text' | 'select'
  options?: Array<{ label: string; value: string | number }>
}

export interface ResourceMetric {
  label: string
  key: string
  format?: 'number' | 'currency' | 'percent' | 'count'
  hint?: string
}

export interface ResourceConfig {
  title: string
  kicker: string
  description: string
  entityLabel: string
  endpoint: string
  listPath?: string
  updatePath?: string
  statusPath?: string
  deletePath?: string
  permissionsPath?: string
  columns: ResourceColumn[]
  fields: ResourceField[]
  filters: ResourceFilter[]
  metrics: ResourceMetric[]
  mockRows: ResourceRow[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canToggle?: boolean
  toggleKey?: string
  statusKey?: string
  statusLabels?: Record<string, string>
  detailTitleKey?: string
}

const boolStatus = { '1': '已启用', '0': '已停用' }

export const resourceConfigs: Record<string, ResourceConfig> = {
  media: {
    title: '媒体与公司',
    kicker: '广告运营 · 媒体资源',
    description: '维护媒体公司、媒体应用、接入方式和独立密钥，并查看媒体下的广告位规模。',
    entityLabel: '媒体应用',
    endpoint: '/business/media',
    statusPath: '/business/media/{id}/status',
    columns: [
      { key: 'appName', label: '媒体应用', type: 'subtext' },
      { key: 'mediaCompanyName', label: '媒体公司' },
      { key: 'mediaId', label: '媒体标识' },
      { key: 'packageName', label: '应用包名' },
      { key: 'appType', label: '平台', type: 'status' },
      { key: 'accessMode', label: '接入方式', type: 'status' },
      { key: 'adSpaceCount', label: '广告位', type: 'number', align: 'right' },
      { key: 'enabled', label: '状态', type: 'boolean' },
    ],
    fields: [
      { key: 'appName', label: '应用名称', required: true, placeholder: '如：乐商店 Android' },
      { key: 'mediaId', label: '媒体唯一标识', required: true, placeholder: 'lenovo_store' },
      { key: 'mediaCompanyName', label: '媒体公司', type: 'select', options: [{ label: '联想应用', value: '联想应用' }, { label: '联想浏览器', value: '联想浏览器' }, { label: '联想文件', value: '联想文件' }] },
      { key: 'packageName', label: '应用包名', required: true, placeholder: 'com.lenovo.leos.store' },
      { key: 'appId', label: '渠道侧应用 ID', placeholder: '第三方渠道 ID' },
      { key: 'version', label: '应用版本', placeholder: '8.4.1' },
      { key: 'appType', label: '应用平台', type: 'select', required: true, options: [{ label: 'Android', value: 'ANDROID' }, { label: 'iOS', value: 'IOS' }, { label: '快应用', value: 'QUICK_APP' }, { label: 'Windows', value: 'WINDOWS' }] },
      { key: 'accessMode', label: '接入方式', type: 'select', required: true, options: [{ label: 'SDK', value: 'SDK' }, { label: 'API', value: 'API' }] },
      { key: 'description', label: '应用简介', type: 'textarea', placeholder: '最多 50 字' },
      { key: 'enabled', label: '启用媒体', type: 'switch' },
    ],
    filters: [
      { key: 'keyword', label: '关键词', type: 'text' },
      { key: 'appType', label: '应用平台', type: 'select', options: [{ label: 'Android', value: 'ANDROID' }, { label: 'iOS', value: 'IOS' }, { label: '快应用', value: 'QUICK_APP' }] },
      { key: 'enabled', label: '状态', type: 'select', options: [{ label: '已启用', value: '1' }, { label: '已停用', value: '0' }] },
    ],
    metrics: [
      { label: '媒体应用', key: 'total', format: 'count', hint: '已接入应用总数' },
      { label: '已启用', key: 'enabled', format: 'count', hint: '可参与广告请求' },
      { label: 'SDK 接入', key: 'sdk', format: 'count', hint: '客户端 SDK 方式' },
      { label: '广告位', key: 'adSpaces', format: 'number', hint: '媒体下广告位总数' },
    ],
    canCreate: true,
    canEdit: true,
    canToggle: true,
    toggleKey: 'enabled',
    statusKey: 'enabled',
    detailTitleKey: 'appName',
    mockRows: Array.from({ length: 18 }, (_, index) => ({
      id: 100 + index,
      appName: ['乐商店 Android', '天气通', '联想浏览器', '乐日历', '文件管理', '安全中心'][index % 6] + (index > 5 ? ` ${index}` : ''),
      mediaCompanyName: ['联想应用', '联想浏览器', '联想文件'][index % 3],
      mediaId: ['lenovo_store', 'lenovo_weather', 'lenovo_browser', 'lenovo_calendar', 'lenovo_files', 'lenovo_security'][index % 6],
      packageName: ['com.lenovo.leos.store', 'com.lenovo.weather', 'com.lenovo.browser', 'com.lenovo.calendar', 'com.lenovo.files', 'com.lenovo.security'][index % 6],
      appType: ['ANDROID', 'IOS', 'QUICK_APP'][index % 3],
      accessMode: index % 5 === 0 ? 'API' : 'SDK',
      version: `8.${index % 5}.1`,
      adSpaceCount: 4 + index % 12,
      enabled: index % 7 !== 0,
      description: 'ADX 管理台媒体应用',
      appId: `app_${index + 1}`,
    })),
  },
  'ad-sources': {
    title: 'DSP 广告源',
    kicker: '广告运营 · 广告供给',
    description: '维护 DSP 广告源的渠道、媒体、类型、预算、eCPM、限量和广告位绑定关系。',
    entityLabel: '广告源',
    endpoint: '/business/ad-sources',
    columns: [
      { key: 'sourceName', label: '广告源', type: 'subtext' },
      { key: 'sourceId', label: '广告位标识' },
      { key: 'dspConfigName', label: 'DSP 渠道' },
      { key: 'mediaName', label: '媒体应用' },
      { key: 'adType', label: '类型', type: 'status' },
      { key: 'estEcpm', label: '预估 eCPM', type: 'currency', align: 'right' },
      { key: 'actualEcpm', label: '实际 eCPM', type: 'currency', align: 'right' },
      { key: 'boundAdSpaceCount', label: '绑定广告位', type: 'number', align: 'right' },
      { key: 'enabled', label: '状态', type: 'boolean' },
    ],
    fields: [
      { key: 'sourceName', label: '广告源名称', required: true, placeholder: '如：向新 Store 横幅' },
      { key: 'sourceId', label: '广告位标识', placeholder: '渠道侧广告位标识' },
      { key: 'dspConfigId', label: 'DSP 渠道', type: 'select', required: true, options: [{ label: '向新 DSP', value: 1 }, { label: '聚点 DSP', value: 2 }, { label: '云图 DSP', value: 3 }] },
      { key: 'mediaId', label: '媒体应用', type: 'select', required: true, options: [{ label: '乐商店 Android', value: 1 }, { label: '天气通', value: 2 }, { label: '联想浏览器', value: 3 }] },
      { key: 'adType', label: '广告类型', type: 'select', required: true, options: [{ label: '横幅', value: 'BANNER' }, { label: '激励视频', value: 'VIDEO' }, { label: '原生', value: 'NATIVE' }, { label: '开屏', value: 'SPLASH' }, { label: '插屏', value: 'INTERSTITIAL' }] },
      { key: 'adStatus', label: '广告状态', type: 'select', required: true, options: [{ label: '正式', value: 'production' }, { label: '申请中', value: 'applying' }] },
      { key: 'estEcpm', label: '预估 eCPM', type: 'number' },
      { key: 'actualEcpm', label: '实际 eCPM', type: 'number' },
      { key: 'rateLimit', label: '限量 QPS', type: 'number', placeholder: '留空表示不限' },
      { key: 'enabled', label: '启用广告源', type: 'switch' },
    ],
    filters: [
      { key: 'keyword', label: '关键词', type: 'text' },
      { key: 'adStatus', label: '广告状态', type: 'select', options: [{ label: '正式', value: 'production' }, { label: '申请中', value: 'applying' }] },
      { key: 'enabled', label: '状态', type: 'select', options: [{ label: '已启用', value: '1' }, { label: '已停用', value: '0' }] },
    ],
    metrics: [
      { label: '广告源', key: 'total', format: 'count', hint: '全部 DSP 广告源' },
      { label: '正式投放', key: 'production', format: 'count', hint: 'production 状态' },
      { label: '平均 eCPM', key: 'avgEcpm', format: 'currency', hint: '实际 eCPM 均值' },
      { label: '已绑定广告位', key: 'bound', format: 'number', hint: '绑定关系总数' },
    ],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canToggle: true,
    toggleKey: 'enabled',
    statusKey: 'enabled',
    detailTitleKey: 'sourceName',
    mockRows: Array.from({ length: 24 }, (_, index) => ({
      id: 200 + index,
      sourceName: ['向新 Store 横幅', '聚点信息流原生', '云图激励视频', '星云开屏广告', '极光插屏'][index % 5] + (index > 4 ? ` ${index}` : ''),
      sourceId: `source_${String(index + 1).padStart(2, '0')}`,
      dspConfigId: index % 4 + 1,
      dspConfigName: ['向新 DSP', '聚点 DSP', '云图 DSP', '星云 DSP'][index % 4],
      mediaId: index % 6 + 1,
      mediaName: ['乐商店 Android', '天气通', '联想浏览器', '乐日历', '文件管理'][index % 5],
      adType: ['BANNER', 'VIDEO', 'NATIVE', 'SPLASH', 'INTERSTITIAL'][index % 5],
      adStatus: index % 8 === 0 ? 'applying' : 'production',
      estEcpm: 16.8 + index % 9 * 0.73,
      actualEcpm: 17.4 + index % 9 * 0.81,
      boundAdSpaceCount: index % 9,
      rateLimit: index % 4 === 0 ? undefined : 100 + index * 10,
      enabled: index % 6 !== 0,
    })),
  },
  dsp: {
    title: 'DSP 配置',
    kicker: '广告运营 · 渠道配置',
    description: '配置 DSP 渠道接口、协议参数与密钥，并检查接口健康和轮换凭证。',
    entityLabel: 'DSP 渠道',
    endpoint: '/business/dsp',
    columns: [
      { key: 'name', label: 'DSP 渠道', type: 'subtext' },
      { key: 'code', label: '渠道编码' },
      { key: 'baseUrl', label: '接口地址' },
      { key: 'protocol', label: '协议' },
      { key: 'todaySpend', label: '今日消耗', type: 'currency', align: 'right' },
      { key: 'successRate', label: '成功率', type: 'percent', align: 'right' },
      { key: 'keyAge', label: '密钥状态' },
      { key: 'enabled', label: '状态', type: 'boolean' },
    ],
    fields: [
      { key: 'name', label: '渠道名称', required: true, placeholder: '如：向新 DSP' },
      { key: 'code', label: '渠道编码', required: true, placeholder: 'xinxin' },
      { key: 'baseUrl', label: '接口地址', required: true, placeholder: 'https://dsp.example.com/bid' },
      { key: 'protocol', label: '协议', type: 'select', options: [{ label: 'OpenRTB 2.5', value: 'openrtb25' }, { label: '自定义 JSON', value: 'json' }] },
      { key: 'timeoutMs', label: '超时（毫秒）', type: 'number' },
      { key: 'enabled', label: '启用渠道', type: 'switch' },
    ],
    filters: [
      { key: 'keyword', label: '关键词', type: 'text' },
      { key: 'enabled', label: '状态', type: 'select', options: [{ label: '已启用', value: '1' }, { label: '已停用', value: '0' }] },
    ],
    metrics: [
      { label: 'DSP 渠道', key: 'total', format: 'count', hint: '已接入渠道' },
      { label: '接口健康', key: 'healthy', format: 'count', hint: '健康检查通过' },
      { label: '今日消耗', key: 'spend', format: 'currency', hint: '全部渠道汇总' },
      { label: '平均成功率', key: 'success', format: 'percent', hint: '竞价请求成功比例' },
    ],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canToggle: false,
    toggleKey: 'enabled',
    statusKey: 'enabled',
    detailTitleKey: 'name',
    mockRows: Array.from({ length: 12 }, (_, index) => ({
      id: 300 + index,
      name: ['向新 DSP', '聚点 DSP', '云图 DSP', '星云 DSP', '极光 DSP', '海纳 DSP'][index % 6] + (index > 5 ? ` ${index}` : ''),
      code: ['xinxin', 'judian', 'yuntu', 'xingyun', 'jiguang', 'haina'][index % 6],
      baseUrl: `https://dsp-${index + 1}.example.com/bid`,
      protocol: index % 2 ? '自定义 JSON' : 'OpenRTB 2.5',
      todaySpend: 32000 + index * 4100,
      successRate: 96.2 + index % 4,
      keyAge: index % 5 === 0 ? '需要轮换' : `${12 + index} 天前`,
      timeoutMs: 320 + index * 10,
      enabled: index % 5 !== 0,
    })),
  },
  'fallback-ads': {
    title: '兜底广告',
    kicker: '广告运营 · 投放保障',
    description: '维护所有 DSP 竞败时返回的兜底广告，并查看素材、优先级和投放状态。',
    entityLabel: '兜底广告',
    endpoint: '/business/fallback-ads',
    columns: [
      { key: 'name', label: '广告名称', type: 'subtext' },
      { key: 'mediaName', label: '媒体应用' },
      { key: 'adType', label: '广告类型', type: 'status' },
      { key: 'priority', label: '优先级', type: 'number', align: 'right' },
      { key: 'creativeUrl', label: '素材地址' },
      { key: 'impressions', label: '今日曝光', type: 'number', align: 'right' },
      { key: 'ctr', label: 'CTR', type: 'percent', align: 'right' },
      { key: 'enabled', label: '状态', type: 'boolean' },
    ],
    fields: [
      { key: 'name', label: '广告名称', required: true },
      { key: 'mediaName', label: '媒体应用', type: 'select', options: [{ label: '乐商店 Android', value: '乐商店 Android' }, { label: '天气通', value: '天气通' }, { label: '联想浏览器', value: '联想浏览器' }] },
      { key: 'adType', label: '广告类型', type: 'select', options: [{ label: '横幅', value: 'BANNER' }, { label: '开屏', value: 'SPLASH' }, { label: '插屏', value: 'INTERSTITIAL' }, { label: '原生', value: 'NATIVE' }] },
      { key: 'priority', label: '优先级', type: 'number' },
      { key: 'creativeUrl', label: '素材地址', required: true },
      { key: 'landingUrl', label: '落地页地址' },
      { key: 'enabled', label: '启用广告', type: 'switch' },
    ],
    filters: [
      { key: 'keyword', label: '关键词', type: 'text' },
      { key: 'adType', label: '广告类型', type: 'select', options: [{ label: '横幅', value: 'BANNER' }, { label: '开屏', value: 'SPLASH' }, { label: '插屏', value: 'INTERSTITIAL' }] },
      { key: 'enabled', label: '状态', type: 'select', options: [{ label: '已启用', value: '1' }, { label: '已停用', value: '0' }] },
    ],
    metrics: [
      { label: '兜底广告', key: 'total', format: 'count', hint: '全部广告素材' },
      { label: '已启用', key: 'enabled', format: 'count', hint: '当前可投放' },
      { label: '今日曝光', key: 'impressions', format: 'number', hint: '兜底广告总曝光' },
      { label: '平均 CTR', key: 'ctr', format: 'percent', hint: '点击 / 曝光' },
    ],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canToggle: true,
    toggleKey: 'enabled',
    statusKey: 'enabled',
    detailTitleKey: 'name',
    mockRows: Array.from({ length: 10 }, (_, index) => ({
      id: 400 + index,
      name: ['默认品牌横幅', '大促活动开屏', '下载引导插屏', '内容推荐原生'][index % 4] + (index > 3 ? ` ${index}` : ''),
      mediaName: ['乐商店 Android', '天气通', '联想浏览器'][index % 3],
      adType: ['BANNER', 'SPLASH', 'INTERSTITIAL', 'NATIVE'][index % 4],
      priority: index + 1,
      creativeUrl: `https://cdn.example.com/fallback/${index + 1}.jpg`,
      landingUrl: 'https://www.lenovo.com.cn',
      impressions: 82000 + index * 12100,
      ctr: 1.8 + index * 0.12,
      enabled: index % 5 !== 0,
    })),
  },
  users: {
    title: '用户管理',
    kicker: '系统设置 · 访问控制',
    description: '维护后台用户、角色分配、用户状态和密码重置。',
    entityLabel: '用户',
    endpoint: '/users',
    statusPath: '/users/{id}/status',
    columns: [
      { key: 'displayName', label: '用户', type: 'subtext' },
      { key: 'username', label: '用户名' },
      { key: 'rolesText', label: '角色' },
      { key: 'department', label: '所属部门' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'lastLoginAt', label: '最后登录', type: 'date' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
    ],
    fields: [
      { key: 'displayName', label: '显示名称', required: true },
      { key: 'username', label: '用户名', required: true },
      { key: 'password', label: '初始密码', required: true, type: 'text', placeholder: '编辑时留空表示不修改' },
      { key: 'department', label: '所属部门', type: 'select', options: [{ label: '总公司', value: '总公司' }, { label: '运营中心', value: '运营中心' }, { label: '研发中心', value: '研发中心' }, { label: '财务部', value: '财务部' }] },
      { key: 'roleIdsText', label: '角色', type: 'select', options: [{ label: '超级管理员', value: '超级管理员' }, { label: '运营管理员', value: '运营管理员' }, { label: '财务', value: '财务' }, { label: '运维', value: '运维' }] },
    ],
    filters: [
      { key: 'keyword', label: '关键词', type: 'text' },
      { key: 'rolesText', label: '角色', type: 'select', options: [{ label: '超级管理员', value: '超级管理员' }, { label: '运营管理员', value: '运营管理员' }, { label: '财务', value: '财务' }] },
      { key: 'status', label: '状态', type: 'select', options: [{ label: '已启用', value: '1' }, { label: '已停用', value: '0' }] },
    ],
    metrics: [
      { label: '用户总数', key: 'total', format: 'count', hint: '后台用户' },
      { label: '已启用', key: 'enabled', format: 'count', hint: '可登录用户' },
      { label: '管理员', key: 'admins', format: 'count', hint: '含管理员角色' },
      { label: '本月新增', key: 'newUsers', format: 'count', hint: '最近 30 天' },
    ],
    canCreate: true,
    canEdit: true,
    canToggle: true,
    toggleKey: 'enabled',
    statusKey: 'status',
    statusLabels: boolStatus,
    detailTitleKey: 'displayName',
    mockRows: [
      { id: 1, username: 'admin', displayName: '系统管理员', rolesText: '超级管理员', department: '总公司', status: '已启用', enabled: true, lastLoginAt: '2026-09-22T09:10:00+08:00', createdAt: '2026-01-01T08:00:00+08:00' },
      ...Array.from({ length: 14 }, (_, index) => ({
        id: 500 + index,
        username: `user_${index + 1}`,
        displayName: (['张三', '李四', '王五', '赵六', '钱七'][index % 5] || '用户') + (index > 4 ? index : ''),
        rolesText: ['运营管理员', '财务', '运维', '普通用户'][index % 4],
        department: ['运营中心', '研发中心', '财务部', '市场部'][index % 4],
        status: index % 7 === 0 ? '已停用' : '已启用',
        enabled: index % 7 !== 0,
        lastLoginAt: `2026-09-${String(22 - index % 10).padStart(2, '0')}T09:10:00+08:00`,
        createdAt: '2026-06-01T08:00:00+08:00',
      })),
    ],
  },
  roles: {
    title: '角色权限',
    kicker: '系统设置 · 访问控制',
    description: '维护角色、菜单权限、操作权限和数据范围，并查看角色成员数量。',
    entityLabel: '角色',
    endpoint: '/users/roles',
    permissionsPath: '/users/roles/{id}/permissions',
    columns: [
      { key: 'name', label: '角色', type: 'subtext' },
      { key: 'code', label: '角色编码' },
      { key: 'description', label: '说明' },
      { key: 'userCount', label: '用户数', type: 'number', align: 'right' },
      { key: 'permissionCount', label: '权限数', type: 'number', align: 'right' },
      { key: 'sortOrder', label: '排序', type: 'number', align: 'right' },
      { key: 'status', label: '状态', type: 'boolean' },
    ],
    fields: [
      { key: 'name', label: '角色名称', required: true },
      { key: 'code', label: '角色编码', required: true, disabled: true },
      { key: 'description', label: '角色说明', type: 'textarea' },
      { key: 'sortOrder', label: '排序序号', type: 'number' },
    ],
    filters: [{ key: 'keyword', label: '关键词', type: 'text' }],
    metrics: [
      { label: '角色总数', key: 'total', format: 'count', hint: '全部后台角色' },
      { label: '已启用', key: 'enabled', format: 'count', hint: '可分配角色' },
      { label: '权限节点', key: 'permissions', format: 'number', hint: '已配置权限数' },
      { label: '关联用户', key: 'users', format: 'number', hint: '角色成员总数' },
    ],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    toggleKey: 'enabled',
    statusKey: 'enabled',
    detailTitleKey: 'name',
    mockRows: [
      { id: 1, code: 'super_admin', name: '超级管理员', description: '拥有全部菜单和操作权限', userCount: 1, permissionCount: 86, sortOrder: 1, enabled: true },
      { id: 2, code: 'operator', name: '运营管理员', description: '负责广告资源、策略、报表和对账', userCount: 6, permissionCount: 62, sortOrder: 2, enabled: true },
      { id: 3, code: 'finance', name: '财务', description: '负责结算账单和对账', userCount: 3, permissionCount: 24, sortOrder: 3, enabled: true },
      { id: 4, code: 'ops', name: '运维', description: '负责运行状态与运行时配置', userCount: 2, permissionCount: 31, sortOrder: 4, enabled: true },
      { id: 5, code: 'auditor', name: '审计员', description: '只读访问报表与配置历史', userCount: 2, permissionCount: 18, sortOrder: 5, enabled: true },
    ],
  },
  'client-sdks': {
    title: 'Client SDK',
    kicker: '系统设置 · 客户端接入',
    description: '维护客户端 SDK 类型、平台、版本、接入参数和启用状态。',
    entityLabel: 'SDK 字典项',
    endpoint: '/business/client-sdks',
    columns: [
      { key: 'sdkType', label: 'SDK 类型', type: 'subtext' },
      { key: 'platform', label: '平台', type: 'status' },
      { key: 'version', label: '版本' },
      { key: 'minVersion', label: '最低版本' },
      { key: 'downloadUrl', label: '下载地址' },
      { key: 'enabled', label: '状态', type: 'boolean' },
    ],
    fields: [
      { key: 'sdkType', label: 'SDK 类型', required: true, placeholder: 'android_sdk' },
      { key: 'platform', label: '平台', type: 'select', options: [{ label: 'Android', value: 'ANDROID' }, { label: 'iOS', value: 'IOS' }, { label: 'Windows', value: 'WINDOWS' }, { label: 'Web', value: 'WEB' }] },
      { key: 'version', label: '当前版本', required: true },
      { key: 'minVersion', label: '最低版本' },
      { key: 'downloadUrl', label: '下载地址' },
      { key: 'description', label: '说明', type: 'textarea' },
      { key: 'enabled', label: '启用', type: 'switch' },
    ],
    filters: [
      { key: 'keyword', label: '关键词', type: 'text' },
      { key: 'platform', label: '平台', type: 'select', options: [{ label: 'Android', value: 'ANDROID' }, { label: 'iOS', value: 'IOS' }, { label: 'Windows', value: 'WINDOWS' }] },
      { key: 'enabled', label: '状态', type: 'select', options: [{ label: '已启用', value: '1' }, { label: '已停用', value: '0' }] },
    ],
    metrics: [
      { label: 'SDK 字典项', key: 'total', format: 'count', hint: '全部客户端 SDK' },
      { label: '已启用', key: 'enabled', format: 'count', hint: '可下载版本' },
      { label: '平台数', key: 'platforms', format: 'count', hint: '覆盖客户端平台' },
      { label: '最新版本', key: 'latest', format: 'count', hint: '当前最高版本' },
    ],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    toggleKey: 'enabled',
    statusKey: 'enabled',
    detailTitleKey: 'sdkType',
    mockRows: Array.from({ length: 8 }, (_, index) => ({
      id: 600 + index,
      sdkType: ['android_sdk', 'ios_sdk', 'windows_sdk', 'quick_app_sdk'][index % 4],
      platform: ['ANDROID', 'IOS', 'WINDOWS', 'WEB'][index % 4],
      version: `2.${18 + index}.0`,
      minVersion: `2.${10 + index}.0`,
      downloadUrl: `https://cdn.example.com/sdk/${index + 1}.zip`,
      description: 'ADX 客户端接入 SDK',
      enabled: index % 5 !== 0,
    })),
  },
}
