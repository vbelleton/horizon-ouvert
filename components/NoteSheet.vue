<script setup lang="ts">
// Une note de discernement, de prière ou de gratitude : du texte daté, c'est tout.
const emit = defineEmits<{ close: [] }>()
const { saveNote } = useJournal()
const { domains, load: loadDomains } = useDomains()

const body = ref('')
const domainId = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

onMounted(() => { if (!domains.value.length) void loadDomains() })

async function submit() {
  if (!body.value.trim()) return
  saving.value = true
  error.value = await saveNote(body.value, domainId.value || null)
  saving.value = false
  if (!error.value) emit('close')
}
</script>

<template>
  <BottomSheet title="Une note" @close="emit('close')">
    <form @submit.prevent="submit">
      <label class="field">
        <span class="label">Ce que tu veux garder</span>
        <textarea v-model="body" rows="5" required placeholder="Une question qui te travaille, une prière, une décision…" />
      </label>
      <label class="field">
        <span class="label">Domaine (facultatif)</span>
        <select v-model="domainId">
          <option value="">Aucun</option>
          <option v-for="d in domains" :key="d.id" :value="d.id">{{ d.label }}</option>
        </select>
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="button full" type="submit" :disabled="saving || !body.trim()">{{ saving ? 'Enregistrement…' : 'Garder' }}</button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.label { display: block; font-weight: 600; margin-bottom: 6px; }
.field { display: block; margin-bottom: 16px; }
textarea, select {
  width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 12px;
  background: var(--surface); color: var(--ink); font: inherit;
}
select { min-height: 48px; padding: 0 12px; }
.full { width: 100%; }
.error { color: var(--attention); }
</style>
