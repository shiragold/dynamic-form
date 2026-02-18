# Dynamic Form — Implementation Plan

Schema-driven dynamic form built with Vue 3, vee-validate, and Zod.

Given a static JSON schema of fields, the `DynamicForm` component renders a full form with validation, accessibility, and support for custom field components via scoped slots.

## Dependencies

```bash
pnpm add vee-validate @vee-validate/zod zod
pnpm add -D @vitest/browser @testing-library/vue playwright
```

Remove `jsdom` after migrating tests.

---

## File Structure

```
src/components/dynamic-form/
├── types.ts                 # Schema type definitions + JSON Schema validation types
├── json-schema-to-zod.ts    # Converts field schema (with JSON Schema keywords) → Zod object
├── component-resolver.ts    # Maps field → Vue component (built-in or slot-derived)
├── DynamicForm.vue          # Top-level <form>, owns useForm(), provides context
├── DynamicField.vue         # Recursive field renderer (switches on type)
├── DynamicList.vue          # FieldArray wrapper for list fields
├── FieldWrapper.vue         # Shared label + error + ARIA wrapper
└── fields/
    ├── TextField.vue        # text, email, password, url, tel
    ├── NumberField.vue
    ├── TextareaField.vue
    ├── SelectField.vue
    └── CheckboxField.vue

src/components/dynamic-form/__tests__/
├── json-schema-to-zod.spec.ts
├── DynamicForm.spec.ts
└── DynamicField.spec.ts
```

---

## Phase 1: Types and Utilities

### 1. `types.ts` — Schema Definitions

A discriminated union on `type`. Every field is JSON-serializable (no Zod types in the schema).

```typescript
import type { Component } from 'vue'

// JSON Schema validation keywords (subset relevant to forms)
export interface JsonSchemaValidation {
  type?: 'string' | 'number' | 'integer' | 'boolean'
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: 'email' | 'url' | 'uuid' | 'date' | string
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  enum?: (string | number)[]
  const?: unknown
  // arrays (for list fields)
  minItems?: number
  maxItems?: number
}

interface BaseField {
  name: string
  label: string
  required?: boolean
  validation?: JsonSchemaValidation
  // Explicit component override (programmatic, takes highest priority)
  component?: string | Component
}

export interface TextField extends BaseField {
  type: 'text' | 'email' | 'password' | 'url' | 'tel'
  placeholder?: string
  defaultValue?: string
}

export interface NumberField extends BaseField {
  type: 'number'
  min?: number
  max?: number
  step?: number
  defaultValue?: number
}

export interface TextareaField extends BaseField {
  type: 'textarea'
  placeholder?: string
  rows?: number
  defaultValue?: string
}

export interface SelectField extends BaseField {
  type: 'select'
  options: { label: string; value: string | number }[]
  placeholder?: string
  defaultValue?: string | number
}

export interface CheckboxField extends BaseField {
  type: 'checkbox'
  defaultValue?: boolean
}

export interface SectionField {
  type: 'section'
  name: string
  label: string
  children: FieldSchema[]
}

export interface ListField {
  type: 'list'
  name: string
  label: string
  children: FieldSchema[] // template for each row
  min?: number
  max?: number
  defaultValue?: Record<string, unknown>[]
}

export type FieldSchema =
  | TextField
  | NumberField
  | TextareaField
  | SelectField
  | CheckboxField
  | SectionField
  | ListField

// Provided by DynamicForm, injected by DynamicField
export interface DynamicFormContext {
  submitted: Readonly<Ref<boolean>>
  resolveComponent: (field: FieldSchema) => Component
}

export const FORM_CONTEXT: InjectionKey<DynamicFormContext> = Symbol('DynamicFormContext')
```

### 2. `json-schema-to-zod.ts` — JSON Schema → Zod Conversion

A recursive function that walks the field schema tree and builds a Zod object schema. Called in `DynamicForm.vue`'s `setup()` as a `computed`.

**Mapping table:**

