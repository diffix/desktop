# Open Diffix Publisher

Desktop application to anonymize data with Open Diffix Publish.

For the time being this is a very thin scaffold and playground for
experimenting with creating an Electron app that uses a variant of the
Open Diffix Reference to anonymize data in Publish mode.

## Development

Run `yarn setup` to install dependencies and to perform a first
compilation of the F# React app.

Following the setup, run `yarn dev` to start the development environment
with hot code reloading.

## Making a release

`yarn make` will produce an executable.
Electron forge is used for building. To add a new target,
check out the [makers](https://www.electronforge.io/config/makers) documentation,
and edit the [forge.config.js](forge.config.js) file.

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
