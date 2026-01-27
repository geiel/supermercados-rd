## Coding Instructions
- `params` and `searchParams` are **Promises**, always resolve them using `await`.
- Use `repositionInputs={false}` in the Drawer if his content have any input that needs a keyboard.
- Use the `Empty` shadcn component for empty states in the pages.
- If an drawer or dialog is just a list for select one item use a radio button style with the text, if it is a multiple select use a checkbox with text style.
- All /admin pages and apis should be only accesible by the admin user.
- All /api | endpoints that are only being used by /admin pages should be in the /api/admin folder so is protected.

## Installing new libraries
- Always use `pnpm`.
- Always use `shadcnui` components for every new primitive.
- Always use `pnpm dlx shadcn@latest add {component}` command to install new shadcn components.