| JSON Schema keyword | Zod equivalent |
|---|---|
| `type: "string"` | `z.string()` |
| `type: "number"` | `z.number()` |
| `type: "integer"` | `z.number().int()` |
| `type: "boolean"` | `z.boolean()` |
| `minLength: n` | `.min(n)` |
| `maxLength: n` | `.max(n)` |
| `pattern: "..."` | `.regex(new RegExp(...))` |
| `format: "email"` | `.email()` |
| `format: "url"` | `.url()` |
| `format: "uuid"` | `.uuid()` |
| `minimum: n` | `.min(n)` |
| `maximum: n` | `.max(n)` |
| `exclusiveMinimum: n` | `.gt(n)` |
| `exclusiveMaximum: n` | `.lt(n)` |
| `multipleOf: n` | `.multipleOf(n)` |
| `enum: [...]` | `z.enum([...])` |
| `required: true` on field | field is NOT wrapped in `.optional()` |
| section `children` | `z.object({ ... })` (recurse) |
| list `children` | `z.array(z.object({ ... }))` |
| `minItems: n` | `.min(n)` on the array |
| `maxItems: n` | `.max(n)` on the array |

**Logic:**

```typescript
import { z, type ZodTypeAny } from 'zod'
import type { FieldSchema } from './types'

export function jsonSchemaToZod(fields: FieldSchema[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {}

  for (const field of fields) {
    if (field.type === 'section') {
      shape[field.name] = jsonSchemaToZod(field.children)
      continue
    }

    if (field.type === 'list') {
      let itemSchema = jsonSchemaToZod(field.children)
      let arraySchema = z.array(itemSchema)
      if (field.min != null) arraySchema = arraySchema.min(field.min)
      if (field.max != null) arraySchema = arraySchema.max(field.max)
      shape[field.name] = arraySchema
      continue
    }

    let zodType = buildZodType(field)
    if (!field.required) {
      zodType = zodType.optional()
    }
    shape[field.name] = zodType
  }

  return z.object(shape)
}

function buildZodType(field: FieldSchema & { validation?: JsonSchemaValidation }): ZodTypeAny {
  // 1. Infer base type from field.type or field.validation.type
  // 2. Chain JSON Schema keyword methods (.min, .max, .email, .regex, etc.)
  // 3. Return the composed Zod type
  // ~60-100 lines for the common keywords
}
```

If a field has no `validation` and no `required`, infer a sensible default from `field.type` (text → `z.string().optional()`, checkbox → `z.boolean().optional()`, etc.).

Hand-rolled is preferred over a library because:
- The full JSON Schema spec has features irrelevant to forms (`$ref`, `allOf`, conditionals).
- Full control over Zod error messages.
- No extra dependency.

### 3. `component-resolver.ts` — Field → Component Mapping

Takes a slot-derived component registry (built by `DynamicForm` from its scoped slots) and the built-in component map. Returns a resolver function.

```typescript
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
  return (field) => {
    // Priority 1: explicit field.component override
    if ('component' in field && field.component) {
      return field.component as Component
    }
    // Priority 2: slot-derived override by field name (#field:{name})
    if (field.name in slotRegistry) {
      return slotRegistry[field.name]
    }
    // Priority 3: built-in default by field.type
    return builtInMap[field.type]
  }
}
```

Resolution priority:
1. `field.component` — explicit per-field override in the schema (programmatic).
2. Slot `#field:{name}` — template-level override (converted to component by `DynamicForm`).
3. Built-in default by `field.type`.

---

## Phase 2: Built-in Field Components

### 4. `FieldWrapper.vue` — Label + Error + ARIA Wrapper

Every leaf field (built-in or custom) renders inside this wrapper. It handles label association, error display, and ARIA.

**Props:**
- `name: string` — used to derive `id` and `aria-describedby` target
- `label: string`
- `error: string | undefined`
- `submitted: boolean`

**Template:**

```vue
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
```

The slot receives the actual input control. The input itself gets `:id`, `:aria-describedby`, and `:aria-invalid` bound by `DynamicField` (not by the wrapper), keeping the wrapper simple and the input bindings explicit.

### 5–9. Individual Field Components

Each is a thin component that:
- Accepts `modelValue` + type-specific props (`placeholder`, `options`, `min`, `rows`, etc.).
- Emits `update:modelValue`.
- Renders a single native `<input>`, `<select>`, or `<textarea>`.
- Receives `id`, `aria-describedby`, and `aria-invalid` as pass-through attributes via `inheritAttrs: true` (default).

These components are intentionally minimal — just the control element, no label or error.

**Custom component contract:** Any custom component used via slots or `field.component` must follow the same interface: accept `modelValue`, emit `update:modelValue`, and let `id`/`aria-*` attrs pass through. It does NOT need to handle validation — vee-validate applies validation at the `<Field>` level.

---

## Phase 3: Core Rendering Components

### 10. `DynamicField.vue` — Recursive Field Renderer

Receives `field: FieldSchema` prop and optional `pathPrefix: string` (for nesting).

