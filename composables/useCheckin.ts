import type { CheckinRow } from '~/types/database'

export interface CheckinValues {
  energy: number | null
  peace: number | null
  sleep_hours: number | null
  gratitude: string | null
}

/** Check-in du jour (30 secondes) et des deux dernières semaines. */
export function useCheckin() {
  const { $supabase } = useNuxtApp()
  const { today } = useProfile()
  const { bump } = useDataVersion()
  const recent = useState<CheckinRow[]>('checkins-recent', () => [])
  const error = ref<string | null>(null)

  const todays = computed(() => recent.value.find((c) => c.day === today.value) ?? null)

  async function load(): Promise<void> {
    const { data, error: e } = await $supabase
      .from('checkin')
      .select('*')
      .gte('day', addDays(today.value, -27))
      .order('day', { ascending: false })
    if (e) {
      error.value = e.message
      return
    }
    error.value = null
    recent.value = (data ?? []) as CheckinRow[]
  }

  async function save(values: CheckinValues): Promise<string | null> {
    const { error: e } = await $supabase
      .from('checkin')
      .upsert({ ...values, user_id: userId(), day: today.value }, { onConflict: 'user_id,day' })
    if (e) return e.message
    await load()
    bump()
    return null
  }

  return { recent, todays, error, load, save }
}
