<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Connexions · Horizon Ouvert' })

const config = useRuntimeConfig()
const { profile, load: loadProfile } = useProfile()
const dayOf = (ts: string) => formatDay(isoDay(new Date(ts), profile.value?.timezone))
const { status, loaded, error, endpoint, load, create, revoke } = useConnexions()

const token = ref<string | null>(null)
const actionError = ref<string | null>(null)
const copied = ref<string | null>(null)
const busy = ref(false)

const anonKey = computed(() => String(config.public.supabaseAnonKey))
const body = computed(() =>
  JSON.stringify({ p_token: token.value ?? 'TON_JETON', p_payload: { day: 'AAAA-MM-JJ', weight_kg: 81.2, sleep_hours: 7.1, resting_hr: 58 } }, null, 2),
)

async function generate() {
  if (status.value && !confirm('Ton jeton actuel cessera de fonctionner. Continuer ?')) return
  busy.value = true
  const r = await create()
  busy.value = false
  actionError.value = r.error
  token.value = r.token
}

async function stop() {
  if (!confirm('Couper la réception des mesures de ton iPhone ?')) return
  actionError.value = await revoke()
  token.value = null
}

async function copy(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = label
    setTimeout(() => (copied.value = null), 1800)
  } catch {
    copied.value = null
  }
}

onMounted(async () => {
  await loadProfile()
  await load()
})
</script>

<template>
  <main class="page">
    <NuxtLink to="/app" class="back muted">← Horizon</NuxtLink>
    <h1>Connexions</h1>
    <p class="muted intro">Moins de saisie : tes mesures arrivent seules et tu gardes le regard sur ce qui compte.</p>

    <p v-if="error" class="card error" role="alert">Impossible de lire l'état de la connexion : {{ error }}</p>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>

    <section class="card" aria-labelledby="sante">
      <h2 id="sante">Santé (iPhone et Apple Watch)</h2>
      <p class="muted">
        L'app Santé de l'iPhone reçoit déjà les données de ta montre. Un Raccourci (ou l'app Health Auto Export) les envoie ici :
        poids, sommeil, fréquence cardiaque au repos.
      </p>

      <template v-if="loaded">
        <p v-if="status" class="state">
          Connexion active depuis le {{ dayOf(status.created_at) }}.
          <span v-if="status.last_used_at">Dernier envoi : {{ dayOf(status.last_used_at) }}.</span>
          <span v-else>Aucun envoi reçu pour l'instant.</span>
        </p>
        <p v-else class="state">Pas encore connectée.</p>

        <div class="actions">
          <button type="button" class="button" :disabled="busy" @click="generate">
            {{ status ? 'Créer un nouveau jeton' : 'Créer mon jeton' }}
          </button>
          <button v-if="status" type="button" class="ghost" @click="stop">Couper la connexion</button>
        </div>
      </template>

      <div v-if="token" class="setup">
        <p class="warn"><strong>Copie ton jeton maintenant :</strong> il ne sera plus affiché.</p>
        <ol>
          <li>Sur l'iPhone, ouvre l'app <strong>Raccourcis</strong> et crée un raccourci.</li>
          <li>Ajoute les actions « Trouver des échantillons de santé » (poids, sommeil, fréquence cardiaque au repos), puis « Obtenir le contenu de l'URL ».</li>
          <li>Méthode <strong>POST</strong>, avec l'adresse et les en-têtes ci-dessous.</li>
          <li>Dans Automatisation, lance-le chaque matin.</li>
        </ol>

        <label>Adresse</label>
        <div class="copy"><code>{{ endpoint }}</code><button type="button" class="ghost" @click="copy('url', endpoint)">{{ copied === 'url' ? 'Copié' : 'Copier' }}</button></div>

        <label>En-têtes</label>
        <div class="copy"><code>apikey: {{ anonKey }}</code><button type="button" class="ghost" @click="copy('key', anonKey)">{{ copied === 'key' ? 'Copié' : 'Copier' }}</button></div>
        <div class="copy"><code>Content-Type: application/json</code></div>

        <label>Corps (JSON)</label>
        <div class="copy"><pre>{{ body }}</pre><button type="button" class="ghost" @click="copy('body', body)">{{ copied === 'body' ? 'Copié' : 'Copier' }}</button></div>
        <p class="muted small">
          Tous les champs sont facultatifs. « day » est le jour concerné (aujourd'hui si tu l'omets). Le sommeil enregistré par la montre remplace celui du check-in.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.back { display: inline-block; min-height: 44px; line-height: 44px; text-decoration: none; }
.intro { margin-top: 0; }
section { margin-bottom: 24px; }
.state { margin: 12px 0; }
.actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.ghost { min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--ink-soft); font: inherit; cursor: pointer; }
.setup { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.warn { margin-top: 0; }
label { display: block; margin: 16px 0 6px; font-weight: 600; font-size: 0.9rem; }
.copy { display: flex; align-items: flex-start; gap: 8px; }
code, pre { flex: 1; margin: 0; padding: 10px; overflow-x: auto; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; font-size: 0.8rem; white-space: pre-wrap; word-break: break-all; }
.small { font-size: 0.85rem; }
.error { color: var(--attention); }
</style>
