<script setup lang="ts">
import { h, ref } from 'vue'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'
import type { FieldSchema } from '@/components/dynamic-form/types'

const schema: FieldSchema[] = [
  {
    type: 'text',
    name: 'name',
    label: 'Full Name',
    required: true,
    placeholder: 'Jane Doe',
    validation: { minLength: 2 },
  },
  {
    type: 'email',
    name: 'email',
    label: 'Email',
    required: true,
    placeholder: 'jane@example.com',
    validation: { format: 'email' },
  },
  {
    type: 'number',
    name: 'age',
    label: 'Age',
    required: true,
    min: 0,
    max: 150,
    validation: { minimum: 0, maximum: 150 },
  },
  {
    type: 'select',
    name: 'role',
    label: 'Role',
    required: true,
    placeholder: 'Select a role...',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'Editor', value: 'editor' },
      { label: 'Viewer', value: 'viewer' },
    ],
    validation: { enum: ['admin', 'editor', 'viewer'] },
  },
  {
    type: 'section',
    name: 'address',
    label: 'Address',
    children: [
      {
        type: 'text',
        name: 'street',
        label: 'Street',
        required: true,
        placeholder: '123 Main St',
      },
      {
        type: 'text',
        name: 'city',
        label: 'City',
        required: true,
        placeholder: 'New York',
      },
      {
        type: 'text',
        name: 'zip',
        label: 'ZIP Code',
        required: true,
        placeholder: '10001',
        validation: { pattern: '^\\d{5}$' },
      },
    ],
  },
  {
    type: 'list',
    name: 'phones',
    label: 'Phone Numbers',
    min: 1,
    max: 3,
    children: [
      {
        type: 'select',
        name: 'type',
        label: 'Type',
        required: true,
        options: [
          { label: 'Home', value: 'home' },
          { label: 'Work', value: 'work' },
          { label: 'Mobile', value: 'mobile' },
        ],
      },
      {
        type: 'text',
        name: 'number',
        label: 'Number',
        required: true,
        placeholder: '555-1234',
        validation: { minLength: 7 },
      },
    ],
  },
  {
    type: 'textarea',
    name: 'bio',
    label: 'Bio',
    placeholder: 'Tell us about yourself...',
    rows: 4,
    validation: { maxLength: 500 },
  },
  {
    type: 'number',
    name: 'rating',
    label: 'Rating (custom)',
    required: true,
    validation: { minimum: 1, maximum: 5 },
  },
  {
    type: 'checkbox',
    name: 'agree',
    label: 'I agree to the terms',
  },
]

const submittedValues = ref<Record<string, unknown> | null>(null)

function handleSubmit(values: Record<string, unknown>) {
  submittedValues.value = values
}

function StarRating(props: Record<string, unknown>) {
  const value = (props.modelValue as number) ?? 0
  const onUpdate = props['onUpdate:modelValue'] as (v: number) => void
  return h('div', {
    id: props.id,
    'aria-describedby': props['aria-describedby'] ?? props.ariaDescribedby,
    'aria-invalid': props['aria-invalid'] ?? props.ariaInvalid,
    style: 'display: flex; gap: 4px; cursor: pointer;',
  }, [1, 2, 3, 4, 5].map((n) =>
    h('span', {
      style: `font-size: 1.5rem; ${n <= value ? 'color: gold;' : 'color: #ccc;'}`,
      onClick: () => onUpdate(n),
    }, '\u2605'),
  ))
}
</script>

<template>
  <div class="home">
    <h1>Dynamic Form</h1>

    <DynamicForm :schema="schema" @submit="handleSubmit">
      <template #field:rating="slotProps">
        <StarRating v-bind="slotProps" />
      </template>
    </DynamicForm>

    <pre v-if="submittedValues" class="output">{{ JSON.stringify(submittedValues, null, 2) }}</pre>
  </div>
</template>

<style scoped>
.home {
  max-width: 600px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}

.output {
  margin-top: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 0.875rem;
  overflow-x: auto;
}
</style>
