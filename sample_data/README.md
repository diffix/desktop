# Sample Data

This folder contains CSV files that can be used to test
Diffix for Desktop.

## taxi.csv.zip

This sample file contains data about New York City taxi rides.
Descriptions of the columns may be found
[here](https://www1.nyc.gov/site/tlc/about/tlc-trip-record-data.page).

The protected entity is the taxi driver. There is one row per taxi ride,
and so multiple rows per protected entity. The
protected entity column is `protected_entity`. (This has been renamed from
`hack`, which is a hash of the driver identifier, to simplify configuration.)

## census.csv.zip

This sample file contains sample fields from old USA Census data (from 1940).
The column names have been modified to be self-explanatory. The protected
entity is the individual. There is one row per protected entity.