import { z, type ZodTypeAny } from 'zod'
import type { FieldSchema, JsonSchemaValidation } from './types'

export function jsonSchemaToZod(fields: FieldSchema[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {}

  for (const field of fields) {
    if (field.type === 'section') {
      shape[field.name] = jsonSchemaToZod(field.children)
      continue
    }

    if (field.type === 'list') {
      const itemSchema = jsonSchemaToZod(field.children)
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

function buildZodType(field: Exclude<FieldSchema, { type: 'section' | 'list' }>): ZodTypeAny {
  const v = field.validation

  if (v?.enum && v.enum.length > 0) {
    const values = v.enum
    if (values.every((val): val is string => typeof val === 'string')) {
      return z.enum(values as [string, ...string[]])
    }
    return z.union(
      values.map((val) => z.literal(val)) as [
        z.ZodLiteral<string | number>,
        z.ZodLiteral<string | number>,
        ...z.ZodLiteral<string | number>[],
      ],
    )
  }

  const baseType = v?.type ?? inferBaseType(field.type)

  switch (baseType) {
    case 'string':
      return applyStringConstraints(z.string(), v)
    case 'number':
      return applyNumberConstraints(z.number(), v)
    case 'integer':
      return applyNumberConstraints(z.number().int(), v)
    case 'boolean':
      return z.boolean()
    default:
      return applyStringConstraints(z.string(), v)
  }
}

function inferBaseType(
  fieldType: string,
): 'string' | 'number' | 'integer' | 'boolean' {
  switch (fieldType) {
    case 'number':
      return 'number'
    case 'checkbox':
      return 'boolean'
    default:
      return 'string'
  }
}

function applyStringConstraints(schema: z.ZodString, v?: JsonSchemaValidation): z.ZodString {
  if (!v) return schema
  if (v.minLength != null) schema = schema.min(v.minLength)
  if (v.maxLength != null) schema = schema.max(v.maxLength)
  if (v.pattern) schema = schema.regex(new RegExp(v.pattern))

  if (v.format) {
    switch (v.format) {
      case 'email':
        schema = schema.email()
        break
      case 'url':
        schema = schema.url()
        break
      case 'uuid':
        schema = schema.uuid()
        break
    }
  }

  return schema
}

function applyNumberConstraints(schema: z.ZodNumber, v?: JsonSchemaValidation): z.ZodNumber {
  if (!v) return schema
  if (v.minimum != null) schema = schema.min(v.minimum)
  if (v.maximum != null) schema = schema.max(v.maximum)
  if (v.exclusiveMinimum != null) schema = schema.gt(v.exclusiveMinimum)
  if (v.exclusiveMaximum != null) schema = schema.lt(v.exclusiveMaximum)
  if (v.multipleOf != null) schema = schema.multipleOf(v.multipleOf)
  return schema
}
