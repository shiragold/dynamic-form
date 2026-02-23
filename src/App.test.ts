import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createPinia } from 'pinia'
import App from './App.vue'

describe('App', () => {
  it('renders properly', async () => {
    const screen = render(App, {
      global: {
        plugins: [createPinia()],
      },
    })

    await expect.element(screen.getByText('Dynamic Form')).toBeVisible()
  })
})
