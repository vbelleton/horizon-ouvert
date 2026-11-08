<script setup lang="ts">
// Le check-in du soir : 30 secondes, rien d'obligatoire.
const emit = defineEmits<{ close: [] }>()
const { todays, save } = useCheckin()

const energy = ref<number | null>(todays.value?.energy ?? null)
const peace = ref<number | null>(todays.value?.peace ?? null)
const sleep = ref<number | null>(todays.value?.sleep_hours ?? 7)
const gratitude = ref(todays.value?.gratitude ?? '')
const sleepTouched = ref(todays.value?.sleep_hours != null)
const saving = ref(false)
const error = ref<string | null>(null)

function step(delta: number) {
  sleepTouched.value = true
  sleep.value = Math.min(14, Math.max(0, (sleep.value ?? 7) + delta))
}

async function submit() {
  saving.value = true
  error.value = await save({
    energy: energy.value,
    peace: peace.value,
    // 7 h par défaut ne doit pas devenir une donnée : sans geste, on n'enregistre rien.
    sleep_hours: sleepTouched.value ? sleep.value : null,
    gratitude: gratitude.value.trim() || null,
  })
  saving.value = false
  if (!error.value) emit('close')
}
</script>

<template>
  <BottomSheet title="Check-in du jour" @close="emit('close')">
    <form @submit.prevent="submit">
      <ScorePicker v-model="energy" label="Énergie" low="à plat" high="pleine" />
      <ScorePicker v-model="peace" label="Paix intérieure" low="agitée" high="profonde" />

      <div class="sleep">
        <span class="label">Sommeil de la nuit</span>
        <div class="stepper">
          <button type="button" aria-label="Une demi-heure de moins" @click="step(-0.5)">−</button>
          <output :class="{ muted: !sleepTouched }">{{ fmt(sleep) }} h</output>
          <button type="button" aria-label="Une demi-heure de plus" @click="step(0.5)">+</button>
        </div>
      </div>

      <label class="field">
        <span class="label">Une gratitude (facultatif)</span>
        <input v-model="gratitude" type="text" maxlength="200" placeholder="Pour quoi rends-tu grâce aujourd’hui ?">
      </label>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="button full" type="submit" :disabled="saving">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.label { display: block; font-weight: 600; margin-bottom: 8px; }
.sleep { margin-bottom: 20px; }
.stepper { display: flex; align-items: center; gap: 16px; }
.stepper button {
  width: 48px; height: 48px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--surface); color: var(--ink); font: inherit; font-size: 1.4rem; cursor: pointer;
}
.stepper output { min-width: 64px; text-align: center; font-size: 1.3rem; font-weight: 600; }
.field { display: block; margin-bottom: 20px; }
.field input {
  width: 100%; min-height: 48px; padding: 0 16px; border: 1px solid var(--line);
  border-radius: 12px; background: var(--surface); color: var(--ink); font: inherit;
}
.full { width: 100%; }
.error { color: var(--attention); }
</style>
