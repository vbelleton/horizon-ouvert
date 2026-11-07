<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Journal · Horizon Ouvert' })

const { load: loadProfile } = useProfile()
const { domains, load: loadDomains } = useDomains()
const { entries, error, load, remove } = useJournal()
const { version } = useDataVersion()
const quickAdd = useState<null | 'menu' | 'checkin' | 'contact' | 'note'>('quickadd', () => null)
const actionError = ref<string | null>(null)

const domainLabel = (id: string | null) => domains.value.find((d) => d.id === id)?.label ?? null

async function drop(id: string) {
  if (!confirm('Supprimer cette note ?')) return
  actionError.value = await remove(id)
}

onMounted(async () => {
  await loadProfile()
  await Promise.all([loadDomains(), load()])
})
watch(version, load)
</script>

<template>
  <main class="page">
    <header class="head">
      <h1>Journal</h1>
      <button type="button" class="button small" @click="quickAdd = 'note'">Écrire</button>
    </header>

    <p v-if="error" class="card error" role="alert">Impossible de charger ton journal : {{ error }}</p>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
    <p v-else-if="!entries.length" class="card muted">
      Ici, ce que tu veux garder : une question qui te travaille, une prière, une décision, une gratitude.
    </p>

    <ul class="list">
      <li v-for="e in entries" :key="e.id" class="card">
        <p class="meta muted">
          {{ formatDay(e.day) }}<template v-if="domainLabel(e.domain_id)"> · {{ domainLabel(e.domain_id) }}</template>
        </p>
        <p class="body">{{ e.body }}</p>
        <button type="button" class="ghost" :aria-label="`Supprimer la note du ${formatDay(e.day)}`" @click="drop(e.id)">Supprimer</button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.head h1 { margin: 0; }
.small { min-height: 44px; padding: 0 16px; font-size: 0.95rem; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.meta { margin: 0 0 4px; font-size: 0.85rem; }
.body { margin: 0 0 4px; white-space: pre-wrap; }
.ghost { min-height: 44px; padding: 0; border: 0; background: none; color: var(--ink-soft); font: inherit; font-size: 0.85rem; cursor: pointer; }
.error { color: var(--attention); }
</style>
