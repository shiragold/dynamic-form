import { describe, it, expect } from 'vitest'
import { jsonSchemaToZod } from './json-schema-to-zod'
import type { FieldSchema } from './types'

describe('jsonSchemaToZod', () => {
  it('creates a flat schema with text and number fields', () => {
    const fields: FieldSchema[] = [
      { type: 'text', name: 'name', label: 'Name', required: true },
      { type: 'number', name: 'age', label: 'Age', required: true },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({ name: 'Alice', age: 30 })).toEqual({ name: 'Alice', age: 30 })
    expect(() => schema.parse({ name: 123, age: 'foo' })).toThrow()
  })

  it('applies minLength and format validation keywords', () => {
    const fields: FieldSchema[] = [
      {
        type: 'email',
        name: 'email',
        label: 'Email',
        required: true,
        validation: { minLength: 5, format: 'email' },
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(() => schema.parse({ email: 'a@b' })).toThrow()
    expect(schema.parse({ email: 'user@example.com' })).toEqual({ email: 'user@example.com' })
  })

  it('applies pattern validation', () => {
    const fields: FieldSchema[] = [
      {
        type: 'text',
        name: 'code',
        label: 'Code',
        required: true,
        validation: { pattern: '^[A-Z]{3}$' },
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({ code: 'ABC' })).toEqual({ code: 'ABC' })
    expect(() => schema.parse({ code: 'abc' })).toThrow()
    expect(() => schema.parse({ code: 'ABCD' })).toThrow()
  })

  it('marks required fields as non-optional', () => {
    const fields: FieldSchema[] = [
      { type: 'text', name: 'name', label: 'Name', required: true },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(() => schema.parse({})).toThrow()
    expect(schema.parse({ name: 'Alice' })).toEqual({ name: 'Alice' })
  })

  it('marks fields without required as optional', () => {
    const fields: FieldSchema[] = [
      { type: 'text', name: 'nickname', label: 'Nickname' },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({})).toEqual({})
    expect(schema.parse({ nickname: 'Al' })).toEqual({ nickname: 'Al' })
  })

  it('creates nested z.object for section fields', () => {
    const fields: FieldSchema[] = [
      {
        type: 'section',
        name: 'address',
        label: 'Address',
        children: [
          { type: 'text', name: 'street', label: 'Street', required: true },
          { type: 'text', name: 'city', label: 'City', required: true },
        ],
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({ address: { street: '123 Main', city: 'NYC' } })).toEqual({
      address: { street: '123 Main', city: 'NYC' },
    })
    expect(() => schema.parse({ address: { street: '123 Main' } })).toThrow()
  })

  it('creates z.array(z.object) for list fields with min/max', () => {
    const fields: FieldSchema[] = [
      {
        type: 'list',
        name: 'phones',
        label: 'Phones',
        min: 1,
        max: 3,
        children: [
          { type: 'text', name: 'number', label: 'Number', required: true },
        ],
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(() => schema.parse({ phones: [] })).toThrow()
    expect(schema.parse({ phones: [{ number: '555-1234' }] })).toEqual({
      phones: [{ number: '555-1234' }],
    })
    expect(() =>
      schema.parse({
        phones: [
          { number: '1' },
          { number: '2' },
          { number: '3' },
          { number: '4' },
        ],
      }),
    ).toThrow()
  })

  it('applies number constraints: minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf', () => {
    const fields: FieldSchema[] = [
      {
        type: 'number',
        name: 'score',
        label: 'Score',
        required: true,
        validation: { minimum: 0, maximum: 100, multipleOf: 5 },
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({ score: 50 })).toEqual({ score: 50 })
    expect(() => schema.parse({ score: -1 })).toThrow()
    expect(() => schema.parse({ score: 101 })).toThrow()
    expect(() => schema.parse({ score: 7 })).toThrow()
  })

  it('handles integer validation type', () => {
    const fields: FieldSchema[] = [
      {
        type: 'number',
        name: 'count',
        label: 'Count',
        required: true,
        validation: { type: 'integer' },
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({ count: 5 })).toEqual({ count: 5 })
    expect(() => schema.parse({ count: 5.5 })).toThrow()
  })

  it('handles enum validation', () => {
    const fields: FieldSchema[] = [
      {
        type: 'select',
        name: 'color',
        label: 'Color',
        required: true,
        options: [
          { label: 'Red', value: 'red' },
          { label: 'Blue', value: 'blue' },
        ],
        validation: { enum: ['red', 'blue'] },
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({ color: 'red' })).toEqual({ color: 'red' })
    expect(() => schema.parse({ color: 'green' })).toThrow()
  })

  it('uses sensible defaults when no validation is provided', () => {
    const fields: FieldSchema[] = [
      { type: 'text', name: 'a', label: 'A' },
      { type: 'number', name: 'b', label: 'B' },
      { type: 'checkbox', name: 'c', label: 'C' },
      { type: 'textarea', name: 'd', label: 'D' },
      { type: 'select', name: 'e', label: 'E', options: [] },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({})).toEqual({})
    expect(schema.parse({ a: 'hello', b: 42, c: true, d: 'text', e: 'val' })).toEqual({
      a: 'hello',
      b: 42,
      c: true,
      d: 'text',
      e: 'val',
    })
  })

  it('applies maxLength string constraint', () => {
    const fields: FieldSchema[] = [
      {
        type: 'text',
        name: 'bio',
        label: 'Bio',
        required: true,
        validation: { maxLength: 10 },
      },
    ]
    const schema = jsonSchemaToZod(fields)

    expect(schema.parse({ bio: 'short' })).toEqual({ bio: 'short' })
    expect(() => schema.parse({ bio: 'this is way too long' })).toThrow()
  })
})
