// Protège /app/** : sans session, retour à la page de connexion.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const { session, init } = useAuth()
  await init()
  if (!session.value) return navigateTo('/connexion')
})
