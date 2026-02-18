import { describe, it, expect, vi } from 'vitest'
import { render, within, waitFor } from '@testing-library/vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import DynamicForm from '../DynamicForm.vue'
import type { FieldSchema } from '../types'

function renderForm(schema: FieldSchema[], options: Record<string, unknown> = {}) {
  return render(DynamicForm, {
    props: { schema, ...options },
  })
}

describe('DynamicForm', () => {
  it('renders correct inputs for a multi-field schema', () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'name', label: 'Name', required: true },
      { type: 'email', name: 'email', label: 'Email', required: true },
      { type: 'number', name: 'age', label: 'Age' },
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ],
      },
      { type: 'checkbox', name: 'agree', label: 'Agree' },
    ]

    const { container } = renderForm(schema)
    const scope = within(container)

    expect(scope.getByRole('textbox', { name: 'Name' })).toBeTruthy()
    expect(scope.getByRole('textbox', { name: 'Email' })).toBeTruthy()
    expect(scope.getByRole('spinbutton', { name: 'Age' })).toBeTruthy()
    expect(scope.getByRole('combobox', { name: 'Role' })).toBeTruthy()
    expect(scope.getByRole('checkbox', { name: 'Agree' })).toBeTruthy()
  })

  it('shows no errors before submit', () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'fname', label: 'First Name', required: true },
    ]

    const { container } = renderForm(schema)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('shows errors after submit with invalid data', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'fullname', label: 'Full Name', required: true },
      {
        type: 'email',
        name: 'mail',
        label: 'Mail',
        required: true,
        validation: { format: 'email' },
      },
    ]

    const { container } = renderForm(schema)
    const scope = within(container)
    await userEvent.click(scope.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      const alerts = container.querySelectorAll('[role="alert"]')
      expect(alerts.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('clears error when field is fixed after submit', async () => {
    const schema: FieldSchema[] = [
      {
        type: 'text',
        name: 'nickname',
        label: 'Nickname',
        required: true,
        validation: { minLength: 2 },
      },
    ]

    const { container } = renderForm(schema)
    const scope = within(container)
    await userEvent.click(scope.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')).toBeTruthy()
    })

    const input = scope.getByRole('textbox', { name: 'Nickname' })
    await userEvent.fill(input, 'Alice')

    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')).toBeNull()
    })
  })

  it('emits submit with valid data', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'person', label: 'Person', required: true },
    ]

    const onSubmit = vi.fn()
    const { container } = render(DynamicForm, {
      props: { schema, onSubmit },
    })
    const scope = within(container)

    await userEvent.fill(scope.getByRole('textbox', { name: 'Person' }), 'Alice')
    await userEvent.click(scope.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ person: 'Alice' })
    })
  })

  it('renders a custom component via slot #field:{name}', () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'custom', label: 'Custom Field', required: true },
    ]

    const { container } = render(DynamicForm, {
      props: { schema },
      slots: {
        'field:custom': (props: Record<string, unknown>) =>
          h('div', { 'data-testid': 'custom-slot', ...props }, 'Custom!'),
      },
    })

    expect(within(container).getByTestId('custom-slot')).toBeTruthy()
  })

  it('renders a custom component via field.component override', () => {
    const CustomInput = defineComponent({
      props: { modelValue: String },
      emits: ['update:modelValue'],
      setup(props) {
        return () => h('input', { 'data-testid': 'component-override', value: props.modelValue })
      },
    })

    const schema: FieldSchema[] = [
      {
        type: 'text',
        name: 'overridden',
        label: 'Overridden',
        required: true,
        component: CustomInput,
      },
    ]

    const { container } = renderForm(schema)
    expect(within(container).getByTestId('component-override')).toBeTruthy()
  })

  it('renders section with fieldset and legend', () => {
    const schema: FieldSchema[] = [
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

    const { container } = renderForm(schema)
    const scope = within(container)
    const fieldset = scope.getByRole('group')
    expect(fieldset).toBeTruthy()
    expect(within(fieldset).getByText('Address')).toBeTruthy()
    expect(within(fieldset).getByRole('textbox', { name: 'Street' })).toBeTruthy()
    expect(within(fieldset).getByRole('textbox', { name: 'City' })).toBeTruthy()
  })

  it('list field: add and remove rows', async () => {
    const schema: FieldSchema[] = [
      {
        type: 'list',
        name: 'items',
        label: 'Items',
        children: [
          { type: 'text', name: 'value', label: 'Value', required: true },
        ],
      },
    ]

    const { container } = renderForm(schema)
    const scope = within(container)
    const addBtn = scope.getByRole('button', { name: 'Add' })

    await userEvent.click(addBtn)
    await userEvent.click(addBtn)
    expect(scope.getAllByRole('textbox', { name: 'Value' }).length).toBe(2)

    const removeBtns = scope.getAllByRole('button', { name: 'Remove' })
    await userEvent.click(removeBtns[0]!)
    expect(scope.getAllByRole('textbox', { name: 'Value' }).length).toBe(1)
  })
})
