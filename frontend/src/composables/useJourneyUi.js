import { onBeforeUnmount, ref } from 'vue'
import '../styles/dream-journey.css'

export function useJourneyUi() {
  const toast = ref('')
  let timer
  function notify(text) { toast.value = text; clearTimeout(timer); timer = setTimeout(() => toast.value = '', 4000) }
  function save(commit, key, value, message) {
    try { commit(key, value); if (message) notify(message); return true }
    catch { notify('此设备存储空间不足，内容还未保存。请先导出部分快照。'); return false }
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); notify('文字已复制') }
    catch { notify('浏览器未允许复制，请选中文字后手动复制。') }
  }
  onBeforeUnmount(() => clearTimeout(timer))
  return { toast, notify, save, copy }
}
