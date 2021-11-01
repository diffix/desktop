# Tips and Tricks

This version of Diffix for Desktop is minimalistic, and is missing features that some may find useful. We list a few such features and give tips on how to make up for the missing functionality. To help guide feature design in future versions of Diffix for Desktop, please contact us at [feedback@open-diffix.org](mailto:feedback@open-diffix.org) and let us know what features you would like to see.

## Releasing Anonymization Summary statistics

The values in the Anonymization Summary are not anonymized per se. `Suppressed Count`,	`Suppressed Bins`, and	`Median Distortion` have some built-in anonymity because they are values that are influenced by multiple protected entities. If you wish to release these values, we suggest you round them first (i.e. to be within a few percent of the true value).  We recommend not releasing `Maximum Distortion`, as this is influenced by very few protected entities, and may reveal the presence or absence of outliers in the data.

## Anonymized bucket counts

Related to the [previous section](#releasing-anonymization-summary-statistics), an anonymized count of the number of bins (both suppressed and non-suppressed) would clearly be a nice feature. It would avoid both the effort and risk of manually rounding the `Suppressed Bins` value.

## Automatic binning of suppressed rows

Also related to the [this section](#releasing-anonymization-summary-statistics), a feature that anonymously and automatically assigned all suppressed data to some kind of "other" bin would be valuable. This would avoid both the effort and risk of manually rounding the `Suppressed Count` value and appending it as a bin in the output CSV file.

## Multiple protected entities per row

Diffix for Desktop does not support having multiple protected entities per row (though this is currently a high-priority planned feature). Such datasets need to be pre-processed so that there is only one protected entity per row. For example, a dataset with columns `Receiver email` and `Sender email` could be split into two data sets, one without the `Receiver email` column, and the other without the `Sender email` column. Note in particular that simply pseudonymizing one or the other of the email columns would **not** suffice in providing strong anonymity: the complete column must be removed.

Note also that other columns strongly correlated with the removed protected entity must also be removed. For instance, if the `Sender email` column is being removed, and there are related columns like `Sender zip` or `Sender account number`, then these must also be removed.

## Hierarchical categorization

Generalization in Diffix for Desktop is limited to numeric ranges and substrings. A valuable form of generalization is hierarchical categorization. Examples include geographical hierarchy (zip code, county, state, country) and job classification (classify specific jobs as manual, blue collar, unskilled, teaching, executive, research, etc.). If this kind of generalization is needed, the input CSV must be pre-processed to provide it.

## Other aggregates

If the analyst wishes to release other anonymized aggregate statistics, for instance `sum`, `average`, and so on, this currently must be done as post-processing to the output CSV file. For instance, to generate `sum(salary)`, one must take the salary value from each bin, multiply it by the number of rows, and then sum them together (assuming no suppressed bins). Generating an anonymized sum in Diffix for Desktop would both save effort and likely produce a more accurate value.

## Anonymization parameters

Diffix has a number of anonymization parameters, such as noise level and suppression threshold, that affect the strength of anonymization and data quality. Current parameter settings optimize for data quality while still providing strong anonymity. If you believe you need stronger anonymization, please contact us at
[feedback@open-diffix.org](mailto:feedback@open-diffix.org).