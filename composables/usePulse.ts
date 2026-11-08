import type { DomainPulseRow, ReviewRow } from '~/types/database'

/** Pouls par domaine, issu des revues terminées (12 dernières semaines). */
export function usePulse() {
  const { $supabase } = useNuxtApp()
  const reviews = useState<Array<Pick<ReviewRow, 'id' | 'week_start' | 'completed_at'>>>('pulse-reviews', () => [])
  const pulses = useState<DomainPulseRow[]>('pulse-rows', () => [])
  const error = ref<string | null>(null)

  const weekOf = (reviewId: string) => reviews.value.find((r) => r.id === reviewId)?.week_start ?? ''

  const latest = computed(() =>
    latestPulse(pulses.value.map((p) => ({ domain_id: p.domain_id, score: p.score, week_start: weekOf(p.review_id) }))),
  )

  /** Historique d'un domaine, du plus ancien au plus récent. */
  function history(domainId: string): Array<{ week_start: string; score: number | null; word: string | null }> {
    return pulses.value
      .filter((p) => p.domain_id === domainId)
      .map((p) => ({ week_start: weekOf(p.review_id), score: p.score, word: p.word }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
  }

  async function load(): Promise<void> {
    const r = await $supabase
      .from('review')
      .select('id,week_start,completed_at')
      .not('completed_at', 'is', null)
      .order('week_start', { ascending: false })
      .limit(12)
    if (r.error) {
      error.value = r.error.message
      return
    }
    const list = (r.data ?? []) as Array<Pick<ReviewRow, 'id' | 'week_start' | 'completed_at'>>
    const ids = list.map((x) => x.id)
    const p = ids.length ? await $supabase.from('domain_pulse').select('*').in('review_id', ids) : { data: [], error: null }
    if (p.error) {
      error.value = p.error.message
      return
    }
    error.value = null
    reviews.value = list
    pulses.value = (p.data ?? []) as DomainPulseRow[]
  }

  return { reviews, pulses, latest, history, error, load }
}
