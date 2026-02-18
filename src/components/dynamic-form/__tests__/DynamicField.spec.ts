import { describe, it, expect } from 'vitest'
import { render, within, waitFor } from '@testing-library/vue'
import { userEvent } from 'vitest/browser'
import DynamicForm from '../DynamicForm.vue'
import type { FieldSchema } from '../types'

describe('DynamicField', () => {
  it('section renders fieldset with legend and children', () => {
    const schema: FieldSchema[] = [
      {
        type: 'section',
        name: 'info',
        label: 'Info Section',
        children: [
          { type: 'text', name: 'first', label: 'First Name', required: true },
          { type: 'text', name: 'last', label: 'Last Name', required: true },
        ],
      },
    ]

    const { container } = render(DynamicForm, { props: { schema } })
    const scope = within(container)
    const fieldset = scope.getByRole('group')
    expect(fieldset.tagName).toBe('FIELDSET')
    expect(within(fieldset).getByText('Info Section')).toBeTruthy()
    expect(within(fieldset).getByRole('textbox', { name: 'First Name' })).toBeTruthy()
    expect(within(fieldset).getByRole('textbox', { name: 'Last Name' })).toBeTruthy()
  })

  it('label[for] matches input[id]', () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'username', label: 'Username', required: true },
    ]

    const { container } = render(DynamicForm, { props: { schema } })
    const label = container.querySelector('label[for="field-username"]')
    const input = container.querySelector('#field-username')
    expect(label).toBeTruthy()
    expect(input).toBeTruthy()
  })

  it('aria-describedby matches error span id when error is shown', async () => {
    const schema: FieldSchema[] = [
      {
        type: 'text',
        name: 'req_field',
        label: 'Required',
        required: true,
        validation: { minLength: 1 },
      },
    ]

    const { container } = render(DynamicForm, { props: { schema } })
    const scope = within(container)
    await userEvent.click(scope.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      const errorSpan = container.querySelector('#field-req_field-error')
      expect(errorSpan).toBeTruthy()
      expect(errorSpan?.getAttribute('role')).toBe('alert')
      const input = container.querySelector('#field-req_field') as HTMLInputElement
      expect(input?.getAttribute('aria-describedby')).toBe('field-req_field-error')
    })
  })

  it('aria-invalid is true when error is shown, false otherwise', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'val_field', label: 'Val', required: true },
    ]

    const { container } = render(DynamicForm, { props: { schema } })
    const scope = within(container)
    const input = scope.getByRole('textbox', { name: 'Val' })

    expect(input.getAttribute('aria-invalid')).toBe('false')

    await userEvent.click(scope.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(input.getAttribute('aria-invalid')).toBe('true')
    })

    await userEvent.fill(input, 'something')

    await waitFor(() => {
      expect(input.getAttribute('aria-invalid')).toBe('false')
    })
  })

  it('error span has role="alert"', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'alert_field', label: 'Alert Test', required: true },
    ]

    const { container } = render(DynamicForm, { props: { schema } })
    const scope = within(container)
    await userEvent.click(scope.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      const alert = container.querySelector('[role="alert"]')
      expect(alert).toBeTruthy()
    })
  })
})
