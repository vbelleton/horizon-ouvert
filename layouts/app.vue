<script setup lang="ts">
const tabs = [
  { to: '/app', label: 'Horizon', icon: 'M3 15h18M7 15a5 5 0 0 1 10 0' },
  { to: '/app/revue', label: 'Revue', icon: 'M5 4h14v16H5zM9 9h6M9 13h6' },
  { to: '/app/proches', label: 'Proches', icon: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M21 20a5 5 0 0 0-4-4.9' },
  { to: '/app/journal', label: 'Journal', icon: 'M6 4h11a1 1 0 0 1 1 1v15H7a1 1 0 0 1-1-1zM9 8h6' },
]
const route = useRoute()
const isActive = (to: string) => (to === '/app' ? route.path === '/app' : route.path.startsWith(to))
</script>

<template>
  <div>
    <slot />
    <nav class="tabbar" aria-label="Navigation principale">
      <NuxtLink
        v-for="tab in tabs.slice(0, 2)"
        :key="tab.to"
        :to="tab.to"
        class="tab"
        :class="{ active: isActive(tab.to) }"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="tab.icon" /></svg>
        <span>{{ tab.label }}</span>
      </NuxtLink>
      <button class="add" type="button" aria-label="Ajouter : contact, mesure, note ou engagement" disabled title="Saisie rapide : semaine 4">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <NuxtLink
        v-for="tab in tabs.slice(2)"
        :key="tab.to"
        :to="tab.to"
        class="tab"
        :class="{ active: isActive(tab.to) }"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="tab.icon" /></svg>
        <span>{{ tab.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 48px;
  justify-content: center;
  color: var(--ink-soft);
  text-decoration: none;
  font-size: 0.75rem;
}
.tab.active { color: var(--accent); font-weight: 600; }
.tab svg, .add svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.add {
  justify-self: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 0;
  background: var(--accent);
  color: var(--bg);
  display: grid;
  place-items: center;
}
.add:disabled { opacity: 0.5; }
</style>
