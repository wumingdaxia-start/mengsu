import { onBeforeUpdate, onUpdated, ref } from 'vue'
import { useRoute } from 'vue-router'

// Preserve the reading position when a psychology page replaces its content.
// Route changes still use the router's normal navigation scroll behavior.
export function useStablePageScroll() {
  const page = ref(null)
  const route = useRoute()
  let path = route.path
  let positions = null
  onBeforeUpdate(() => {
    const element = page.value
    positions = null
    if (!element) return
    if (path !== route.path) {
      path = route.path
      element.style.minHeight = ''
      return
    }
    positions = []
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      positions.push([parent, parent.scrollLeft, parent.scrollTop])
    }
    positions.push([window, window.scrollX, window.scrollY])
    element.style.overflowAnchor = 'none'
    element.style.minHeight = Math.max(element.getBoundingClientRect().height, parseFloat(element.style.minHeight) || 0) + 'px'
  })
  onUpdated(() => {
    if (!positions) return
    for (const [target, left, top] of positions) {
      if (target === window) window.scrollTo({ left, top, behavior: 'instant' })
      else { target.scrollLeft = left; target.scrollTop = top }
    }
    positions = null
  })
  return page
}