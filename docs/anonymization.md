# Anonymization

Diffix for Desktop uses Diffix as its underlying anonymization mechanism. Diffix was co-developed by the Max Planck Institute for Software Systems and Aircloak GmbH. Diffix is strong enough to satisfy the GDPR definition of anonymization as non-personal data.

> If you would like help in getting approval from your Data Protection Officer (DPO) or Data Protection Authority (DPA), please contact us at [feedback@open-diffix.org](mailto:feedback@open-diffix.org).

Diffix combines three common anonymization mechanisms:
* __Noise:__ Distorts counts.
* __Suppression:__ Removes outputs that pertain to too few protected entities.
* __Generalization:__ Makes data more coarse-grained, for instance generalizing date-of-birth to year-of-birth.

Noise is commonly used with Differential Privacy mechanisms. Generalization and suppression are commonly used with k-anonymity.

Diffix automatically applies these three mechanisms as needed on a query-by-query basis. Diffix detects how much is contributed to each output bin by each protected entity, and tailors noise and suppression so as to maximize data quality while maintaining strong anonymization. The quality of data anonymized with Diffix usually far exceeds that of Differential Privacy and k-anonymity.

## Proportional Noise

Diffix adds pseudo-random noise taken from a Normal distribution. The amount of noise (the standard deviation) is proportional to how much is contributed to the count by the heaviest contributors. When counting the number of protected entities, each entity contributes 1, and the noise standard deviation is `SD=1.5`. With high probability, the resulting answer will be within plus or minus 5 of the true answer.

When counting the number of rows, the amount of noise is larger: proportional to the number of rows contributed by the highest contributors. This is similar to the concept of sensitivity in Differential Privacy. Proportional noise protects high contributors in the case where data recipients may have prior knowledge about the heavy contributors.

Finally, Diffix removes the excess contributions of extreme outliers (one or two protected entities that contribute far more rows than other protected entities). This prevents data recipients from inferring information about extreme outliers from the amount of noise itself.

## Suppression

Diffix recognizes how many protected entities contribute to each output bin. When the number is too small, Diffix suppresses (doesn't output) the bin. This prevents data recipients from inferring information about individual protected entities even when the recipients have prior knowledge.

Rather than apply a single suppression threshold to all bins, Diffix slightly modifies the threshold for different bins. This adds additional uncertainty for recipients that have prior knowledge of protected entities.

Diffix suppresses bins with fewer than 4 protected entities *on average*. Diffix always suppresses bins with only a single contributing protected entity.

## Generalization

Unlike proportional noise and suppression, Diffix does not automate and enforce generalization. This is because the amount of acceptable generalization depends on the analytic goals of each use case. For instance, in some cases year-of-birth may be required, whereas in others decade-of-birth may be acceptable. Diffix has no way of knowing what level of generalization to choose. Rather, this is left to the analyst so that data quality can be tailored to the specific use case.

As a general rule, noise and suppression force analysts to generalize. If data is too fine-grained, then each output bin will have very few protected entities. In these cases, the bins may be suppressed, or if not suppressed the signal-to-noise may be too low.
