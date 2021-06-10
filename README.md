# Open Diffix Publisher

Desktop application to anonymize data with Open Diffix Publish.

## Development

Run `npm install` to install dependencies.

Following the setup, run `npm start` to start the development environment with hot code reloading.

Before committing, make sure to lint and format your code with `npm run lint` and `npm run prettier`.
We recommend using the [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) and
[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) VS Code extensions.

## Making a release

`npm run make` will produce an executable.
Electron forge is used for building. To add a new target,
check out the [makers](https://www.electronforge.io/config/makers) documentation,
and edit the forge config in `package.json`.
