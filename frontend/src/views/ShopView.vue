<script setup lang="ts">
/**
 * Shop — currently under maintenance.
 * Uses the shared UnderMaintenance screen so it matches every other
 * page that's temporarily down (one design for all).
 */
import UnderMaintenance from '@/components/ui/UnderMaintenance.vue'
</script>

<template>
  <UnderMaintenance
    page="shop"
    message="The shop is being restocked with fresh digital products — check back soon."
  />
</template>
