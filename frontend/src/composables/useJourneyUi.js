import { onBeforeUnmount, ref } from 'vue'
import '../styles/dream-journey.css'

export function useJourneyUi() {
  const toast = ref('')
  let timer
  function notify(text) { toast.value = text; clearTimeout(timer); timer = setTimeout(() => toast.value = '', 4000) }
  async function save(commit, key, value, message) {
    try { await commit(key, value); if (message) notify(message); return true }
    catch (error) { notify(error.message || '账号记录未能保存，请保留内容后重试。'); return false }
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); notify('文字已复制') }
    catch { notify('浏览器未允许复制，请选中文字后手动复制。') }
  }
  onBeforeUnmount(() => clearTimeout(timer))
  return { toast, notify, save, copy }
}