Injects `FORM_CONTEXT` to get `submitted` and `resolveComponent`.

**Rendering logic by type:**

**`section`** — renders a `<fieldset>` with `<legend>`, loops `field.children` rendering `<DynamicField>` for each. Passes `pathPrefix` as `${parentPath}.${field.name}` (or just `field.name` at top level). No `<Field>` from vee-validate — sections don't own a value.

**`list`** — delegates to `<DynamicList>`.

**Everything else (leaf)** — uses vee-validate's `<Field>` with `v-slot`:

```vue
<Field :name="fullPath" v-slot="{ value, handleChange, handleBlur, errorMessage }">
  <FieldWrapper
    :name="fullPath"
    :label="field.label"
    :error="errorMessage"
    :submitted="submitted"
  >
    <component
      :is="resolvedComponent"
      :model-value="value"
      @update:model-value="handleChange"
      @blur="handleBlur"
      :id="`field-${fullPath}`"
      :aria-describedby="submitted && errorMessage ? `field-${fullPath}-error` : undefined"
      :aria-invalid="submitted && !!errorMessage"
      v-bind="fieldProps"
    />
    <!-- fieldProps = type-specific: placeholder, options, min, rows, etc. -->
  </FieldWrapper>
</Field>
```

### 11. `DynamicList.vue` — FieldArray Wrapper

Receives `field: ListField` and `pathPrefix: string`.

Uses vee-validate's `<FieldArray :name="fullPath">` with scoped slot `{ fields, push, remove }`:

