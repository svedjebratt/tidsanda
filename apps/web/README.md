# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Install dependencies and start a development server with Vite+:

```bash
vp install
vp dev

# or start the server and open the app in a new browser tab
vp dev --open
```

## Building

To create a production version of your app:

```bash
vp build
```

You can preview the production build with `vp preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
