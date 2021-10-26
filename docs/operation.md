# Operation

> To report feature requests or problem, please contact us at [feedback@open-diffix.org](mailto:feedback@open-diffix.org).

Easy Diffix has three phases of operation:
- Load and configure table from CSV
- Select data and adjust quality
  - Select columns for anonymization
  - Select amount of data generalization
  - Examine data quality and adjust selected columns and generalization as needed
- Export anonymized data as CSV

An unlimited number of anonymized views of the data may be exported without compromising anonymity.

![](images/overview.png#480)

## Load table from CSV

Easy Diffix only accepts CSV files as input.

Easy Diffix interprets the first row of the CSV file as column names.

Easy Diffix auto-detects the CSV separator. All standard separators are accepted.

Easy Diffix auto-detects data types as text or numeric. Text columns are generalized with substring selection, and numeric columns are generalized with numeric ranges.

After loading, Easy Diffix displays the column names and the first 1000 rows of the table. This data may be inspected to validate that the CSV file was loaded correctly.

## IMPORTANT: Configure the Protected Entity Identifier Column

In order for Easy Diffix to anonymize properly, the column containing the protected entity identifier must be correctly configured.

The **protected entity** is the entity whose privacy is being protected. A protected entity is usually a person, but it could be something else, for instance an account, a family, or even an organization.

Some data sets have one row of data per protected entity. Examples include survey data, demographic data, and census data. For example:

| Gender | Zip Code | Age | Education   | Job       | ... |
| ------ | -------- | --- | ----------- | --------- | --- |
| M      | 12345    | 46  | High School | Plumber   | ... |
| O      | 54321    | 23  | Bachelor    | None      | ... |
| F      | 48572    | 32  | PhD         | Professor | ... |

These *one-row* data sets often do not have any kind identifier column. The Protected Entity Identifier Column may be set to `None`. Easy Diffix treats each row as a protected entity.

Other data sets have multiple rows of data per protected entity. Examples include time series data like geo-location, hospital visits, and website visits. These data sets usually have one or more columns that identify the protected identity. For instance, the following is a geo-location data set where the IMEI (International Mobile Equipment Identifier) identifies the protected entity. In this case, the protected entity itself is a mobile device, but in most cases this effectively represents a person.

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

For this *multi-row* data set, the IMEI column is configured in Easy Diffix as the Protected Entity Identifier Column. If a different column were configured as the Protected Entity Identifier Column, then Easy Diffix would not anonymize correctly.

In some multi-row data sets, a single row may pertain to multiple different protected entities. Examples include bank transactions, email records, and call records. Here is an example of a data set for email records:

| Record ID | Sender email | Receiver email | Time                | ... |
| --------- | ------------ | -------------- | ------------------- | --- |
| 1234      | a@b.com      | c@d.com        | 2021-10-01 21:34:19 | ... |
| 1235      | a@b.com      | e@f.com        | 2021-10-01 21:36:21 | ... |
| 1236      | c@d.com      | e@f.com        | 2021-10-01 22:02:51 | ... |
| ...       | ...          | ...            | ...                 | ... |

The `Sender email` and `Receiver email` each identify a different protected entity.

> **This version of Easy Diffix does not protect a data set where there are multiple protected entities per row**

A data set with multiple protected entities needs to be pre-processed to have one protected entity per row before loading into Easy Diffix. See [Multiple protected entities per row](#multiple-protected-entities-per-row).

## Select columns and generalization

Like all data anonymization mechanisms, Diffix distorts and hides data. The more columns included and the finer the data granularity, the more distortion and hiding. Diffix distorts by adding *noise* to counts, and hides data by *suppressing* bins that pertain to too few protected entities.

Easy Diffix lets you control the quality of the anonymized data through column selection and column generalization (binning). It lets you inspect the quality of the anonymized data at a glance with *distortion statistics* and in detail with *side-by-side comparison* of the anonymized and original data. Through an iterative process of column selection and generalization, and anonymized data inspection, Easy Diffix simplifies the task of data anonymization.

![](images/quality-iterate.png#640)

Columns are selected for inclusion in the anonymized data output using the radial buttons. As soon as a column is selected, Easy Diffix starts computing the anonymized output. If another column is selected or de-selected before the computing finishes, then the computation is halted and a new computation started.

When a column is selected, the generalization input is exposed. For text columns, you can select a substring by offset and number of characters. For numeric columns, you can select a bin size.

> More generalization (larger substrings or no substring, and larger numeric bins) leads to less suppression and less relative noise, but also less precision.

### Toggle between counting rows and counting protected entities (i.e. persons)

If the input data is multi-row, then Easy Diffix gives you the choice of counting rows or counting protected entities (i.e. persons). The toggle switch may be found at the bottom of the column selection area.

## How to interpret the Anonymization Summary

The distortion statistics are displayed in the **Anonymization Summary** area. This lets you determine the overall quality of the data at a glance.

The Anonymization Summary has four statistics:

* **Suppressed Count:** Conveys the total proportion of suppressed data.
* **Suppressed Bins:** Conveys the proportion of output bins that have been suppressed.
* **Median Distortion:** Conveys the median relative error between anonymized counts and true counts of the non-suppressed bins.
* **Maximum Distortion:** Conveys the maximum relative error.

### Example 1: Almost no distortion

![](images/distortion-none.png#720)

The above image illustrates the case when there is almost no distortion. No data is suppressed, the median distortion is a small fraction of 1%, and even the maximum distortion is below 1%. Low distortion occurs where relative few output bins, and each bin contains data for a substantial number of protected entities.

### Example 2: A long tail

![](images/distortion-suppressed-bins.png#720)

The above image illustrates the case when the output data has a long tail. Most of the data resides in a relatively small number of bins, but a small amount of the data is spread over a large number of bins. In this Anonymization Summary, we see from the `Suppressed Count` that only about 1% of the data is suppressed (4447 rows of a total 440K rows). From the `Suppressed Bins`, however, we see that that 1% of suppressed data is spread over nearly half of the output bins (46%). This may or may not be acceptable data quality, depending on the use case.

The median distortion (relative error) is relatively small (less than 2%), but the maximum distortion is high (75%). This is common when there are some bins containing very few protected entities. Again, this may or may not be a data quality problem depending on the use case.

### Example 3: Bad data quality

![](images/distortion-bad.png#720)

The above image illustrates the case when almost all of the data resides in very small bins. 91% of the data is suppressed (`Suppressed Count`), as is 92% of the bins. The median and maximum distortion (relative error) is nearly the same, and both are high (95% and 97%).

## Anonymized Data

A toggle switch at the bottom of the Anonymized Data selects between two views. The `Anonymized` view shows only the anonymized data itself: the selected columns and the count. This data is safe to release. The count refers to rows or to protected entities, whichever was chosen in the column selection area.

The `Combined view` additionally shows the original data side-by-side with the anonymized data. Because the combined view contains original data, it is not safe to release. The combined view presents two additional columns, `Count (original)` and `Distortion`. `Count (original)` is the true count of the original data. `Distortion` is the relative error between the original count and the anonymized count.

The combined view displays suppressed bins. The `Count (anonymized)` column is left blank for suppressed bins.

The combined view let's you examine precisely the distortion and suppression. The anonymized data can be sorted by each column. Sorting by `Count (original)` shows the ascending suppressed bins first, and so is useful for examining what has been suppressed. Sorting by `Distortion` descending shows the bins with the most error first, and so is useful for examining which bins have high distortion.

### What is safe to release

Note that the data in the `Anonymized` view is the only data that is properly anonymized by Easy Diffix. Note in particular that the Anonymization Summary is not anonymized per se. See [Releasing Anonymization Summary statistics](#releasing-anonymization-summary-statistics).

## Export anonymized data to CSV

The anonymized view is exported to CSV with the button below the anonymized data. As of this time, the combined view cannot be exported. Please contact us at [feedback@open-diffix.org](mailto:feedback@open-diffix.org) if you would like to be able to export the combined view.

## Tips

This version of Easy Diffix is minimalistic, and is missing features that some may find useful. We list a few such features and give tips on how to make up for the missing functionality. To help guide feature design in future versions of Easy Diffix, please contact us at [feedback@open-diffix.org](mailto:feedback@open-diffix.org) and let us know what features you would like to see.

### Releasing Anonymization Summary statistics

The values in the Anonymization Summary are not anonymized per se. `Suppressed Count`,	`Suppressed Bins`, and	`Median Distortion` have some built-in anonymity because they are values that are influenced by multiple protected entities. If you wish to release these values, we suggest you round them first (i.e. to be within a few percent of the true value).  We recommend not releasing `Maximum Distortion`, as this is influenced by very few protected entities, and may reveal the presence or absence of outliers in the data.

### Anonymized bucket counts

Related to the [previous section](#releasing-anonymization-summary-statistics), an anonymized count of the number of bins (both suppressed and non-suppressed) would clearly be a nice feature. It would avoid both the effort and risk of manually rounding the `Suppressed Bins` value.

### Automatic binning of suppressed rows

Also related to the [this section](#releasing-anonymization-summary-statistics), a feature that anonymously and automatically assigned all suppressed data to some kind of "other" bin would be valuable. This would avoid both the effort and risk of manually rounding the `Suppressed Count` value and appending it as a bin in the output CSV file.

### Multiple protected entities per row

Easy Diffix does not support having multiple protected entities per row (though this is currently a high-priority planned feature). Such datasets need to be pre-processed so that there is only one protected entity per row. For example, a dataset with columns `Receiver email` and `Sender email` could be split into two data sets, one without the `Receiver email` column, and the other without the `Sender email` column. Note in particular that simply pseudonymizing one or the other of the email columns would **not** suffice in providing strong anonymity: the complete column must be removed.

Note also that other columns strongly correlated with the removed protected entity must also be removed. For instance, if the `Sender email` column is being removed, and there are related columns like `Sender zip` or `Sender account number`, then these must also be removed.

### Hierarchical categorization

Generalization is Easy Diffix is limited to numeric ranges and substrings. A valuable form of generalization is hierarchical categorization. Examples include geographical hierarchy (zip code, county, state, country) and job classification (classify specific jobs as manual, blue collar, unskilled, teaching, executive, research, etc.). If this kind of generalization is needed, the input CSV must be pre-processed to provide it.

### Other aggregates

If the analyst wishes to release other anonymized aggregate statistics, for instance `sum`, `average`, and so on, this currently must be done as post-processing to the output CSV file. For instance, to generate `sum(salary)`, one must take the salary value from each bin, multiply it by the number of rows, and then sum them together (assuming no suppressed bins). Generating an anonymized sum in Easy Diffix would both save effort and likely produce a more accurate value.
