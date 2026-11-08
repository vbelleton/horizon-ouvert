import type { ProfileRow } from '~/types/database'

/** Profil de la personne connectée et « aujourd'hui » dans son fuseau. */
export function useProfile() {
  const { $supabase } = useNuxtApp()
  const profile = useState<ProfileRow | null>('profile', () => null)

  const today = computed(() => isoDay(new Date(), profile.value?.timezone))

  async function load(force = false): Promise<void> {
    if (profile.value && !force) return
    const { data } = await $supabase.from('profile').select('*').maybeSingle()
    profile.value = (data as ProfileRow | null) ?? null
  }

  async function update(patch: Partial<ProfileRow>): Promise<string | null> {
    const { error } = await $supabase.from('profile').update(patch).eq('user_id', userId())
    if (error) return error.message
    if (profile.value) profile.value = { ...profile.value, ...patch }
    return null
  }

  return { profile, today, load, update }
}

/** Identifiant de la personne connectée (la RLS l'impose de toute façon côté base). */
export function userId(): string {
  const { session } = useAuth()
  const id = session.value?.user.id
  if (!id) throw new Error('Pas de session')
  return id
}

/** Compteur qui monte à chaque saisie : les pages le surveillent pour se recharger. */
export function useDataVersion() {
  const version = useState<number>('data-version', () => 0)
  return { version, bump: () => { version.value++ } }
}
