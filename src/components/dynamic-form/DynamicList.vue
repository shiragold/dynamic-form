<script setup lang="ts">
import { computed } from 'vue'
import { FieldArray } from 'vee-validate'
import DynamicField from './DynamicField.vue'
import type { ListField, FieldSchema } from './types'

const props = defineProps<{
  field: ListField
  pathPrefix?: string
}>()

const fullPath = computed(() =>
  props.pathPrefix ? `${props.pathPrefix}.${props.field.name}` : props.field.name,
)

function buildDefaultRow(children: FieldSchema[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const child of children) {
    if (child.type === 'section' || child.type === 'list') continue
    row[child.name] = child.defaultValue ?? undefined
  }
  return row
}

const defaultRow = computed(() => buildDefaultRow(props.field.children))
</script>

<template>
  <FieldArray :name="fullPath" v-slot="{ fields, push, remove }">
    <div role="group" :aria-label="field.label" class="list-field">
      <span class="list-field-label">{{ field.label }}</span>

      <div v-for="(entry, index) in fields" :key="entry.key" class="list-field-row">
        <DynamicField
          v-for="child in field.children"
          :key="child.name"
          :field="child"
          :path-prefix="`${fullPath}[${index}]`"
        />
        <button
          type="button"
          :disabled="field.min != null && fields.length <= field.min"
          @click="remove(index)"
        >
          Remove
        </button>
      </div>

      <button
        type="button"
        :disabled="field.max != null && fields.length >= field.max"
        @click="push(defaultRow)"
      >
        Add
      </button>
    </div>
  </FieldArray>
</template>
