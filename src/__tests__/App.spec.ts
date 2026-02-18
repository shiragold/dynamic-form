import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import { createPinia } from 'pinia'
import App from '../App.vue'

describe('App', () => {
  it('renders properly', () => {
    const { getByText } = render(App, {
      global: {
        plugins: [createPinia()],
      },
    })

    expect(getByText('Dynamic Form')).toBeTruthy()
  })
})
