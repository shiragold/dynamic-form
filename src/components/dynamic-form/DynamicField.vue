<script setup lang="ts">
import { computed, inject } from 'vue'
import { Field } from 'vee-validate'
import FieldWrapper from './FieldWrapper.vue'
import DynamicList from './DynamicList.vue'
import { FORM_CONTEXT } from './types'
import type { FieldSchema, ListField } from './types'

const props = defineProps<{
  field: FieldSchema
  pathPrefix?: string
}>()

const ctx = inject(FORM_CONTEXT)!

const fullPath = computed(() =>
  props.pathPrefix ? `${props.pathPrefix}.${props.field.name}` : props.field.name,
)

const resolvedComponent = computed(() => ctx.resolveComponent(props.field))

const fieldProps = computed(() => {
  const f = props.field
  switch (f.type) {
    case 'text':
    case 'email':
    case 'password':
    case 'url':
    case 'tel':
      return { type: f.type, placeholder: f.placeholder }
    case 'number':
      return { min: f.min, max: f.max, step: f.step }
    case 'textarea':
      return { placeholder: f.placeholder, rows: f.rows }
    case 'select':
      return { options: f.options, placeholder: f.placeholder }
    case 'checkbox':
      return {}
    default:
      return {}
  }
})
</script>

<template>
  <fieldset v-if="field.type === 'section'" role="group">
    <legend>{{ field.label }}</legend>
    <DynamicField
      v-for="child in field.children"
      :key="child.name"
      :field="child"
      :path-prefix="fullPath"
    />
  </fieldset>

  <DynamicList
    v-else-if="field.type === 'list'"
    :field="(field as ListField)"
    :path-prefix="pathPrefix"
  />

  <Field v-else :name="fullPath" v-slot="{ value, handleChange, handleBlur, errorMessage }">
    <FieldWrapper
      :name="fullPath"
      :label="field.label"
      :error="errorMessage"
      :submitted="ctx.submitted.value"
    >
      <component
        :is="resolvedComponent"
        :model-value="value"
        @update:model-value="handleChange"
        @blur="handleBlur"
        :id="`field-${fullPath}`"
        :aria-describedby="ctx.submitted.value && errorMessage ? `field-${fullPath}-error` : undefined"
        :aria-invalid="ctx.submitted.value && !!errorMessage"
        v-bind="fieldProps"
      />
    </FieldWrapper>
  </Field>
</template>
