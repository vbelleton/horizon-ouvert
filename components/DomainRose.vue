<script setup lang="ts">
import type { DomainRow } from '~/types/database'

// La « rose des domaines » : un pétale par domaine, de longueur égale au
// pouls (1 à 5). Elle montre un équilibre, jamais une note globale.
// Sans pouls encore saisi, les pétales restent en contour.
const props = defineProps<{
  domains: DomainRow[]
  pulse?: Partial<Record<string, number>>
}>()

const size = 240
const c = size / 2
const rMax = 104
const rMin = 18

const petals = computed(() => {
  const n = props.domains.length || 1
  return props.domains.map((d, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const half = Math.PI / n * 0.78
    const score = props.pulse?.[d.key]
    const r = score ? rMin + ((rMax - rMin) * score) / 5 : rMax
    const p = (a: number, rad: number) => `${(c + rad * Math.cos(a)).toFixed(1)} ${(c + rad * Math.sin(a)).toFixed(1)}`
    const path = `M ${p(angle - half, rMin)} L ${p(angle - half, r)} A ${r} ${r} 0 0 1 ${p(angle + half, r)} L ${p(angle + half, rMin)} A ${rMin} ${rMin} 0 0 0 ${p(angle - half, rMin)} Z`
    return { key: d.key, label: d.label, color: d.color, path, filled: score !== undefined }
  })
})
</script>

<template>
  <svg :viewBox="`0 0 ${size} ${size}`" class="rose" role="img" :aria-label="`Rose des ${domains.length} domaines`">
    <circle :cx="c" :cy="c" :r="rMax" class="ring" />
    <path
      v-for="petal in petals"
      :key="petal.key"
      :d="petal.path"
      :fill="petal.filled ? petal.color : 'none'"
      :fill-opacity="petal.filled ? 0.75 : 0"
      :stroke="petal.color"
      stroke-width="1.5"
    >
      <title>{{ petal.label }}</title>
    </path>
  </svg>
</template>

<style scoped>
.rose { width: 100%; max-width: 240px; display: block; margin: 0 auto; }
.ring { fill: none; stroke: var(--line); stroke-dasharray: 3 5; }
</style>
