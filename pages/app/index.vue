<script setup lang="ts">
import type { ProfileRow } from '~/types/database'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Horizon · Horizon Ouvert' })

const { $supabase } = useNuxtApp()
const { signOut } = useAuth()
const { domains, signals, loading, error, load } = useDomains()
const profile = ref<ProfileRow | null>(null)

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

const today = computed(() => isoDay(new Date(), profile.value?.timezone))
const nextReview = computed(() => {
  if (!profile.value) return null
  const target = profile.value.review_weekday
  const gap = (target - weekday(today.value) + 7) % 7
  return gap === 0 ? 'aujourd’hui' : gap === 1 ? 'demain' : WEEKDAYS[target]
})

onMounted(async () => {
  const [, p] = await Promise.all([load(), $supabase.from('profile').select('*').maybeSingle()])
  profile.value = p.data
})
</script>

<template>
  <main class="page">
    <header class="head">
      <div>
        <p class="muted date">{{ new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()) }}</p>
        <h1>Ton horizon</h1>
      </div>
      <button class="link muted" type="button" @click="signOut">Se déconnecter</button>
    </header>

    <p v-if="error" class="card" role="alert">Impossible de charger tes domaines : {{ error }}</p>
    <p v-else-if="loading && !domains.length" class="muted">Chargement…</p>

    <template v-else>
      <section class="card rose-card">
        <DomainRose :domains="domains" />
        <p class="muted center">La rose se remplira avec ta première revue.</p>
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
            <DomainTile :domain="d" :focus="profile?.focus_domains.includes(d.key)" />
          </li>
        </ul>
      </section>

      <section v-if="nextReview" class="card ritual">
        <strong>Prochaine revue : {{ nextReview }}</strong>
        <span class="muted">Dix minutes pour regarder la semaine et poser le cap.</span>
      </section>
    </template>
  </main>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.date { margin: 0; }
.date::first-letter { text-transform: uppercase; }
.link { background: none; border: 0; font: inherit; font-size: 0.85rem; cursor: pointer; padding: 8px 0; min-height: 44px; }
section { margin-bottom: 24px; }
.rose-card { padding: 24px 16px 8px; }
.center { text-align: center; font-size: 0.9rem; }
ul { list-style: none; margin: 0; padding: 0; }
.signals { display: grid; gap: 8px; }
.signals .attention { border-left: 4px solid var(--attention); }
.tiles { display: grid; gap: 10px; grid-template-columns: 1fr; }
@media (min-width: 560px) { .tiles { grid-template-columns: 1fr 1fr; } }
.ritual { display: grid; gap: 4px; }
</style>
