<script setup lang="ts">
defineProps<{
  name: string
  label: string
  error: string | undefined
  submitted: boolean
}>()
</script>

<template>
  <div class="field-wrapper">
    <label :for="`field-${name}`">{{ label }}</label>
    <slot />
    <span
      v-if="submitted && error"
      :id="`field-${name}-error`"
      role="alert"
      class="field-error"
    >
      {{ error }}
    </span>
  </div>
</template>