- Iterates `fields` — each entry renders a group of `<DynamicField>` for `field.children`, with `pathPrefix` set to `${fullPath}[${index}]`.
- "Add" button calls `push(defaultRowValue)` (derived from children's defaults).
- "Remove" button per row calls `remove(index)`.
- Respects `field.min` / `field.max` to conditionally disable add/remove buttons.
- Container gets a label and `role="group"` with `aria-label` for accessibility.

### 12. `DynamicForm.vue` — Top-level Form

**Props:**
- `schema: FieldSchema[]` — the field definitions
- `initialValues?: Record<string, unknown>` — optional pre-fill

**Emits:**
- `submit` — with validated values

**Slots:**
- `#field:{fieldName}` — scoped slot to override the component for a specific field
- `#actions` — override the submit button area (default: a submit button)

**Setup:**

```typescript
import { computed, provide, ref, readonly, defineComponent, useSlots } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { jsonSchemaToZod } from './json-schema-to-zod'
import { createComponentResolver } from './component-resolver'
import { FORM_CONTEXT } from './types'
import type { Component } from 'vue'

// 1. Convert slots to component registry
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

// 2. Build Zod schema from field schema
const zodSchema = computed(() => jsonSchemaToZod(props.schema))

// 3. Set up vee-validate form
const { handleSubmit } = useForm({
  validationSchema: computed(() => toTypedSchema(zodSchema.value)),
  initialValues: props.initialValues,
})

// 4. Submit-then-live validation state
const submitted = ref(false)

// 5. Build component resolver
const resolveComponent = computed(() => createComponentResolver(slotComponents.value))

// 6. Provide context to DynamicField (recursive)
provide(FORM_CONTEXT, {
  submitted: readonly(submitted),
  resolveComponent: (field) => resolveComponent.value(field),
})

// 7. Handle submit
const onSubmit = handleSubmit(
  (values) => {
    submitted.value = true
    emit('submit', values)
  },
  () => {
    submitted.value = true // show errors after first attempt
  },
)
```

**Validation flow:**
1. vee-validate always validates internally on every change.
2. Before the first submit, `submitted` is `false` — errors exist in state but are not displayed.
3. User clicks submit → `submitted` becomes `true`.
4. If validation fails, errors are now visible (gated by `submitted` in `FieldWrapper`).
5. On every subsequent change, vee-validate re-validates automatically. Since `submitted` is `true`, error fixes/additions are reflected immediately.

**Template:**

```vue
<form @submit.prevent="onSubmit" novalidate>
  <DynamicField
    v-for="field in schema"
    :key="field.name"
    :field="field"
  />
  <slot name="actions">
    <button type="submit">Submit</button>
  </slot>
</form>
```

---

## Custom Components via Slots

### Consumer Usage

```vue
<DynamicForm :schema="schema" @submit="handleSubmit">
  <template #field:rating="{ modelValue, 'onUpdate:modelValue': onUpdate, id, ariaDescribedby, ariaInvalid }">
    <StarRating
      :model-value="modelValue"
      @update:model-value="onUpdate"
      :id="id"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="ariaInvalid"
    />
  </template>
</DynamicForm>
```

### How It Works

`DynamicForm` collects all slots prefixed with `field:` and wraps each in a tiny component (via `defineComponent`) that calls the slot function with the bound attrs as scoped props. These wrapper components are fed into the component resolver via `slotComponents`.

`DynamicField` never touches slots directly — it asks the resolver for a component and gets one back. This keeps the recursive rendering code clean.

The `FieldWrapper` still wraps slot content, so label and error display are consistent for all fields (built-in and custom). The slot replaces only the **input control**, not the label or error.

### Custom Component Validation

Custom components don't handle validation. The field's `validation` property (JSON Schema keywords) is converted to Zod by `jsonSchemaToZod`. vee-validate applies validation at the `<Field>` level, which wraps whatever component is rendered. The custom component just needs to support `modelValue` / `update:modelValue` and pass through `id` / `aria-*` attrs.

---

## Phase 4: Tests

### Test Setup

Switch from jsdom to vitest-browser with Playwright. Update `vitest.config.ts`:

```typescript
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      browser: {
        enabled: true,
        provider: 'playwright',
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
)
```

Tests use `@testing-library/vue` for rendering and `@vitest/browser/context` for browser-native interactions. Queries use accessible selectors (`getByRole`, `getByLabelText`, `getByText`) which directly validate the ARIA semantics.

### 13. `json-schema-to-zod.spec.ts`

Pure function tests — no DOM:

- Flat schema with text + number fields → correct Zod shape, validates/rejects as expected.
- Field with explicit `validation` keywords (minLength, format, pattern) → applied correctly.
- Field with `required: true` → not optional in Zod.
- Field without `required` → optional in Zod.
- Section → nested `z.object`.
- List → `z.array(z.object(...))` with min/max from `minItems`/`maxItems`.
- Unknown/missing validation → sensible defaults based on `field.type`.

### 14. `DynamicForm.spec.ts`

Integration-style tests with real browser rendering:

- Renders correct inputs for a multi-field schema (query by role and label).
- No errors shown before submit.
- Click submit with invalid data → errors appear under correct fields with `role="alert"`.
- Fix a field → its error clears immediately (live re-validation after submit).
- Submit with valid data → emits `submit` with correct values.
- Custom component via slot `#field:{name}` → custom component renders for the target field.
- Custom component via `field.component` → overrides slot.
- List field: add/remove rows works, validation applies per-row.
- Section field: renders `<fieldset>` with `<legend>`, children nested correctly.

### 15. `DynamicField.spec.ts`

Focused tests on recursive rendering and accessibility:

- Section renders `<fieldset>` + `<legend>` + children.
- Leaf field renders the resolved component inside `FieldWrapper`.
- `label[for]` matches `input[id]`.
- `aria-describedby` matches error span `id`.
- `aria-invalid` is `true` when error is shown, absent/false otherwise.
- Error span has `role="alert"`.

---

## Phase 5: Demo

Update `HomeView.vue` with a sample schema that exercises every feature:

- Text, email, number, select, checkbox fields
- A section (e.g., "Address" with street, city, zip)
- A list (e.g., "Phone numbers" with type + number per row)
- A field using a custom slot component
- Validation rules (required, minLength, format, min/max)

---

## Implementation Order

| Step | Files | Rationale |
|---|---|---|
| 1 | Install dependencies, update vitest config | Foundation |
| 2 | `types.ts` | Everything depends on schema types |
| 3 | `json-schema-to-zod.ts` + `json-schema-to-zod.spec.ts` | Pure logic, testable in isolation |
| 4 | `component-resolver.ts` | Pure logic, no DOM |
| 5 | `FieldWrapper.vue` | Needed by all leaf fields |
| 6 | `fields/*.vue` (all five) | Simple, independent of each other |
| 7 | `DynamicField.vue` | Depends on wrapper + fields + resolver |
| 8 | `DynamicList.vue` | Depends on DynamicField for child rendering |
| 9 | `DynamicForm.vue` | Top-level orchestrator, depends on everything above |
| 10 | `DynamicForm.spec.ts` + `DynamicField.spec.ts` | Verify the assembled system |
| 11 | `HomeView.vue` demo | Visual verification |
| 12 | `pnpm run build && pnpm test:unit && pnpm lint` | Final validation per project rules |
