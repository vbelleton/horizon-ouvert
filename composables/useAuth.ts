import type { Session } from '@supabase/supabase-js'

/** Session partagée dans toute l'app, écoutée une seule fois. */
export function useAuth() {
  const { $supabase } = useNuxtApp()
  const session = useState<Session | null>('session', () => null)
  const ready = useState<boolean>('session-ready', () => false)

  async function init() {
    if (ready.value) return
    const { data } = await $supabase.auth.getSession()
    session.value = data.session
    ready.value = true
    // Écouteur unique pour toute la vie de l'app (plugin client, jamais démonté).
    $supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
    })
  }

  async function sendMagicLink(email: string) {
    const redirectTo = `${window.location.origin}/app`
    return $supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  }

  async function signOut() {
    await $supabase.auth.signOut()
    session.value = null
    await navigateTo('/connexion')
  }

  return { session, ready, init, sendMagicLink, signOut }
}
