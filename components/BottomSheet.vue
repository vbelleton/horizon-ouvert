<script setup lang="ts">
// Feuille glissante. Échap, clic sur le fond ou « Fermer » la ferment ;
// le focus entre dans la feuille et revient où il était à la fermeture.
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
let opener: Element | null = null

onMounted(() => {
  opener = document.activeElement
  document.body.style.overflow = 'hidden'
  nextTick(() => panel.value?.focus())
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  if (opener instanceof HTMLElement) opener.focus()
})
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')" @keydown="onKey">
      <section ref="panel" class="sheet" role="dialog" aria-modal="true" :aria-label="props.title" tabindex="-1">
        <header>
          <h2>{{ title }}</h2>
          <button type="button" class="close" @click="emit('close')">Fermer</button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(10, 14, 18, 0.45);
}
.sheet {
  width: 100%;
  max-width: 560px;
  max-height: 92dvh;
  overflow-y: auto;
  background: var(--bg);
  border-radius: 24px 24px 0 0;
  padding: 16px var(--gutter) calc(24px + env(safe-area-inset-bottom));
  outline: none;
}
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
h2 { margin: 0; font-size: 1.2rem; }
.close { background: none; border: 0; color: var(--ink-soft); font: inherit; min-height: 44px; padding: 0 4px; cursor: pointer; }
@media (min-width: 640px) {
  .backdrop { align-items: center; }
  .sheet { border-radius: 24px; }
}
</style>
