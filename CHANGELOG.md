### Version 0.2.2

- Increased noise SD to 1.0.

### Version 0.2.1

- Anonymization summary is computed over the entire output.
- Show suppression info about input and output rows in anonymization summary.
- Replace average distortion with median distortion in anonymization summary.
- Substring indexes are now 1-based.
- Fixed substring crashes.
- Fixed handling of real columns when system has a non-English locale.

### Version 0.2.0

- Added UI feedback on data export.
- Added support for column generalization.
- Removed anonymized count value in low count rows.
- Added relative noise column in combined view.
- Added side navigation in Notebooks.
- Sets a default path on data export.

### Version 0.1.3

- Keep detected column types in anonymization output.
- Include .NET libraries in deployment.
- Added anonymization summary to notebooks.

### Version 0.1.2

- Fix `reference` CLI executable binary generation on MacOS.

### Version 0.1.1

- Added application icon.
- Made path resolution for reference CLI absolute in production builds.
- Dropped noise magnitude limiting.
- Noisy `count` aggregator doesn't return `NULL` anymore on insufficient data.
- Reduced the amount of rows used for data / result preview.
- Added notice about rows limit in data / result preview.
