<script setup lang="ts">
import type { DomainKey } from '~/types/database'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Revue de la semaine · Horizon Ouvert' })

const route = useRoute()
const { $supabase } = useNuxtApp()
const { profile, today, load: loadProfile, update: updateProfile } = useProfile()
const { domains, signals, load: loadDomains } = useDomains()
const { recent, load: loadCheckins } = useCheckin()
const { reviews, load: loadPulse } = usePulse()

const week = ref('')
const review = useReview(week)
const step = ref(1)
const previousFocus = ref<string | null>(null)
const focus = ref<DomainKey[]>([])
const finishing = ref(false)
const finishError = ref<string | null>(null)
const done = ref(false)

const STEPS = ['La semaine', 'Gratitude', 'Pouls', 'Discerner', 'Le cap']
const summary = computed(() => weekSummary(recent.value, week.value))
const weekLabel = computed(() => (week.value ? `semaine du ${formatDay(week.value)}` : ''))

onMounted(async () => {
  await loadProfile()
  await Promise.all([loadDomains(), loadCheckins(), loadPulse()])
  const thisWeek = weekStart(today.value, profile.value?.week_starts_on ?? 1)
  const asked = typeof route.query.semaine === 'string' ? route.query.semaine : ''
  week.value = asked || weekToReview(today.value, thisWeek, reviews.value.map((r) => r.week_start))
  await review.load()
  focus.value = [...(profile.value?.focus_domains ?? [])]
  // Le cap posé la semaine d'avant : on le relit avant de regarder celle-ci.
  const prev = await $supabase.from('review').select('focus_next').eq('week_start', addDays(week.value, -7)).maybeSingle()
  previousFocus.value = (prev.data as { focus_next: string | null } | null)?.focus_next ?? null
})

function pulseFor(id: string) {
  if (!review.pulse[id]) review.pulse[id] = { score: null, word: '', hours: null }
  return review.pulse[id]!
}
function setScore(id: string, value: number | null) {
  pulseFor(id).score = value
  void review.savePulse(id)
}
function toggleFocus(key: DomainKey) {
  focus.value = focus.value.includes(key) ? focus.value.filter((k) => k !== key) : [...focus.value, key].slice(-3)
}
function setYesNo(field: 'family_time' | 'rest_day', value: boolean) {
  review.fields[field] = review.fields[field] === value ? null : value
}
function go(n: number) {
  step.value = Math.min(STEPS.length, Math.max(1, n))
  if (import.meta.client) window.scrollTo({ top: 0 })
}

async function finish() {
  finishing.value = true
  finishError.value = (await review.complete()) ?? (await updateProfile({ focus_domains: focus.value }))
  finishing.value = false
  if (!finishError.value) {
    await loadPulse()
    done.value = true
  }
}
</script>

