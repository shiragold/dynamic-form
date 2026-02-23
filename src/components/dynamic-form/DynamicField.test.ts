import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-vue'
import DynamicForm from './DynamicForm.vue'
import type { FieldSchema } from './types'

describe('DynamicField', () => {
  it('section renders fieldset with legend and children', async () => {
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

    const screen = render(DynamicForm, { props: { schema } })
    const fieldset = screen.getByRole('group')
    await expect.element(fieldset).toBeVisible()
    expect(fieldset.element().tagName).toBe('FIELDSET')
    await expect.element(fieldset.getByText('Info Section')).toBeVisible()
    await expect.element(fieldset.getByRole('textbox', { name: 'First Name' })).toBeVisible()
    await expect.element(fieldset.getByRole('textbox', { name: 'Last Name' })).toBeVisible()
  })

  it('label[for] matches input[id]', async () => {
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

    const screen = render(DynamicForm, { props: { schema } })
    await screen.getByRole('button', { name: 'Submit' }).click()

    const errorSpan = screen.getByRole('alert')
    await expect.element(errorSpan).toBeVisible()

    const input = screen.getByRole('textbox', { name: 'Required' })
    await expect.element(input).toHaveAttribute('aria-describedby', 'field-req_field-error')
  })

  it('aria-invalid is true when error is shown, false otherwise', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'val_field', label: 'Val', required: true },
    ]

    const screen = render(DynamicForm, { props: { schema } })
    const input = screen.getByRole('textbox', { name: 'Val' })

    await expect.element(input).toHaveAttribute('aria-invalid', 'false')

    await screen.getByRole('button', { name: 'Submit' }).click()

    await expect.element(input).toHaveAttribute('aria-invalid', 'true')

    await input.fill('something')

    await expect.element(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('error span has role="alert"', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'alert_field', label: 'Alert Test', required: true },
    ]

    const screen = render(DynamicForm, { props: { schema } })
    await screen.getByRole('button', { name: 'Submit' }).click()

    await expect.element(screen.getByRole('alert')).toBeVisible()
  })
})
