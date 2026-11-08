<script setup lang="ts">
const { session, init, sendMagicLink } = useAuth()
const email = ref('')
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const message = ref('')

onMounted(async () => {
  await init()
  if (session.value) await navigateTo('/app')
})

async function submit() {
  state.value = 'sending'
  const { error } = await sendMagicLink(email.value.trim())
  if (error) {
    state.value = 'error'
    message.value = error.message
    return
  }
  state.value = 'sent'
}
</script>

<template>
  <main class="page login">
    <h1>Horizon Ouvert</h1>
    <p class="muted">Un lien de connexion t’est envoyé par e-mail. Pas de mot de passe.</p>
    <form v-if="state !== 'sent'" @submit.prevent="submit">
      <label for="email" class="muted">Adresse e-mail</label>
      <input id="email" v-model="email" type="email" autocomplete="email" required placeholder="toi@exemple.fr">
      <button class="button" type="submit" :disabled="state === 'sending'">
        {{ state === 'sending' ? 'Envoi…' : 'Recevoir mon lien' }}
      </button>
      <p v-if="state === 'error'" class="error" role="alert">{{ message }}</p>
    </form>
    <p v-else class="card" role="status">C’est parti : ouvre le lien reçu à {{ email }} sur cet appareil.</p>
  </main>
</template>

<style scoped>
.login { max-width: 420px; padding-top: 18vh; }
form { display: grid; gap: 12px; margin-top: 24px; }
.error { color: var(--attention); }
</style>
