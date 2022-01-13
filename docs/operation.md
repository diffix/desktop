# Operation

> To report feature requests or problem, please contact us at [feedback@open-diffix.org](mailto:feedback@open-diffix.org).

__Diffix for Desktop__ has four phases of operation:
- Load table from CSV
- Configure anonymization parameters
  - Select protected entity identifier column
  - Select suppression threshold
- Select data and adjust quality
  - Select columns for anonymization
  - Select amount of data generalization
  - Select the suppression threshold
  - Examine data quality and adjust selected columns and generalization as needed
- Export anonymized data as CSV

An unlimited number of anonymized views of the data may be exported without compromising anonymity.

![](images/overview.png#480)

## Load table from CSV

__Diffix for Desktop:__ 
- Only accepts CSV files as input.
- Interprets the first row of the CSV file as column names.
- Auto-detects the CSV separator. All standard separators are accepted.
- Auto-detects data types as text, numeric, or boolean. Text columns are generalized with substring selection, and numeric columns are generalized with numeric ranges.

After loading, __Diffix for Desktop__ displays the column names and the first 1000 rows of the table. This data may be inspected to validate that the CSV file was loaded correctly.

### Sample CSV files

[Sample CSV files](https://github.com/diffix/desktop/tree/master/sample_data)
are available for testing.

## IMPORTANT: Configure the Protected Entity Identifier Column

In order for __Diffix for Desktop__ to anonymize properly, the column containing the protected entity identifier must be correctly configured.

The **protected entity** is the entity whose privacy is being protected. A protected entity is usually a person, but it could be something else, for instance an account, a family, or even an organization.

Some data sets have one row of data per protected entity. Examples include survey data, demographic data, and census data. For example:

| Gender | Zip Code | Age | Education   | Job       | ... |
| ------ | -------- | --- | ----------- | --------- | --- |
| M      | 12345    | 46  | High School | Plumber   | ... |
| O      | 54321    | 23  | Bachelor    | None      | ... |
| F      | 48572    | 32  | PhD         | Professor | ... |

These *one-row* data sets often do not have any kind identifier column. The Protected Entity Identifier Column may be set to `None`. __Diffix for Desktop__ treats each row as a protected entity.

Other data sets have multiple rows of data per protected entity. Examples include time series data like geo-location, hospital visits, and website visits. These data sets usually have at least one column that identifies the protected identity. For instance, the following is a geo-location data set where the IMEI (International Mobile Equipment Identifier) identifies the protected entity. In this case, the protected entity itself is a mobile device, but in most cases this effectively represents a person.

| IMEI | Time                | Latitude  | Longitude |
| ---- | ------------------- | --------- | --------- |
| 123  | 2021-10-01 21:34:19 | 43.27366  | 81.36623  |
| 123  | 2021-10-01 21:36:21 | 43.43884  | 81.39229  |
| 123  | 2021-10-01 22:02:51 | 43.81922  | 81.40221  |
| ...  | ...                 | ...       | ...       |
| 456  | 2021-02-13 17:34:19 | -17.27366 | 67.36623  |
| 456  | 2021-02-13 17:36:21 | -17.43884 | 67.39229  |
| 456  | 2021-02-13 17:02:51 | -17.67883 | 81.40221  |
| ...  | ...                 | ...       | ...       |

For this *multi-row* data set, the IMEI column is configured in __Diffix for Desktop__ as the Protected Entity Identifier column. If a different column were configured as the Protected Entity Identifier column, then __Diffix for Desktop__ would not anonymize correctly.

In some multi-row data sets, a single row may pertain to multiple different protected entities. Examples include bank transactions, email records, and call records. Here is an example of a data set for email records:

| Record ID | Sender email | Receiver email | Time                | ... |
| --------- | ------------ | -------------- | ------------------- | --- |
| 1234      | a@b.com      | c@d.com        | 2021-10-01 21:34:19 | ... |
| 1235      | a@b.com      | e@f.com        | 2021-10-01 21:36:21 | ... |
| 1236      | c@d.com      | e@f.com        | 2021-10-01 22:02:51 | ... |
| ...       | ...          | ...            | ...                 | ... |

The `Sender email` and `Receiver email` each identify a different protected entity.

> **This version of __Diffix for Desktop__ does not protect a data set where there are multiple protected entities per row**

A data set with multiple protected entities needs to be pre-processed to have one protected entity per row before loading into __Diffix for Desktop__. See [Multiple protected entities per row](tips.md#multiple-protected-entities-per-row).

## Suppression threshold configuration

__Diffix for Desktop__ suppresses bins that are comprised of too few protected entities.
This hides individual data values or combinations of data values that could
leak private information about individual protected entities.

The `suppression threshold` parameter can be set in __Diffix for Desktop__. 
Bins pertaining to `suppression threshold` or fewer protected entities are suppressed. The default `suppression threshold` is 3. This is normally a safe setting: bins with one or two protected entities will __always__ be suppressed.

There are two cases where a higher `suppression threshold` is required:

1. Small groups of protected entities are closely related, like a family or married
   couple, and there is a column that allows selection of a small group.
2. There is not a perfect relationship between the protected entity identifier column
   and the protected entity (the protected entity may have more than one protected
   entity identifier), and there is a column that isolates the protected entity
   in the same bin as multiple protected entities.

One example of the first case is a banking dataset where the protected entity is the
individual person, but where there are joint accounts, and there is a column containing the
account number. If `suppression threshold = 2`, then selecting the account number can
reveal information about joint accounts. One solution might be to set account as
the protected entity rather than individual. Another, however, is to set
`suppression threshold = 3` so that bins pertaining to a single joint account are
always suppressed.

A second example of the first case would be a dataset where the protected entity is the
individual person, but where columns contain precise location information like latitude and
longitude or home address. In this case, queries with location precision that isolate single home,
and where the number of residents exceeds the `suppression threshold` can reveal information
about individual families. One solution might be to lower the location precision in the original
dataset. Another, however, is to set `suppression threshold` high enough that even large families
are protected (e.g. `suppression threshold = 10`).

An example of the second case would be a dataset where the protected entity is meant to
be the individual person, but where the protected entity identifier is a mobile
phone identifier (e.g. IMEI number). If there are columns that allow selection of an
individual, such as name or customer number, then individuals who have multiple mobile
phones, and therefore appear as multiple protected entities, may be isolated into a
single bin. One solution is to remove all columns that may select an individual. Another,
however, is to set `suppression threshold` to a value that exceeds the number of
mobile phones any given individual is likely to have.

Note that `suppression threshold` is a _hard lower bound_ on suppression. The actual threshold
for any given output bin might be slightly higher. This is because the actual per-bin
threshold is itself a noisy value: a random value taken from a normal distribution.

### Higher suppression threshold settings

There is a slight *anonymization* benefit to setting `suppression threshold` to a higher
value than needed to ensure the protection of protected entities as described above.
The benefit, however, is only slight, and therefore not really necessary. A better way
to generate output bins comprised of more protected entities is via column generalization.

There may also be a *data quality* benefit to setting `suppression threshold` to a higher
value. This is because bins with very few protected entities have more relative distortion
than bins with more protected entities. Setting `suppression threshold` to a higher value
can lead to more suppression, but also to less average distortion.

### Other anonymization parameters

There are in total eight parameters that affect the strength of anonymization. They are described in 
[the Diffix Elm specification](https://arxiv.org/abs/2201.04351).
Of these, only the `suppression threshold` is settable in
__Diffix for Desktop__. The others are set to default values that provide strong
anonymization with good utility and don't require adjustment.
These may become user-settable in future versions should a need arise. The following table gives the default values using the parameter names in
the specification (note that `low_thresh` is the same as `suppression threshold`).

| Anonymization parameter | Default setting |
| --- | --- |
| `low_thresh` | 3 |
| `sd_supp` | 1.0 |
| `low_mean_gap` | 2 |
| `base_sd` | 1.5 |
| `outlier_min` | 1 |
| `outlier_max` | 2 |
| `top_min` | 3 |
| `top_max` | 4 |

## Select columns and generalization

Like all data anonymization mechanisms, __Diffix Elm__ distorts and hides data. The more columns included and the finer the data granularity, the more distortion and hiding. __Diffix Elm__ distorts by adding *noise* to counts, and hides data by *suppressing* bins that pertain to too few protected entities.

__Diffix for Desktop__ lets you control the quality of the anonymized data through column selection and column generalization (binning). It lets you inspect the quality of the anonymized data at a glance with *distortion statistics* and in detail with *side-by-side comparison* of the anonymized and original data. Through an iterative process of column selection and generalization, and anonymized data inspection, __Diffix for Desktop__ simplifies the task of data anonymization.

![](images/quality-iterate.png#640)

Columns are selected for inclusion in the anonymized data output using the radial buttons. As soon as a column is selected, __Diffix for Desktop__ starts computing the anonymized output. If another column is selected or de-selected before the computing finishes, then the computation is halted and a new computation started.

When a column is selected, the generalization input is exposed. For text columns, you can select a substring by offset and number of characters. For numeric columns, you can select a bin size.

> More generalization (shorter substrings or larger numeric bins) leads to less suppression and less relative noise, but also less precision.

### Toggle between counting rows and counting protected entities (i.e. persons)

If the input data is multi-row, then __Diffix for Desktop__ gives you the choice of counting rows or counting protected entities (e.g. persons). The toggle switch may be found at the bottom of the column selection area.

## How to interpret the Anonymization Summary

The distortion statistics are displayed in the **Anonymization Summary** area. This lets you determine the overall quality of the data at a glance.

The Anonymization Summary has four statistics:

* **Suppressed Count:** Conveys the total proportion of suppressed data.
* **Suppressed Bins:** Conveys the proportion of output bins that have been suppressed.
* **Median Distortion:** Conveys the median relative error between anonymized counts and true counts of the non-suppressed bins.
* **Maximum Distortion:** Conveys the maximum relative error.

### Example 1: Almost no distortion

| Suppressed Count | Suppressed Bins | Median Distortion | Maximum Distortion |
| --- | --- | --- | --- |
| 0 of 440257 (0%) | 0 of 3 (0%) | 0.05% | 0.69% |

In this case there is almost no distortion. No data is suppressed, the median distortion is a small fraction of 1%, and even the maximum distortion is below 1%. Low distortion occurs where there are relatively few output bins, and each bin contains data for a substantial number of protected entities.

### Example 2: A long tail

| Suppressed Count | Suppressed Bins | Median Distortion | Maximum Distortion |
| --- | --- | --- | --- |
| 4447 of 440257 (1.01%) | 2398 of 5207 (46.05%) | 1.72% | 75% |

In this case, the output data has a long tail. Most of the data resides in a relatively small number of bins, but a small amount of the data is spread over a large number of bins. In this Anonymization Summary, we see from the `Suppressed Count` that only about 1% of the data is suppressed (4447 rows of a total 440K rows). From the `Suppressed Bins`, however, we see that that 1% of suppressed data is spread over nearly half of the output bins (46%). This may or may not be acceptable data quality, depending on the use case.

The median distortion (relative error) is relatively small (less than 2%), but the maximum distortion is high (75%). This is common when there are some bins containing very few protected entities. Again, this may or may not be a data quality problem depending on the use case.

### Example 3: Bad data quality

| Suppressed Count | Suppressed Bins | Median Distortion | Maximum Distortion |
| --- | --- | --- | --- |
| 398784 of 440257 (90.58%) | 11933 of 12995 (91.83%) | 94.87% | 97.06% |

In this case, almost all of the data resides in very small bins. 91% of the data is suppressed (`Suppressed Count`), as is 92% of the bins. The median and maximum distortion (relative error) are both high (95% and 97%).

## Anonymized Data

A toggle switch at the bottom of the Anonymized Data selects between two views. The `Anonymized view` shows only the anonymized data itself: the selected columns and the count. This data is safe to release. The count refers to rows or to protected entities, whichever was chosen in the column selection area.

The `Combined view` additionally shows the original data side-by-side with the anonymized data. Because the combined view contains original data, it is not safe to release. The combined view presents two additional columns, `Count (original)` and `Distortion`. `Count (original)` is the true count of the original data. `Distortion` is the relative error between the original count and the anonymized count.

The combined view displays suppressed bins. The `Count (anonymized)` column is left blank for suppressed bins.

The combined view lets you examine precisely the distortion and suppression. The anonymized data can be sorted by each column. Sorting by `Count (original)` shows the ascending suppressed bins first, and so is useful for examining what has been suppressed. Sorting by `Distortion` descending shows the bins with the most error first, and so is useful for examining which bins have high distortion.

_Note that the output view displays at most 1000 rows of data._ To view all of the anonymized data, use the CSV export.

### Suppress bin

The first row in the Anonymized Data table might contain the _suppress bin_, which provides the combined anonymized count of all the bins that were suppressed. The suppress bin shows all column values as `*`.

Note that the suppress bin may itself be suppressed. The suppress bin is only shown in the Anonymized view.

### What is safe to release

Note that the data in the Anonymized view is the only data that is properly anonymized by __Diffix for Desktop__. Note in particular that the Anonymization Summary is not anonymized per se. See [Releasing Anonymization Summary statistics](tips.md#releasing-anonymization-summary-statistics).

## Export anonymized data to CSV

The anonymized view is exported to CSV with the button below the anonymized data. As of this time, the combined view cannot be exported. Please contact us at [feedback@open-diffix.org](mailto:feedback@open-diffix.org) if you would like to be able to export the combined view.