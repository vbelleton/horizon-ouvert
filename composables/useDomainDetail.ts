import type { CommitmentKind, CommitmentRow, CommitmentStatus, IndicatorRow, MeasurementRow } from '~/types/database'

export const COMMITMENT_KINDS: Array<{ value: CommitmentKind; label: string }> = [
  { value: 'responsabilite', label: 'Responsabilité' },
  { value: 'role', label: 'Rôle' },
  { value: 'projet', label: 'Projet' },
]

export const COMMITMENT_STATUS: Array<{ value: CommitmentStatus; label: string }> = [
  { value: 'actif', label: 'Actif' },
  { value: 'en_pause', label: 'En pause' },
  { value: 'termine', label: 'Terminé' },
  { value: 'abandonne', label: 'Laissé de côté' },
]

/** Engagements et indicateurs d'un domaine. */
export function useDomainDetail(domainId: Ref<string | undefined>) {
  const { $supabase } = useNuxtApp()
  const { today } = useProfile()
  const { bump } = useDataVersion()

  const commitments = ref<CommitmentRow[]>([])
  const indicators = ref<IndicatorRow[]>([])
  const latest = ref<Record<string, MeasurementRow>>({})
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    if (!domainId.value) return
    const [c, i] = await Promise.all([
      $supabase.from('commitment').select('*').eq('domain_id', domainId.value).order('created_at', { ascending: true }),
      $supabase.from('indicator').select('*').eq('domain_id', domainId.value).eq('is_active', true).order('position'),
    ])
    if (c.error || i.error) {
      error.value = (c.error ?? i.error)!.message
      return
    }
    const inds = (i.data ?? []) as IndicatorRow[]
    const m = inds.length
      ? await $supabase.from('measurement').select('*').in('indicator_id', inds.map((x) => x.id)).order('day', { ascending: false }).limit(300)
      : { data: [], error: null }
    if (m.error) {
      error.value = m.error.message
      return
    }
    error.value = null
    commitments.value = (c.data ?? []) as CommitmentRow[]
    indicators.value = inds
    const byInd: Record<string, MeasurementRow> = {}
    for (const row of (m.data ?? []) as MeasurementRow[]) if (!byInd[row.indicator_id]) byInd[row.indicator_id] = row
    latest.value = byInd
  }

  async function addCommitment(input: { title: string; kind: CommitmentKind; next_step: string }): Promise<string | null> {
    if (!domainId.value) return 'Domaine introuvable'
    const { error: e } = await $supabase.from('commitment').insert({
      user_id: userId(), domain_id: domainId.value, title: input.title.trim(), kind: input.kind, status: 'actif',
      next_step: input.next_step.trim() || null,
    })
    if (e) return e.message
    await load()
    bump()
    return null
  }

  async function updateCommitment(id: string, patch: Partial<CommitmentRow>): Promise<string | null> {
    const { error: e } = await $supabase.from('commitment').update(patch).eq('id', id)
    if (e) return e.message
    await load()
    bump()
    return null
  }

  async function removeCommitment(id: string): Promise<string | null> {
    const { error: e } = await $supabase.from('commitment').delete().eq('id', id)
    if (e) return e.message
    await load()
    bump()
    return null
  }

  async function measure(indicatorId: string, value: number): Promise<string | null> {
    const { error: e } = await $supabase
      .from('measurement')
      .upsert({ indicator_id: indicatorId, user_id: userId(), day: today.value, value }, { onConflict: 'indicator_id,day' })
    if (e) return e.message
    await load()
    bump()
    return null
  }

  return { commitments, indicators, latest, error, load, addCommitment, updateCommitment, removeCommitment, measure }
}
