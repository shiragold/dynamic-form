import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import DynamicForm from './DynamicForm.vue'
import type { FieldSchema } from './types'

function renderForm(schema: FieldSchema[], options: Record<string, unknown> = {}) {
  return render(DynamicForm, {
    props: { schema, ...options },
  })
}

describe('DynamicForm', () => {
  it('renders correct inputs for a multi-field schema', async () => {
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

    const screen = renderForm(schema)

    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toBeVisible()
    await expect.element(screen.getByRole('textbox', { name: 'Email' })).toBeVisible()
    await expect.element(screen.getByRole('spinbutton', { name: 'Age' })).toBeVisible()
    await expect.element(screen.getByRole('combobox', { name: 'Role' })).toBeVisible()
    await expect.element(screen.getByRole('checkbox', { name: 'Agree' })).toBeVisible()
  })

  it('shows no errors before submit', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'fname', label: 'First Name', required: true },
    ]

    const screen = renderForm(schema)
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument()
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

    const screen = renderForm(schema)
    await screen.getByRole('button', { name: 'Submit' }).click()

    await expect.element(screen.getByRole('alert').first()).toBeVisible()
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

    const screen = renderForm(schema)
    await screen.getByRole('button', { name: 'Submit' }).click()

    await expect.element(screen.getByRole('alert')).toBeVisible()

    const input = screen.getByRole('textbox', { name: 'Nickname' })
    await input.fill('Alice')

    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument()
  })

  it('emits submit with valid data', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'person', label: 'Person', required: true },
    ]

    const onSubmit = vi.fn()
    const screen = render(DynamicForm, {
      props: { schema, onSubmit },
    })

    await screen.getByRole('textbox', { name: 'Person' }).fill('Alice')
    await screen.getByRole('button', { name: 'Submit' }).click()

    await expect.poll(() => onSubmit).toHaveBeenCalledWith({ person: 'Alice' })
  })

  it('renders a custom component via slot #field:{name}', async () => {
    const schema: FieldSchema[] = [
      { type: 'text', name: 'custom', label: 'Custom Field', required: true },
    ]

    const screen = render(DynamicForm, {
      props: { schema },
      slots: {
        'field:custom': (props: Record<string, unknown>) =>
          h('div', { 'data-testid': 'custom-slot', ...props }, 'Custom!'),
      },
    })

    await expect.element(screen.getByTestId('custom-slot')).toBeVisible()
  })

  it('renders a custom component via field.component override', async () => {
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

    const screen = renderForm(schema)
    await expect.element(screen.getByTestId('component-override')).toBeVisible()
  })

  it('renders section with fieldset and legend', async () => {
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

    const screen = renderForm(schema)
    const fieldset = screen.getByRole('group')
    await expect.element(fieldset).toBeVisible()
    await expect.element(fieldset.getByText('Address')).toBeVisible()
    await expect.element(fieldset.getByRole('textbox', { name: 'Street' })).toBeVisible()
    await expect.element(fieldset.getByRole('textbox', { name: 'City' })).toBeVisible()
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

    const screen = renderForm(schema)
    const addBtn = screen.getByRole('button', { name: 'Add' })

    await addBtn.click()
    await addBtn.click()
    await expect.poll(() => screen.getByRole('textbox', { name: 'Value' }).all()).toHaveLength(2)

    const removeBtns = screen.getByRole('button', { name: 'Remove' })
    await removeBtns.first().click()
    await expect.poll(() => screen.getByRole('textbox', { name: 'Value' }).all()).toHaveLength(1)
  })
})
