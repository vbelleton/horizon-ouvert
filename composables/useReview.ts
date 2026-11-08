import type { DomainPulseRow, ReviewRow } from '~/types/database'

type Editable = Pick<ReviewRow, 'highlights' | 'gratitude' | 'concerns' | 'decisions' | 'focus_next' | 'family_time' | 'rest_day'>

export interface PulseDraft {
  score: number | null
  word: string
  hours: number | null
}

/**
 * Revue d'une semaine : un brouillon qui s'enregistre au fil de l'eau.
 * Règle de Cieux Ouverts : on n'écrit JAMAIS tant que la lecture n'a pas
 * réussi, sinon un brouillon vide écraserait une revue déjà commencée.
 */
export function useReview(week: Ref<string>) {
  const { $supabase } = useNuxtApp()
  const { bump } = useDataVersion()

  const review = ref<ReviewRow | null>(null)
  const fields = reactive<Editable>({
    highlights: '', gratitude: '', concerns: '', decisions: '', focus_next: '', family_time: null, rest_day: null,
  })
  const pulse = reactive<Record<string, PulseDraft>>({})
  const loaded = ref(false)
  const error = ref<string | null>(null)
  const saving = ref(false)
  const savedAt = ref<number | null>(null)

  async function load(): Promise<void> {
    loaded.value = false
    review.value = null
    // Lecture d'abord…
    const found = await $supabase.from('review').select('*').eq('week_start', week.value).maybeSingle()
    if (found.error) {
      error.value = `Impossible de lire cette revue : ${found.error.message}`
      return
    }
    let row = found.data as ReviewRow | null
    // …création du brouillon seulement si elle n'existe pas.
    if (!row) {
      const created = await $supabase
        .from('review')
        .insert({ user_id: userId(), week_start: week.value })
        .select('*')
        .single()
      if (created.error) {
        error.value = `Impossible de commencer la revue : ${created.error.message}`
        return
      }
      row = created.data as ReviewRow
    }
    const pulses = await $supabase.from('domain_pulse').select('*').eq('review_id', row.id)
    if (pulses.error) {
      error.value = `Impossible de lire le pouls : ${pulses.error.message}`
      return
    }
    review.value = row
    for (const k of Object.keys(fields) as Array<keyof Editable>) {
      ;(fields as Record<string, unknown>)[k] = row[k] ?? (typeof fields[k] === 'boolean' || fields[k] === null ? null : '')
    }
    for (const key of Object.keys(pulse)) delete pulse[key]
    for (const p of (pulses.data ?? []) as DomainPulseRow[]) {
      pulse[p.domain_id] = { score: p.score, word: p.word ?? '', hours: p.hours_estimate }
    }
    error.value = null
    loaded.value = true
  }

  async function saveFields(): Promise<void> {
    if (!loaded.value || !review.value) return
    saving.value = true
    const clean = (s: string | null) => (s && s.trim() ? s.trim() : null)
    const { error: e } = await $supabase
      .from('review')
      .update({
        highlights: clean(fields.highlights), gratitude: clean(fields.gratitude), concerns: clean(fields.concerns),
        decisions: clean(fields.decisions), focus_next: clean(fields.focus_next),
        family_time: fields.family_time, rest_day: fields.rest_day,
      })
      .eq('id', review.value.id)
    saving.value = false
    if (e) {
      error.value = `Enregistrement impossible : ${e.message}`
      return
    }
    error.value = null
    savedAt.value = Date.now()
  }

  async function savePulse(domainId: string): Promise<void> {
    if (!loaded.value || !review.value) return
    const p = pulse[domainId]
    if (!p) return
    const { error: e } = await $supabase.from('domain_pulse').upsert(
      {
        review_id: review.value.id, domain_id: domainId, user_id: userId(),
        score: p.score, word: p.word.trim() || null, hours_estimate: p.hours,
      },
      { onConflict: 'review_id,domain_id' },
    )
    if (e) {
      error.value = `Enregistrement impossible : ${e.message}`
      return
    }
    error.value = null
    savedAt.value = Date.now()
  }

  async function complete(): Promise<string | null> {
    if (!loaded.value || !review.value) return 'La revue n’est pas chargée'
    await saveFields()
    if (error.value) return error.value
    const { error: e } = await $supabase
      .from('review')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', review.value.id)
    if (e) return e.message
    review.value = { ...review.value, completed_at: new Date().toISOString() }
    bump()
    return null
  }

  // Brouillon : enregistrement 800 ms après la dernière frappe.
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(fields, () => {
    if (!loaded.value) return
    clearTimeout(timer)
    timer = setTimeout(saveFields, 800)
  }, { deep: true })
  onBeforeUnmount(() => {
    clearTimeout(timer)
    if (loaded.value) void saveFields()
  })

  return { review, fields, pulse, loaded, error, saving, savedAt, load, saveFields, savePulse, complete }
}
