<script setup lang="ts">
// L'historique du pouls d'un domaine, sur les revues terminées : des points
// sur une échelle de 1 à 5, reliés. Une tendance, pas un tableau de bord.
const props = defineProps<{ points: Array<{ week_start: string; score: number | null }>; color: string; label: string }>()

const W = 300, H = 90, padX = 14, padY = 12
const scored = computed(() => props.points.filter((p) => p.score !== null) as Array<{ week_start: string; score: number }>)
const xy = computed(() => {
  const n = scored.value.length
  return scored.value.map((p, i) => ({
    x: n === 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1),
    y: padY + ((5 - p.score) * (H - 2 * padY)) / 4,
    score: p.score,
    week: p.week_start,
  }))
})
const path = computed(() => xy.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '))
</script>

<template>
  <svg v-if="xy.length" :viewBox="`0 0 ${W} ${H}`" class="trail" role="img" :aria-label="`Pouls de ${label} sur ${xy.length} semaines`">
    <line v-for="n in 5" :key="n" :x1="padX" :x2="W - padX" :y1="padY + ((5 - n) * (H - 2 * padY)) / 4" :y2="padY + ((5 - n) * (H - 2 * padY)) / 4" class="grid" />
    <path v-if="xy.length > 1" :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" />
    <circle v-for="p in xy" :key="p.week" :cx="p.x" :cy="p.y" r="4.5" :fill="color"><title>{{ formatDay(p.week) }} : {{ p.score }} sur 5</title></circle>
  </svg>
  <p v-else class="muted">Le pouls apparaîtra après ta première revue.</p>
</template>

<style scoped>
.trail { width: 100%; max-width: 420px; display: block; }
.grid { stroke: var(--line); stroke-dasharray: 2 4; }
</style>
