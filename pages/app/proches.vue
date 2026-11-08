<script setup lang="ts">
import type { Circle, PersonRow } from '~/types/database'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Proches · Horizon Ouvert' })

const { today, load: loadProfile } = useProfile()
const { people, sorted, error, load, add, remove, logContact } = usePeople()
const { version } = useDataVersion()

const adding = ref(false)
const form = reactive({ name: '', circle: 'proche' as Circle, cadence: 14 })
const formError = ref<string | null>(null)
const saving = ref(false)
const justNoted = ref<string | null>(null)
const detailFor = ref<string | null>(null)
const actionError = ref<string | null>(null)

const dueIds = computed(() => new Set(sorted.value.filter((p) => isDue(p, today.value)).map((p) => p.id)))

function lastSeen(p: PersonRow): string {
  const d = daysSince(p.last_contact_on, today.value)
  return d === null ? 'Jamais noté' : `Dernières nouvelles ${relativeDays(d)}`
}

async function submit() {
  if (!form.name.trim()) return
  saving.value = true
  formError.value = await add({ name: form.name, circle: form.circle, cadence_days: form.cadence })
  saving.value = false
  if (!formError.value) {
    form.name = ''
    adding.value = false
  }
}

async function quickContact(p: PersonRow) {
  actionError.value = await logContact(p.id)
  if (!actionError.value) {
    justNoted.value = p.id
    setTimeout(() => { if (justNoted.value === p.id) justNoted.value = null }, 2500)
  }
}

async function removePerson(p: PersonRow) {
  if (!confirm(`Retirer ${p.name} de tes proches ? Ses contacts notés seront supprimés.`)) return
  actionError.value = await remove(p.id)
}

async function reload() {
  await loadProfile()
  await load()
}
onMounted(reload)
watch(version, load)
</script>

<template>
  <main class="page">
    <header class="head">
      <h1>Tes proches</h1>
      <button type="button" class="button small" @click="adding = !adding">{{ adding ? 'Annuler' : 'Ajouter' }}</button>
    </header>

    <form v-if="adding" class="card form" @submit.prevent="submit">
      <label>
        <span class="label">Prénom</span>
        <input v-model="form.name" type="text" required maxlength="60" autocomplete="off">
      </label>
      <label>
        <span class="label">Cercle</span>
        <select v-model="form.circle">
          <option v-for="c in CIRCLES" :key="c.value" :value="c.value">{{ c.label }} · {{ c.hint }}</option>
        </select>
      </label>
      <label>
        <span class="label">Prendre des nouvelles</span>
        <select v-model.number="form.cadence">
          <option v-for="c in CADENCES" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </label>
      <p v-if="formError" class="error" role="alert">{{ formError }}</p>
      <button class="button" type="submit" :disabled="saving || !form.name.trim()">{{ saving ? 'Ajout…' : 'Ajouter à mes proches' }}</button>
    </form>

    <p v-if="error" class="card error" role="alert">Impossible de charger tes proches : {{ error }}</p>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>

    <p v-else-if="!people.length && !adding" class="card muted">
      Qui ne veux-tu pas perdre de vue ? Ajoute 3 à 5 personnes : Horizon te dira quand leur donner des nouvelles.
    </p>

    <ul v-if="people.length" class="list">
      <li v-for="p in sorted" :key="p.id" class="card person" :class="{ due: dueIds.has(p.id) }">
        <div class="who">
          <strong>{{ p.name }}</strong>
          <span class="circle muted">{{ CIRCLES.find((c) => c.value === p.circle)?.label }}</span>
        </div>
        <p class="muted seen">
          {{ lastSeen(p) }}<template v-if="dueIds.has(p.id)"> · à recontacter</template>
        </p>
        <button type="button" class="button primary" @click="quickContact(p)">
          {{ justNoted === p.id ? '✓ Noté' : 'J’ai pris des nouvelles' }}
        </button>
        <div class="more">
          <button type="button" class="ghost" @click="detailFor = p.id">Préciser un contact</button>
          <button type="button" class="ghost" :aria-label="`Retirer ${p.name}`" @click="removePerson(p)">Retirer</button>
        </div>
      </li>
    </ul>

    <ContactSheet v-if="detailFor" :person-id="detailFor" @close="detailFor = null" />
  </main>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.head h1 { margin: 0; }
.small { min-height: 44px; padding: 0 16px; font-size: 0.95rem; }
.form { display: grid; gap: 12px; margin-bottom: 16px; }
.label { display: block; font-weight: 600; margin-bottom: 6px; }
input[type='text'], select {
  width: 100%; min-height: 48px; padding: 0 12px; border: 1px solid var(--line);
  border-radius: 12px; background: var(--surface); color: var(--ink); font: inherit;
}
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.person { display: grid; gap: 6px; }
.person.due { border-left: 4px solid var(--attention); }
.who { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.circle { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.seen { margin: 0; font-size: 0.9rem; }
.primary { width: 100%; margin-top: 4px; }
.more { display: flex; justify-content: space-between; }
.ghost { min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--ink-soft); font: inherit; font-size: 0.9rem; cursor: pointer; }
.error { color: var(--attention); }
</style>
