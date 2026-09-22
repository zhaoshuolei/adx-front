import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/overview',
    children: [
      {
        path: 'overview',
        name: 'overview',
        component: () => import('@/views/OverviewView.vue'),
        meta: { title: '投放总览', module: '经营中心', phase: 'P0' },
      },
      {
        path: 'runtime',
        name: 'runtime',
        component: () => import('@/views/RuntimeView.vue'),
        meta: { title: '实时信号', module: '经营中心', phase: 'P0' },
      },
      {
        path: 'reconciliation',
        name: 'reconciliation',
        component: () => import('@/views/ReconciliationView.vue'),
        meta: { title: '三方对账', module: '数据报表', phase: 'P0' },
      },
      {
        path: 'ad-spaces',
        name: 'ad-spaces',
        component: () => import('@/views/AdSpacesView.vue'),
        meta: { title: '广告位管理', module: '广告运营', phase: 'P0' },
      },
      {
        path: 'media',
        name: 'media',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: '媒体与公司',
          module: '广告运营',
          phase: 'P0',
          purpose: '维护媒体公司和媒体应用，并查看广告位与投放状态。',
          endpoints: ['GET /api/business/media', 'POST /api/business/media', 'GET /api/business/media/companies', 'POST /api/business/media/companies'],
        },
      },
      {
        path: 'ad-sources',
        name: 'ad-sources',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: 'DSP 广告源',
          module: '广告运营',
          phase: 'P0',
          purpose: '维护 DSP 广告源、预算、eCPM、限量与广告位绑定关系。',
          endpoints: ['GET /api/business/ad-sources', 'POST /api/business/ad-sources', 'POST /api/business/ad-sources/{id}/bind-ad-spaces', 'POST /api/business/ad-sources/{id}/unbind-ad-spaces'],
        },
      },
      {
        path: 'strategies',
        name: 'strategies',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: '策略管理',
          module: '广告运营',
          phase: 'P0',
          purpose: '创建分组策略方案，管理分组和成员，并发布到引擎。',
          endpoints: ['GET /api/business/strategy', 'POST /api/business/strategy/{id}/groups', 'PUT /api/business/strategy/{id}/groups/{groupId}', 'POST /api/business/strategy/{id}/publish'],
        },
      },
      {
        path: 'dsp',
        name: 'dsp',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: 'DSP 配置',
          module: '广告运营',
          phase: 'P0',
          purpose: '配置 DSP 渠道，检查接口健康并执行密钥轮换。',
          endpoints: ['GET /api/business/dsp', 'GET /api/business/dsp/{id}/health', 'POST /api/business/dsp/{id}/rotate-key'],
        },
      },
      {
        path: 'billing/dsp',
        name: 'dsp-billing',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: 'DSP 账单',
          module: '财务结算',
          phase: 'P0',
          purpose: '上传 DSP 结算账单并查看导入批次、校验结果和差异。',
          endpoints: ['GET /api/business/settlement/dsp-bills', 'POST /api/business/settlement/dsp-bills/import'],
        },
      },
      {
        path: 'system/users',
        name: 'users',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: '用户管理',
          module: '系统设置',
          phase: 'P0',
          purpose: '维护后台用户、状态、角色分配和密码重置。',
          endpoints: ['GET /api/users', 'POST /api/users', 'PUT /api/users/{id}', 'PUT /api/users/{id}/password'],
        },
      },
      {
        path: 'system/roles',
        name: 'roles',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: '角色权限',
          module: '系统设置',
          phase: 'P0',
          purpose: '维护角色及其菜单、操作和数据权限。',
          endpoints: ['GET /api/users/roles', 'POST /api/users/roles', 'PUT /api/users/roles/{roleId}'],
        },
      },
      {
        path: 'system/runtime-config',
        name: 'runtime-config',
        component: () => import('@/views/ModulePlaceholderView.vue'),
        meta: {
          title: '运行时配置',
          module: '系统设置',
          phase: 'P0',
          purpose: '管理引擎参数、协议密钥、审计记录和历史回滚。',
          endpoints: ['GET /api/business/engine-config', 'PUT /api/business/engine-config/{configKey}', 'GET /api/business/engine-config/{configKey}/history'],
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'overview' }
  return true
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title || 'ADX 管理台')} · ADX`
})

export default router
