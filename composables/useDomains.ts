import type { DomainRow, SignalRow } from '~/types/database'

/** Les 7 domaines de la personne connectée et les signaux à regarder. */
export function useDomains() {
  const { $supabase } = useNuxtApp()
  const domains = useState<DomainRow[]>('domains', () => [])
  const signals = useState<SignalRow[]>('signals', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    const [d, s] = await Promise.all([
      $supabase.from('domain').select('*').eq('is_active', true).order('position'),
      $supabase.from('signals').select('*'),
    ])
    loading.value = false
    if (d.error || s.error) {
      error.value = (d.error ?? s.error)!.message
      return
    }
    domains.value = (d.data ?? []) as DomainRow[]
    // Vue d'ensemble avant détail : 3 signaux au plus, l'attention d'abord.
    signals.value = ((s.data ?? []) as SignalRow[])
      .sort((a, b) => (a.level === b.level ? 0 : a.level === 'attention' ? -1 : 1))
      .slice(0, 3)
  }

  return { domains, signals, loading, error, load }
}
