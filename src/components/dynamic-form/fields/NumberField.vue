<script setup lang="ts">
defineProps<{
  modelValue?: number
  min?: number
  max?: number
  step?: number
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <input
    type="number"
    :value="modelValue"
    :min="min"
    :max="max"
    :step="step"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).valueAsNumber)"
  />
</template>
