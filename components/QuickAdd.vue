<script setup lang="ts">
// Le bouton « + » : les trois gestes du quotidien, à un tap.
const open = useState<null | 'menu' | 'checkin' | 'contact' | 'note'>('quickadd', () => null)
const { todays } = useCheckin()
</script>

<template>
  <BottomSheet v-if="open === 'menu'" title="Ajouter" @close="open = null">
    <ul class="actions">
      <li><button type="button" @click="open = 'checkin'"><strong>{{ todays ? 'Modifier le check-in du jour' : 'Check-in du jour' }}</strong><span class="muted">Énergie, paix, sommeil : 30 secondes</span></button></li>
      <li><button type="button" @click="open = 'contact'"><strong>Prendre des nouvelles</strong><span class="muted">Noter un appel, une visite, un message</span></button></li>
      <li><button type="button" @click="open = 'note'"><strong>Une note</strong><span class="muted">Discernement, prière, gratitude</span></button></li>
    </ul>
  </BottomSheet>
  <CheckinSheet v-else-if="open === 'checkin'" @close="open = null" />
  <ContactSheet v-else-if="open === 'contact'" @close="open = null" />
  <NoteSheet v-else-if="open === 'note'" @close="open = null" />
</template>

<style scoped>
.actions { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.actions button {
  width: 100%; display: grid; gap: 2px; text-align: left; padding: 16px; min-height: 64px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  color: var(--ink); font: inherit; cursor: pointer;
}
</style>
