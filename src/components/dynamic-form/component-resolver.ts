import type { Component } from 'vue'
import type { FieldSchema } from './types'
import TextField from './fields/TextField.vue'
import NumberField from './fields/NumberField.vue'
import TextareaField from './fields/TextareaField.vue'
import SelectField from './fields/SelectField.vue'
import CheckboxField from './fields/CheckboxField.vue'

const builtInMap: Record<string, Component> = {
  text: TextField,
  email: TextField,
  password: TextField,
  url: TextField,
  tel: TextField,
  number: NumberField,
  textarea: TextareaField,
  select: SelectField,
  checkbox: CheckboxField,
}

export function createComponentResolver(
  slotRegistry: Record<string, Component>,
): (field: FieldSchema) => Component {
  return (field): Component => {
    if ('component' in field && field.component) {
      return field.component as Component
    }
    if (field.name in slotRegistry) {
      return slotRegistry[field.name]!
    }
    return builtInMap[field.type] ?? TextField
  }
}
