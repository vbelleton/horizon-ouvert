import type { Circle, PersonRow } from '~/types/database'

export const CONTACT_KINDS = [
  { value: 'echange', label: 'Échange' },
  { value: 'appel', label: 'Appel' },
  { value: 'message', label: 'Message' },
  { value: 'visite', label: 'Visite' },
  { value: 'repas', label: 'Repas' },
] as const

export const CIRCLES: Array<{ value: Circle; label: string; hint: string }> = [
  { value: 'intime', label: 'Intime', hint: 'Les personnes que je ne veux pas perdre de vue' },
  { value: 'proche', label: 'Proche', hint: 'Famille élargie, amis proches' },
  { value: 'communaute', label: 'Communauté', hint: 'Église, association, voisinage' },
]

export const CADENCES = [
  { value: 7, label: 'Chaque semaine' },
  { value: 14, label: 'Toutes les 2 semaines' },
  { value: 30, label: 'Chaque mois' },
  { value: 60, label: 'Tous les 2 mois' },
  { value: 0, label: 'Sans rappel' },
]

/** Proches, rappels de contact et journal des contacts. */
export function usePeople() {
  const { $supabase } = useNuxtApp()
  const { today } = useProfile()
  const { bump } = useDataVersion()
  const people = useState<PersonRow[]>('people', () => [])
  const error = ref<string | null>(null)

  const sorted = computed(() => sortPeople(people.value, today.value))
  const due = computed(() => sorted.value.filter((p) => isDue(p, today.value)))

  async function load(): Promise<void> {
    const { data, error: e } = await $supabase.from('person').select('*')
    if (e) {
      error.value = e.message
      return
    }
    error.value = null
    people.value = (data ?? []) as PersonRow[]
  }

  async function add(input: { name: string; circle: Circle; cadence_days: number }): Promise<string | null> {
    const { error: e } = await $supabase.from('person').insert({
      user_id: userId(),
      name: input.name.trim(),
      circle: input.circle,
      cadence_days: input.cadence_days > 0 ? input.cadence_days : null,
    })
    if (e) return e.message
    await load()
    bump()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    const { error: e } = await $supabase.from('person').delete().eq('id', id)
    if (e) return e.message
    await load()
    bump()
    return null
  }

  /** Note un contact. Le dernier contact de la personne est recalculé par la base. */
  async function logContact(personId: string, kind = 'echange', note: string | null = null, day?: string): Promise<string | null> {
    const { error: e } = await $supabase
      .from('interaction')
      .insert({ user_id: userId(), person_id: personId, day: day ?? today.value, kind, note })
    if (e) return e.message
    await load()
    bump()
    return null
  }

  return { people, sorted, due, error, load, add, remove, logContact }
}
