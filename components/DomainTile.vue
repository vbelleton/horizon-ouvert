<script setup lang="ts">
import type { DomainRow } from '~/types/database'

defineProps<{ domain: DomainRow; focus?: boolean; score?: number }>()
</script>

<template>
  <div class="tile" :style="{ '--domain': domain.color }">
    <span class="dot" aria-hidden="true" />
    <span class="label">{{ domain.label }}</span>
    <span v-if="focus" class="focus">priorité</span>
    <span class="state muted">{{ score ? `${score} / 5` : 'pas encore de pouls' }}</span>
  </div>
</template>

<style scoped>
.tile {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 4px 10px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 4px solid var(--domain);
  border-radius: 14px;
  min-height: 64px;
}
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--domain); }
.label { font-weight: 600; }
.focus {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}
.state { grid-column: 2 / -1; font-size: 0.85rem; }
</style>
