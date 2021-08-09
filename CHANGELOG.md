### Version 0.1.3

- Keep detected column types in anonymization output.

### Version 0.1.2

- Fix `reference` CLI executable binary generation on MacOS.

### Version 0.1.1

- Added application icon.
- Made path resolution for reference CLI absolute in production builds.
- Dropped noise magnitude limiting.
- Noisy `count` aggregator doesn't return `NULL` anymore on insufficient data.
- Reduced the amount of rows used for data / result preview.
- Added notice about rows limit in data / result preview.
