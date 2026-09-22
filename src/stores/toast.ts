import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', {
  state: () => ({
    message: '',
    visible: false,
    timer: 0,
  }),
  actions: {
    show(message: string) {
      this.message = message
      this.visible = true
      window.clearTimeout(this.timer)
      this.timer = window.setTimeout(() => { this.visible = false }, 1800)
    },
  },
})
