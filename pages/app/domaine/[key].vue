<script setup lang="ts">
import type { CommitmentKind, CommitmentRow, CommitmentStatus } from '~/types/database'

definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const { profile, today, load: loadProfile } = useProfile()
const { domains, load: loadDomains } = useDomains()
const { history, load: loadPulse } = usePulse()
const { version } = useDataVersion()

const domain = computed(() => domains.value.find((d) => d.key === route.params.key))
const detail = useDomainDetail(computed(() => domain.value?.id))
useHead(() => ({ title: `${domain.value?.label ?? 'Domaine'} · Horizon Ouvert` }))

const trail = computed(() => (domain.value ? history(domain.value.id) : []))
const words = computed(() => trail.value.filter((p) => p.word).slice(-3).reverse())
const isFocus = computed(() => !!domain.value && !!profile.value?.focus_domains.includes(domain.value.key))
const active = computed(() => detail.commitments.value.filter((c) => c.status === 'actif'))
const others = computed(() => detail.commitments.value.filter((c) => c.status !== 'actif'))
const overLimit = computed(() => active.value.length > (profile.value?.max_active_commitments ?? 7))

const adding = ref(false)
const form = reactive({ title: '', kind: 'responsabilite' as CommitmentKind, next_step: '' })
const actionError = ref<string | null>(null)
const values = reactive<Record<string, string>>({})
const measured = ref<string | null>(null)

async function submit() {
  if (!form.title.trim()) return
  actionError.value = await detail.addCommitment(form)
  if (!actionError.value) {
    Object.assign(form, { title: '', kind: 'responsabilite', next_step: '' })
    adding.value = false
  }
}
async function saveStep(c: CommitmentRow, event: Event) {
  const next = (event.target as HTMLInputElement).value.trim() || null
  if (next === (c.next_step ?? null)) return
  actionError.value = await detail.updateCommitment(c.id, { next_step: next })
}
async function setStatus(c: CommitmentRow, status: CommitmentStatus) {
  actionError.value = await detail.updateCommitment(c.id, { status })
}
async function drop(c: CommitmentRow) {
  if (!confirm(`Supprimer « ${c.title} » ? Pour garder une trace, préfère « Laissé de côté ».`)) return
  actionError.value = await detail.removeCommitment(c.id)
}
async function record(id: string) {
  const raw = (values[id] ?? '').replace(',', '.').trim()
  const n = Number(raw)
  if (!raw || Number.isNaN(n)) return
  actionError.value = await detail.measure(id, n)
  if (!actionError.value) {
    values[id] = ''
    measured.value = id
    setTimeout(() => { if (measured.value === id) measured.value = null }, 2500)
  }
}
const targetText = (t: number | null, u: string | null) => (t === null ? null : `cible ${fmt(t)}${u ? ` ${u}` : ''}`)

async function reload() {
  await loadProfile()
  await Promise.all([loadDomains(), loadPulse()])
  await detail.load()
}
onMounted(reload)
watch(version, reload)
watch(() => domain.value?.id, () => detail.load())
</script>

