# Easy Diffix

Desktop application to anonymize data with Open Diffix Elm.

## To use

Download and run [setup package](https://github.com/diffix/desktop/releases).
Documentation can be found in the application itself, and also in the `docs`
folder in this repo.

Sample CSV files for playing with the app can be found in the `sample_data`
folder in this repo.

## Development

Run `asdf install` to install `node` via `asdf`.
Run `npm install` to install dependencies.
Run `git submodule update --init && npm run build` to get and build the anonymizer.

Following the setup, run `npm start` to start the development environment with hot code reloading.

Before committing, make sure to lint and format your code with `npm run lint` and `npm run format`.

## Making a release

1. Bump the program version and create a new version tag on GitHub. A draft release will be created automatically.

For example:
```
npm version minor
git push --follow-tags
```

2. After making sure the generated assets are OK, the release can be published manually in the GitHub UI.
