# Cypress E2E (Real API)

End-to-end tests hit the real backend through the Vite dev server proxy. No API mocking.

## Quick start

Start the dev server and backend, then run Cypress:

```bash
# Terminal 1 — frontend (port 5173)
cd dialogic && npm run dev

# Terminal 2 — backend (port 4267)
cd backend && uv run python main.py

# Terminal 3 — run tests
cd dialogic && npm run cypress:run
```

Interactive mode:

```bash
cd dialogic && npm run cypress:open
```

## Specs

| File | Coverage |
|------|----------|
| `home-page.cy.js` | Home page UI, project create form validation |
| `editor-routes.cy.js` | Direct navigation to all `/editor/*` routes + sidebar nav items |
| `main-path.cy.js` | Create project → editor → sidebar nav → player → new game |

Route list is in `cypress/support/app-routes.js`.

## Custom commands

- `cy.getByTestId(testId)` — shorthand for `cy.get('[data-testid="..."]')`
- `cy.ensureTestProject()` — PUT a minimal project via API (idempotent)
- `cy.openTestProject()` — seed project + open it through the home page UI

## Environment

Default project name for seed commands: `e2e-test-project`.  
Override with `cypress.env.json`:

```json
{
  "E2E_PROJECT": "my-test-project"
}
```

## Prerequisites

- Node.js + npm (`dialogic/node_modules`)
- Frontend dev server running on port 5173 (`npm run dev`)
- Backend running on port 4267 (`uv run python main.py`)
