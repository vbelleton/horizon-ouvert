<script setup lang="ts">
// « J'ai pris des nouvelles de… » : un contact noté, avec ou sans détail.
const props = defineProps<{ personId?: string }>()
const emit = defineEmits<{ close: [] }>()

const { people, sorted, load, logContact } = usePeople()
const { today } = useProfile()

const person = ref(props.personId ?? '')
const kind = ref('echange')
const day = ref(today.value)
const note = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  if (!people.value.length) await load()
  if (!person.value && sorted.value[0]) person.value = sorted.value[0].id
})

async function submit() {
  if (!person.value) return
  saving.value = true
  error.value = await logContact(person.value, kind.value, note.value.trim() || null, day.value)
  saving.value = false
  if (!error.value) emit('close')
}
</script>

<template>
  <BottomSheet title="Prendre des nouvelles" @close="emit('close')">
    <p v-if="!people.length" class="muted">
      Ajoute d’abord quelqu’un dans l’onglet <NuxtLink to="/app/proches" @click="emit('close')">Proches</NuxtLink>.
    </p>
    <form v-else @submit.prevent="submit">
      <label class="field">
        <span class="label">Qui ?</span>
        <select v-model="person" required>
          <option v-for="p in sorted" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Comment ?</span>
        <select v-model="kind">
          <option v-for="k in CONTACT_KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Quand ?</span>
        <input v-model="day" type="date" :max="today" required>
      </label>
      <label class="field">
        <span class="label">Un mot (facultatif)</span>
        <input v-model="note" type="text" maxlength="200">
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="button full" type="submit" :disabled="saving || !person">{{ saving ? 'Enregistrement…' : 'Noter' }}</button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.label { display: block; font-weight: 600; margin-bottom: 6px; }
.field { display: block; margin-bottom: 16px; }
select, input {
  width: 100%; min-height: 48px; padding: 0 12px; border: 1px solid var(--line);
  border-radius: 12px; background: var(--surface); color: var(--ink); font: inherit;
}
.full { width: 100%; }
.error { color: var(--attention); }
</style>
