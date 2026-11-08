import type { JournalEntryRow } from '~/types/database'

/** Journal : des notes datées. Les types (prière, discernement…) viendront en V1. */
export function useJournal() {
  const { $supabase } = useNuxtApp()
  const { today } = useProfile()
  const { bump } = useDataVersion()
  const entries = useState<JournalEntryRow[]>('journal', () => [])
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    const { data, error: e } = await $supabase
      .from('journal_entry')
      .select('*')
      .order('day', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
    if (e) {
      error.value = e.message
      return
    }
    error.value = null
    entries.value = (data ?? []) as JournalEntryRow[]
  }

  async function saveNote(body: string, domainId: string | null): Promise<string | null> {
    const { error: e } = await $supabase
      .from('journal_entry')
      .insert({ user_id: userId(), day: today.value, domain_id: domainId, body: body.trim() })
    if (e) return e.message
    await load()
    bump()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    const { error: e } = await $supabase.from('journal_entry').delete().eq('id', id)
    if (e) return e.message
    await load()
    return null
  }

  return { entries, error, load, saveNote, remove }
}
