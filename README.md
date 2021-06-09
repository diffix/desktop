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

### Releasing for Windows from a non-windows machine

This is, unfortunately, not so easy.
You need `mono` and `wine` installed (check out the [docs](https://www.electronforge.io/config/makers/squirrel.windows)),
but even when these requirements are met it fails on macOS because support for 32-bit applications have been removed.

The fallback for macOS users who want to build (or linux users who do not want to install `mono` and `wine`)
is to make the build in a docker container.

To build the container, run: `docker build -t winbuild -f Dockerfile.windows  .`.
Once it has completed, you can run: `docker run -it --rm -v ${PWD}:/root/project winbuild`
Inside the container you have to run a bunch of stuff, that I haven't yet managed to automate:

```
. ~/.nvm/nvm.sh
nvm install node
nvm use node
node -v # should give you a meaningful version number
yarn make:forge:windows
exit
```

Once the `make` operation completes you can exit the container.
The build artefact should be in the `/out` folder.

Note: the windows build solution is heavily inspired (taken) from
https://gist.github.com/hackash/4c3c15151c2ba658d2b4f00cf463d711
