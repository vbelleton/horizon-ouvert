<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Horizon · Horizon Ouvert' })

const { signOut } = useAuth()
const { profile, today, load: loadProfile } = useProfile()
const { domains, signals, loading, error, load: loadDomains } = useDomains()
const { todays, load: loadCheckins } = useCheckin()
const { reviews, latest, load: loadPulse } = usePulse()
const { version } = useDataVersion()
const quickAdd = useState<null | 'menu' | 'checkin' | 'contact' | 'note'>('quickadd', () => null)

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

const thisWeek = computed(() => weekStart(today.value, profile.value?.week_starts_on ?? 1))
const reviewDone = computed(() => reviews.value.some((r) => r.week_start === thisWeek.value))
const reviewDay = computed(() => profile.value?.review_weekday ?? 0)
const reviewToday = computed(() => weekday(today.value) === reviewDay.value)
const nextReview = computed(() => {
  const gap = (reviewDay.value - weekday(today.value) + 7) % 7
  return gap === 0 ? 'aujourd’hui' : gap === 1 ? 'demain' : WEEKDAYS[reviewDay.value]
})

// La rose est indexée par clé de domaine ; le pouls l'est par identifiant.
const pulseByKey = computed(() => {
  const out: Record<string, number> = {}
  for (const d of domains.value) if (latest.value[d.id]) out[d.key] = latest.value[d.id]!
  return out
})
const hasPulse = computed(() => Object.keys(pulseByKey.value).length > 0)

async function reload() {
  await loadProfile()
  await Promise.all([loadDomains(), loadCheckins(), loadPulse()])
}
onMounted(reload)
watch(version, reload)
</script>

<template>
  <main class="page">
    <header class="head">
      <div>
        <p class="muted date">{{ formatDay(today, true) }}</p>
        <h1>Ton horizon</h1>
      </div>
      <button class="link muted" type="button" @click="signOut">Se déconnecter</button>
    </header>

    <p v-if="error" class="card" role="alert">Impossible de charger tes domaines : {{ error }}</p>
    <p v-else-if="loading && !domains.length" class="muted">Chargement…</p>

    <template v-else>
      <section class="card rose-card">
        <DomainRose :domains="domains" :pulse="pulseByKey" />
        <p class="muted center">
          {{ hasPulse ? 'Dernier pouls de chaque domaine, issu de tes revues.' : 'La rose se remplira avec ta première revue.' }}
        </p>
      </section>

      <section class="rituals">
        <button v-if="!todays" type="button" class="card ritual action" @click="quickAdd = 'checkin'">
          <strong>Check-in du jour</strong>
          <span class="muted">Trente secondes : énergie, paix, sommeil.</span>
        </button>
        <button v-else type="button" class="card ritual action done" @click="quickAdd = 'checkin'">
          <strong>Check-in du jour fait</strong>
          <span class="muted">
            Énergie {{ fmt(todays.energy, 0) }} · Paix {{ fmt(todays.peace, 0) }} · Sommeil {{ todays.sleep_hours === null ? '–' : `${fmt(todays.sleep_hours)} h` }}
          </span>
        </button>

        <NuxtLink v-if="!reviewDone && (reviewToday || signals.some((s) => s.rule === 'revue'))" to="/app/revue" class="card ritual action primary">
          <strong>Faire la revue de la semaine</strong>
          <span>Dix minutes pour regarder la semaine et poser le cap.</span>
        </NuxtLink>
        <div v-else-if="reviewDone" class="card ritual">
          <strong>Revue de la semaine faite</strong>
          <NuxtLink to="/app/revue" class="muted">La relire ou la compléter</NuxtLink>
        </div>
        <div v-else class="card ritual">
          <strong>Prochaine revue : {{ nextReview }}</strong>
          <span class="muted">Dix minutes pour regarder la semaine et poser le cap.</span>
        </div>
      </section>

      <section v-if="signals.length" aria-labelledby="signals-title">
        <h2 id="signals-title">À regarder</h2>
        <ul class="signals">
          <li v-for="s in signals" :key="s.rule + (s.domain_key ?? '')" class="card" :class="s.level">
            {{ s.message }}
          </li>
        </ul>
      </section>

      <section aria-labelledby="domains-title">
        <h2 id="domains-title">Les 7 domaines</h2>
        <ul class="tiles">
          <li v-for="d in domains" :key="d.id">
            <DomainTile :domain="d" :focus="profile?.focus_domains.includes(d.key)" :score="latest[d.id]" />
          </li>
        </ul>
      </section>

      <NuxtLink to="/app/connexions" class="link muted conn">Connexions : recevoir ma santé sans saisie</NuxtLink>
    </template>
  </main>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.date { margin: 0; }
.date::first-letter { text-transform: uppercase; }
.conn { display: inline-block; text-decoration: none; }
.link { background: none; border: 0; font: inherit; font-size: 0.85rem; cursor: pointer; padding: 8px 0; min-height: 44px; }
section { margin-bottom: 24px; }
.rose-card { padding: 24px 16px 8px; }
.center { text-align: center; font-size: 0.9rem; }
ul { list-style: none; margin: 0; padding: 0; }
.signals { display: grid; gap: 8px; }
.signals .attention { border-left: 4px solid var(--attention); }
.tiles { display: grid; gap: 10px; grid-template-columns: 1fr; }
@media (min-width: 560px) { .tiles { grid-template-columns: 1fr 1fr; } }
.rituals { display: grid; gap: 10px; }
.ritual { display: grid; gap: 4px; text-align: left; font: inherit; color: var(--ink); text-decoration: none; width: 100%; }
.action { cursor: pointer; min-height: 64px; }
.action.primary { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.action.done strong::before { content: '✓ '; color: var(--sun); }
</style>