<template>
  <main v-if="domain" class="page" :style="{ '--domain': domain.color }">
    <NuxtLink to="/app" class="back muted">← Horizon</NuxtLink>
    <header>
      <h1><span class="dot" aria-hidden="true" />{{ domain.label }}</h1>
      <p v-if="isFocus" class="muted">Un de tes domaines prioritaires en ce moment.</p>
    </header>

    <p v-if="detail.error.value" class="card error" role="alert">Impossible de charger ce domaine : {{ detail.error.value }}</p>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>

    <section class="card">
      <h2>Pouls</h2>
      <PulseTrail :points="trail" :color="domain.color" :label="domain.label" />
      <ul v-if="words.length" class="words">
        <li v-for="w in words" :key="w.week_start"><span class="muted">{{ formatDay(w.week_start) }}</span> · {{ w.word }}</li>
      </ul>
    </section>

    <section v-if="detail.indicators.value.length" aria-labelledby="ind">
      <h2 id="ind">Ce que tu suis</h2>
      <ul class="list">
        <li v-for="i in detail.indicators.value" :key="i.id" class="card ind">
          <div class="row">
            <strong>{{ i.label }}</strong>
            <span class="muted small">{{ [i.unit, targetText(i.target, i.unit)].filter(Boolean).join(' · ') }}</span>
          </div>
          <p class="muted small">
            <template v-if="detail.latest.value[i.id]">Dernière mesure : <strong>{{ fmt(detail.latest.value[i.id]!.value) }}</strong> le {{ formatDay(detail.latest.value[i.id]!.day) }}</template>
            <template v-else>Pas encore de mesure.</template>
          </p>
          <form v-if="i.source === 'manual'" class="inline" @submit.prevent="record(i.id)">
            <label class="sr" :for="`m-${i.id}`">Nouvelle mesure pour {{ i.label }} ({{ formatDay(today) }})</label>
            <input :id="`m-${i.id}`" v-model="values[i.id]" type="text" inputmode="decimal" placeholder="Valeur d’aujourd’hui">
            <button class="button small" type="submit" :disabled="!values[i.id]">{{ measured === i.id ? '✓ Noté' : 'Noter' }}</button>
          </form>
        </li>
      </ul>
    </section>

    <section aria-labelledby="eng">
      <div class="row head">
        <h2 id="eng">Engagements</h2>
        <button type="button" class="button small" @click="adding = !adding">{{ adding ? 'Annuler' : 'Ajouter' }}</button>
      </div>

      <p v-if="overLimit" class="card warn">
        {{ active.length }} engagements actifs pour un plafond de {{ profile?.max_active_commitments }} : lequel peux-tu confier, reporter ou laisser de côté ?
      </p>

      <form v-if="adding" class="card form" @submit.prevent="submit">
        <label>
          <span class="label">Quoi ?</span>
          <input v-model="form.title" type="text" required maxlength="120" placeholder="Ex. Conseil de l’église, projet associatif…">
        </label>
        <label>
          <span class="label">Nature</span>
          <select v-model="form.kind">
            <option v-for="k in COMMITMENT_KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
        </label>
        <label>
          <span class="label">Prochaine étape (facultatif)</span>
          <input v-model="form.next_step" type="text" maxlength="160">
        </label>
        <button class="button" type="submit" :disabled="!form.title.trim()">Ajouter</button>
      </form>

      <p v-if="!detail.commitments.value.length && !adding" class="card muted">
        Ce que tu portes dans ce domaine : travail, église, bénévolat, projets. Chacun avec sa prochaine étape.
      </p>

      <ul class="list">
        <li v-for="c in active" :key="c.id" class="card commit" :class="{ nostep: !c.next_step }">
          <div class="row">
            <strong>{{ c.title }}</strong>
            <span class="muted small">{{ COMMITMENT_KINDS.find((k) => k.value === c.kind)?.label }}</span>
          </div>
          <label class="step">
            <span class="label small">Prochaine étape</span>
            <input :value="c.next_step ?? ''" type="text" maxlength="160" placeholder="Quelle est la prochaine chose juste ?" @blur="saveStep(c, $event)">
          </label>
          <div class="row tools">
            <select :value="c.status" :aria-label="`État de ${c.title}`" @change="setStatus(c, ($event.target as HTMLSelectElement).value as CommitmentStatus)">
              <option v-for="s in COMMITMENT_STATUS" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <button type="button" class="ghost" :aria-label="`Supprimer ${c.title}`" @click="drop(c)">Supprimer</button>
          </div>
        </li>
      </ul>

      <details v-if="others.length" class="others">
        <summary class="muted">{{ others.length }} en pause, terminé ou laissé de côté</summary>
        <ul class="list">
          <li v-for="c in others" :key="c.id" class="card commit">
            <div class="row"><strong>{{ c.title }}</strong></div>
            <div class="row tools">
              <select :value="c.status" :aria-label="`État de ${c.title}`" @change="setStatus(c, ($event.target as HTMLSelectElement).value as CommitmentStatus)">
                <option v-for="s in COMMITMENT_STATUS" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
              <button type="button" class="ghost" :aria-label="`Supprimer ${c.title}`" @click="drop(c)">Supprimer</button>
            </div>
          </li>
        </ul>
      </details>
    </section>
  </main>
  <main v-else class="page">
    <NuxtLink to="/app" class="back muted">← Horizon</NuxtLink>
    <p class="muted">{{ domains.length ? 'Ce domaine n’existe pas.' : 'Chargement…' }}</p>
  </main>
</template>

<style scoped>
.back { display: inline-flex; align-items: center; min-height: 44px; text-decoration: none; }
header { margin-bottom: 16px; }
h1 { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.dot { width: 14px; height: 14px; border-radius: 50%; background: var(--domain); }
section { margin-bottom: 28px; }
.card.warn { border-left: 4px solid var(--attention); margin-bottom: 12px; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.head { align-items: center; margin-bottom: 8px; }
.head h2 { margin: 0; }
.small { font-size: 0.85rem; margin: 0; }
.words { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.ind p { margin: 4px 0 8px; }
.inline { display: flex; gap: 8px; }
.inline input { flex: 1; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.form { display: grid; gap: 12px; margin-bottom: 12px; }
.label { display: block; font-weight: 600; margin-bottom: 6px; }
.label.small { font-weight: 500; }
input[type='text'], select {
  width: 100%; min-height: 48px; padding: 0 12px; border: 1px solid var(--line);
  border-radius: 12px; background: var(--surface); color: var(--ink); font: inherit;
}
.button.small { min-height: 44px; padding: 0 16px; font-size: 0.95rem; }
.commit { display: grid; gap: 8px; }
.commit.nostep { border-left: 4px solid var(--attention); }
.tools { align-items: center; }
.tools select { width: auto; min-width: 150px; }
.ghost { min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--ink-soft); font: inherit; font-size: 0.85rem; cursor: pointer; }
.others { margin-top: 12px; }
.others summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; }
.error { color: var(--attention); }
</style>
