<script setup lang="ts">
defineProps<{
  modelValue?: string
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
