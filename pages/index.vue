<script setup lang="ts">
useSeoMeta({
  title: 'Horizon Ouvert : voir clairement, discerner sereinement, garder le cap',
  description: 'Un compagnon de discernement personnel pour garder une vue d’ensemble de sa vie.',
})
</script>

<template>
  <main class="page landing">
    <svg class="logo" viewBox="0 0 120 60" aria-hidden="true">
      <path d="M8 44h104" />
      <path class="sun" d="M38 44a22 22 0 0 1 44 0" />
    </svg>
    <h1>Horizon Ouvert</h1>
    <p class="tagline">Voir clairement. Discerner sereinement. Garder le cap.</p>

    <section class="manifesto">
      <p>Nous mesurons beaucoup de choses. Nos pas. Nos tâches. Nos dépenses. Nos rendez-vous.
        Pourtant, il est possible de perdre de vue l’essentiel.</p>
      <p>Horizon Ouvert n’a pas été conçu pour optimiser une personne. Il a été conçu pour l’aider à discerner.</p>
      <p class="domains">Santé · Relations · Temps · Finances · Responsabilités · Croissance · Vie spirituelle</p>
      <p>Non pas pour obtenir une meilleure note. Mais pour garder le cap.</p>
      <p class="loop">Observer. Discerner. Ajuster.</p>
    </section>

    <NuxtLink to="/app" class="button">Ouvrir mon horizon</NuxtLink>
  </main>
</template>

<style scoped>
.landing { text-align: center; padding-top: 12vh; }
.logo { width: 120px; margin-bottom: 16px; fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; }
.logo .sun { stroke: var(--sun); }
.tagline { color: var(--ink-soft); font-size: 1.1rem; margin-bottom: 40px; }
.manifesto { text-align: left; max-width: 520px; margin: 0 auto 40px; }
.domains { color: var(--ink-soft); }
.loop { font-weight: 600; }
</style>
