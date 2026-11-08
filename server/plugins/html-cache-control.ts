// Le HTML ne doit jamais être mis en cache : après un déploiement, un ancien
// HTML pointerait vers des bundles /_nuxt/* qui n'existent plus.
// (Repris d'eglise-cieux-ouverts.)
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    response.headers = { ...response.headers, 'cache-control': 'no-cache' }
  })
})
