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