<template>
  <main class="page">
    <div v-if="done" class="end">
      <h1>Revue terminée</h1>
      <p class="muted">Ton horizon est à jour. Rien à rattraper, rien à prouver : la semaine peut commencer.</p>
      <NuxtLink to="/app" class="button">Retour à l’horizon</NuxtLink>
    </div>

    <template v-else>
      <header>
        <p class="muted small">Revue · {{ weekLabel }}</p>
        <h1>{{ STEPS[step - 1] }}</h1>
        <ol class="steps" aria-label="Étapes">
          <li v-for="(s, i) in STEPS" :key="s" :class="{ on: i + 1 === step, past: i + 1 < step }" :aria-current="i + 1 === step ? 'step' : undefined">
            <button type="button" :aria-label="`Étape ${i + 1} : ${s}`" @click="go(i + 1)" />
          </li>
        </ol>
      </header>

      <p v-if="review.error.value" class="card error" role="alert">{{ review.error.value }}</p>
      <p v-else-if="!review.loaded.value" class="muted">Chargement…</p>

      <template v-else>
        <!-- 1. Regarder la semaine -->
        <section v-if="step === 1">
          <p v-if="previousFocus" class="card focus">
            <span class="muted small">Le cap que tu t’étais donné</span>
            <span>{{ previousFocus }}</span>
          </p>
          <div class="card">
            <h2>Tes check-ins</h2>
            <p v-if="!summary.count" class="muted">Aucun check-in cette semaine, et ce n’est pas grave : le pouls des domaines suffit.</p>
            <dl v-else class="facts">
              <div><dt>Check-ins</dt><dd>{{ summary.count }} sur 7</dd></div>
              <div><dt>Énergie</dt><dd>{{ fmt(summary.energy) }} / 5</dd></div>
              <div><dt>Paix</dt><dd>{{ fmt(summary.peace) }} / 5</dd></div>
              <div><dt>Sommeil</dt><dd>{{ summary.sleep === null ? '–' : `${fmt(summary.sleep)} h` }}</dd></div>
            </dl>
          </div>
          <div v-if="signals.length" class="card">
            <h2>À regarder</h2>
            <ul class="plain">
              <li v-for="s in signals" :key="s.rule + (s.domain_key ?? '')">{{ s.message }}</li>
            </ul>
          </div>
          <label class="field">
            <span class="label">Ce qui a marqué la semaine</span>
            <textarea v-model="review.fields.highlights" rows="4" placeholder="Un moment, une rencontre, une difficulté…" />
          </label>
        </section>

        <!-- 2. Rendre grâce -->
        <section v-else-if="step === 2">
          <label class="field">
            <span class="label">Pour quoi rends-tu grâce cette semaine ?</span>
            <textarea v-model="review.fields.gratitude" rows="6" placeholder="Trois choses, même toutes simples." />
          </label>
        </section>

        <!-- 3. Pouls des domaines -->
        <section v-else-if="step === 3">
          <p class="muted">Pour chacun : comment ça va, vraiment ? Un ressenti, pas une note. Tu peux en laisser vides.</p>
          <article v-for="d in domains" :key="d.id" class="card domain" :style="{ '--domain': d.color }">
            <h2><span class="dot" aria-hidden="true" />{{ d.label }}<span v-if="focus.includes(d.key)" class="focus-tag">priorité</span></h2>
            <ScorePicker :model-value="pulseFor(d.id).score" :label="`Pouls de ${d.label}`" low="lourd" high="paisible" @update:model-value="setScore(d.id, $event)" />
            <details>
              <summary class="muted small">Un mot, le temps consacré (facultatif)</summary>
              <label class="field slim">
                <span class="label small">Un mot pour ce domaine</span>
                <input v-model="pulseFor(d.id).word" type="text" maxlength="40" @blur="review.savePulse(d.id)">
              </label>
              <label class="field slim">
                <span class="label small">Heures ressenties cette semaine</span>
                <input v-model.number="pulseFor(d.id).hours" type="number" min="0" max="168" step="0.5" inputmode="decimal" @blur="review.savePulse(d.id)">
              </label>
            </details>
          </article>
        </section>

        <!-- 4. Discerner -->
        <section v-else-if="step === 4">
          <label class="field">
            <span class="label">Une préoccupation qui revient</span>
            <textarea v-model="review.fields.concerns" rows="3" placeholder="Qu’est-ce qui pèse, ou qui te demande de l’attention ?" />
          </label>
          <label class="field">
            <span class="label">Une décision à prendre ou à poser</span>
            <textarea v-model="review.fields.decisions" rows="3" placeholder="Ce que tu choisis, ce que tu laisses de côté." />
          </label>
          <fieldset class="yesno">
            <legend>Un vrai temps de qualité en famille ?</legend>
            <button type="button" :class="{ on: review.fields.family_time === true }" :aria-pressed="review.fields.family_time === true" @click="setYesNo('family_time', true)">Oui</button>
            <button type="button" :class="{ on: review.fields.family_time === false }" :aria-pressed="review.fields.family_time === false" @click="setYesNo('family_time', false)">Pas cette semaine</button>
          </fieldset>
          <fieldset class="yesno">
            <legend>Un vrai jour de repos ?</legend>
            <button type="button" :class="{ on: review.fields.rest_day === true }" :aria-pressed="review.fields.rest_day === true" @click="setYesNo('rest_day', true)">Oui</button>
            <button type="button" :class="{ on: review.fields.rest_day === false }" :aria-pressed="review.fields.rest_day === false" @click="setYesNo('rest_day', false)">Pas cette semaine</button>
          </fieldset>
        </section>

        <!-- 5. Le cap -->
        <section v-else>
          <label class="field">
            <span class="label">Le cap de la semaine qui vient</span>
            <textarea v-model="review.fields.focus_next" rows="3" placeholder="La prochaine chose juste à faire." />
          </label>
          <fieldset class="chips">
            <legend>Domaines prioritaires (3 au plus)</legend>
            <button
              v-for="d in domains"
              :key="d.id"
              type="button"
              class="chip"
              :class="{ on: focus.includes(d.key) }"
              :style="{ '--domain': d.color }"
              :aria-pressed="focus.includes(d.key)"
              @click="toggleFocus(d.key)"
            >
              {{ d.label }}
            </button>
          </fieldset>
          <p v-if="finishError" class="error" role="alert">{{ finishError }}</p>
        </section>

        <p class="muted small status" role="status">
          {{ review.saving.value ? 'Enregistrement…' : review.savedAt.value ? 'Brouillon enregistré' : '' }}
        </p>

        <nav class="nav">
          <button v-if="step > 1" type="button" class="ghost" @click="go(step - 1)">Retour</button>
          <button v-if="step < STEPS.length" type="button" class="button" @click="go(step + 1)">Continuer</button>
          <button v-else type="button" class="button" :disabled="finishing" @click="finish">{{ finishing ? 'Un instant…' : 'Terminer la revue' }}</button>
        </nav>
      </template>
    </template>
  </main>
