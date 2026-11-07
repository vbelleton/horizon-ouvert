import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

// Un seul client Supabase, côté navigateur. La sécurité repose sur la RLS :
// la clé anon est publique par nature.
export default defineNuxtPlugin(() => {
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase non configuré : NUXT_PUBLIC_SUPABASE_URL et NUXT_PUBLIC_SUPABASE_ANON_KEY manquent.')
  }
  const supabase = createClient<Database>(supabaseUrl || 'http://localhost', supabaseAnonKey || 'missing', {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  })
  return { provide: { supabase } }
})
