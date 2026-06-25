<template>
  <span class="nav-version-badge">v{{ version }}</span>
</template>

<script setup lang="ts">
import { version } from '../../../../package.json'
</script>

<style scoped>
.nav-version-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  margin-left: 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  border-radius: 20px;
  background: color-mix(in srgb, var(--vp-c-brand-1) 15%, transparent);
  color: var(--vp-c-brand-1);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
  letter-spacing: 0.02em;
  vertical-align: middle;
  position: relative;
  top: -1px;
  transition: background 0.2s, border-color 0.2s;
}
</style>
