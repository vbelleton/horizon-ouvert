import type { IngestTokenRow } from '~/types/database'

/** Connecteur santé : jeton personnel que l'iPhone utilise pour envoyer ses mesures. */
export function useConnexions() {
  const { $supabase } = useNuxtApp()
  const config = useRuntimeConfig()
  const status = ref<IngestTokenRow | null>(null)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  /** Adresse que le Raccourci appelle (la clé publique « anon » est celle de l'appli). */
  const endpoint = computed(() => `${config.public.supabaseUrl}/rest/v1/rpc/ingest_health`)

  async function load(): Promise<void> {
    const { data, error: e } = await $supabase
      .from('ingest_token')
      .select('user_id, created_at, last_used_at')
      .maybeSingle()
    loaded.value = !e
    error.value = e ? e.message : null
    status.value = (data as IngestTokenRow | null) ?? null
  }

  /** Renvoie le jeton en clair (affiché une seule fois), ou l'erreur. */
  async function create(): Promise<{ token: string | null; error: string | null }> {
    const { data, error: e } = await $supabase.rpc('create_ingest_token')
    if (e) return { token: null, error: e.message }
    await load()
    return { token: data as string, error: null }
  }

  async function revoke(): Promise<string | null> {
    const { error: e } = await $supabase.rpc('revoke_ingest_token')
    if (e) return e.message
    await load()
    return null
  }

  return { status, loaded, error, endpoint, load, create, revoke }
}
