<script setup lang="ts">
import { computed, provide, ref, readonly, defineComponent, useSlots } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { jsonSchemaToZod } from './json-schema-to-zod'
import { createComponentResolver } from './component-resolver'
import { FORM_CONTEXT } from './types'
import DynamicField from './DynamicField.vue'
import type { Component } from 'vue'
import type { FieldSchema } from './types'

const props = defineProps<{
  schema: FieldSchema[]
  initialValues?: Record<string, unknown>
}>()

const emit = defineEmits<{
  submit: [values: Record<string, unknown>]
}>()

const slots = useSlots()

const slotComponents = computed(() => {
  const registry: Record<string, Component> = {}
  for (const name of Object.keys(slots)) {
    if (name.startsWith('field:')) {
      const fieldName = name.slice('field:'.length)
      const slotFn = slots[name]!
      registry[fieldName] = defineComponent({
        inheritAttrs: false,
        setup(_, { attrs }) {
          return () => slotFn(attrs)
        },
      })
    }
  }
  return registry
})

const zodSchema = computed(() => jsonSchemaToZod(props.schema))

const { handleSubmit } = useForm({
  validationSchema: computed(() => toTypedSchema(zodSchema.value)),
  initialValues: props.initialValues,
})

const submitted = ref(false)

const resolveComponent = computed(() => createComponentResolver(slotComponents.value))

provide(FORM_CONTEXT, {
  submitted: readonly(submitted),
  resolveComponent: (field) => resolveComponent.value(field),
})

const onSubmit = handleSubmit(
  (values) => {
    submitted.value = true
    emit('submit', values)
  },
  () => {
    submitted.value = true
  },
)
</script>

<template>
  <form @submit.prevent="onSubmit" novalidate>
    <DynamicField v-for="field in schema" :key="field.name" :field="field" />
    <slot name="actions">
      <button type="submit">Submit</button>
    </slot>
  </form>
</template>
