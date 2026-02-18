import type { Component, InjectionKey, Ref } from 'vue'

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
  minItems?: number
  maxItems?: number
}

interface BaseField {
  name: string
  label: string
  required?: boolean
  validation?: JsonSchemaValidation
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
  children: FieldSchema[]
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

export interface DynamicFormContext {
  submitted: Readonly<Ref<boolean>>
  resolveComponent: (field: FieldSchema) => Component
}

export const FORM_CONTEXT: InjectionKey<DynamicFormContext> = Symbol('DynamicFormContext')
