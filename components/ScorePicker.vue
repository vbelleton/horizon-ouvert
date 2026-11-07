<script setup lang="ts">
// Un ressenti de 1 à 5, au pouce. Aucune couleur « bon / mauvais » :
// on ne juge pas, on situe.
const props = defineProps<{ modelValue: number | null; label: string; low?: string; high?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const name = `score-${useId()}`
function pick(n: number) {
  emit('update:modelValue', props.modelValue === n ? null : n) // un second tap efface
}
</script>

<template>
  <fieldset class="score">
    <legend>{{ label }}</legend>
    <div class="row">
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        class="dot"
        :class="{ on: modelValue !== null && n <= modelValue, exact: modelValue === n }"
        :aria-pressed="modelValue === n"
        :aria-label="`${label} : ${n} sur 5`"
        :name="name"
        @click="pick(n)"
      >
        {{ n }}
      </button>
    </div>
    <div v-if="low || high" class="ends muted" aria-hidden="true">
      <span>{{ low }}</span><span>{{ high }}</span>
    </div>
  </fieldset>
</template>

<style scoped>
.score { border: 0; padding: 0; margin: 0 0 20px; min-width: 0; }
legend { font-weight: 600; margin-bottom: 8px; padding: 0; }
.row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.dot {
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-soft);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.dot.on { background: color-mix(in srgb, var(--accent) 16%, var(--surface)); border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); color: var(--ink); }
.dot.exact { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.dot:focus-visible { outline: 2px solid var(--sun); outline-offset: 2px; }
.ends { display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 4px; }
</style>