</template>

<style scoped>
.small { font-size: 0.85rem; margin: 0; }
.steps { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 0; margin: 0 0 20px; }
.steps button { width: 100%; height: 12px; padding: 0; border: 0; border-radius: 6px; background: var(--line); cursor: pointer; }
.steps .past button { background: color-mix(in srgb, var(--accent) 45%, var(--line)); }
.steps .on button { background: var(--accent); }
section > * + * { margin-top: 14px; }
.card h2 { margin-bottom: 8px; }
.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; }
.facts dt { color: var(--ink-soft); font-size: 0.85rem; }
.facts dd { margin: 0; font-weight: 600; font-size: 1.1rem; }
.plain { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
.focus { display: grid; gap: 4px; border-left: 4px solid var(--sun); }
.field { display: block; }
.field.slim { margin: 0 0 12px; }
.label { display: block; font-weight: 600; margin-bottom: 6px; }
.label.small { font-weight: 500; }
textarea, input[type='text'], input[type='number'] {
  width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 12px;
  background: var(--surface); color: var(--ink); font: inherit;
}
input[type='text'], input[type='number'] { min-height: 48px; padding: 0 12px; }
.domain { border-left: 4px solid var(--domain); }
.domain h2 { display: flex; align-items: center; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--domain); }
.focus-tag { margin-left: auto; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); font-weight: 600; }
summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; }
.yesno { border: 0; padding: 0; margin: 0 0 16px; display: flex; flex-wrap: wrap; gap: 8px; }
.yesno legend { font-weight: 600; margin-bottom: 8px; padding: 0; }
.yesno button, .chip {
  min-height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--surface); color: var(--ink); font: inherit; cursor: pointer;
}
.yesno button.on { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.chips { border: 0; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.chips legend { font-weight: 600; margin-bottom: 8px; padding: 0; width: 100%; }
.chip { border-left: 4px solid var(--domain); }
.chip.on { background: color-mix(in srgb, var(--domain) 25%, var(--surface)); border-color: var(--domain); font-weight: 600; }
.status { min-height: 1.4em; margin: 16px 0 0; }
.nav { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
.ghost { min-height: 48px; padding: 0 18px; border: 0; background: none; color: var(--ink-soft); font: inherit; cursor: pointer; }
.error { color: var(--attention); }
.end { text-align: center; padding-top: 14vh; display: grid; gap: 16px; justify-items: center; }
</style>
