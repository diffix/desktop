module OpenDiffix.Service.AggregationHooks

open OpenDiffix.Core

module BucketAttributes =
  let IS_LED_MERGED = "is_led_merged"
  let IS_STAR_BUCKET = "is_star_bucket"

let private findSingleIndex cond arr =
  arr
  |> Array.indexed
  |> Array.filter (snd >> cond)
  |> function
    | [| index, _item |] -> Some index
    | _ -> None

let private findAggregator aggFn aggregators =
  aggregators |> findSingleIndex (fun ((fn, _), _) -> fn = aggFn)

let private isLowCount lowCountIndex bucket =
  bucket.Aggregators.[lowCountIndex].Final(bucket.ExecutionContext)
  |> Value.unwrapBoolean

let private isGlobalAggregation (aggregationContext: AggregationContext) =
  Array.isEmpty aggregationContext.GroupingLabels

let private lowCountIndex (aggregationContext: AggregationContext) =
  match findAggregator DiffixLowCount aggregationContext.Aggregators with
  | Some index -> index
  | None -> failwith "Cannot find required DiffixLowCount aggregator"

let private diffixCountIndex (aggregationContext: AggregationContext) =
  match findAggregator DiffixCount aggregationContext.Aggregators with
  | Some index -> index
  | None -> failwith "Cannot find required DiffixCount aggregator"

let private countIndex (aggregationContext: AggregationContext) =
  match findAggregator Count aggregationContext.Aggregators with
  | Some index -> index
  | None -> failwith "Cannot find required Count aggregator"

module Led =
  type private SiblingPerColumn =
    | NoBuckets
    | SingleBucket of bucket: Bucket * isLowCount: bool
    | MultipleBuckets

  /// Compares 2 rows and returns the index where a single column is not equal.
  /// Returns `None` if rows are equal or are different in more than one column.
  let private findSingleNonMatchingColumn max (row1: Row) (row2: Row) =
    let rec compare notEqualAt i =
      if i = max then
        // End of comparison, return matched index (may be None)
        notEqualAt
      else if row1.[i] = row2.[i] then
        // Columns equal, try next one
        compare notEqualAt (i + 1)
      else if Option.isSome notEqualAt then
        // A non-equal column already exists, abort
        None
      else
        // Mark current index as not equal and keep going to verify no others are
        compare (Some i) (i + 1)

    compare None 0

  let private anonymizingAggregatorIndexes (aggregationContext: AggregationContext) =
    aggregationContext.Aggregators
    |> Seq.map fst
    |> Seq.indexed
    |> Seq.choose (fun (i, aggSpec) -> if Aggregator.isAnonymizing aggSpec then Some i else None)
    |> Seq.toArray

  // For LED hook we merge only anonymizing aggregators.
  let private mergeGivenAggregatorsInto (targetBucket: Bucket) aggIndexes (sourceBucket: Bucket) =
    let sourceAggregators = sourceBucket.Aggregators
    let targetAggregators = targetBucket.Aggregators

    aggIndexes
    |> Array.iter (fun i -> targetAggregators.[i].Merge(sourceAggregators.[i]))

  let private led (aggregationContext: AggregationContext) (buckets: Bucket seq) =
    let lowCountIndex = lowCountIndex aggregationContext
    let groupingLabelsLength = aggregationContext.GroupingLabels.Length
    let anonAggregators = anonymizingAggregatorIndexes aggregationContext

    let buckets =
      buckets
      |> Seq.map (fun bucket -> bucket, isLowCount lowCountIndex bucket)
      |> Seq.toArray

    buckets
    |> Array.iteri (fun i (victimBucket, isLowCount) ->
      if isLowCount then
        let victimGroup = victimBucket.Group
        let siblingsPerColumn = Array.create groupingLabelsLength NoBuckets

        buckets
        |> Array.iteri (fun j otherBucket ->
          if i <> j then
            match findSingleNonMatchingColumn groupingLabelsLength victimGroup (fst otherBucket).Group with
            | Some nonMatchingColumn ->
              // Add bucket to column's siblings
              siblingsPerColumn.[nonMatchingColumn] <-
                match siblingsPerColumn.[nonMatchingColumn] with
                | NoBuckets -> SingleBucket otherBucket
                | _ -> MultipleBuckets
            | None -> ()
        )

        let hasUnknownColumn =
          siblingsPerColumn
          |> Array.exists (
            function
            | NoBuckets -> true
            | _ -> false
          )

        if hasUnknownColumn then
          siblingsPerColumn
          |> Array.iter (
            function
            | SingleBucket (siblingBucket, false) ->
              Logger.debug $"Merging %A{victimGroup} into %A{siblingBucket.Group}"
              victimBucket |> mergeGivenAggregatorsInto siblingBucket anonAggregators

              victimBucket
              |> Bucket.putAttribute BucketAttributes.IS_LED_MERGED (Boolean true)
            | _ -> ()
          )
    )

    buckets |> Seq.map fst

  let hook (aggregationContext: AggregationContext) (buckets: Bucket seq) =
    if isGlobalAggregation aggregationContext then
      buckets
    else
      led aggregationContext buckets

module StarBucket =
  /// Merges all source aggregators into the target bucket.
  let private mergeAllAggregatorsInto (targetBucket: Bucket) (sourceBucket: Bucket) =
    let targetAggregators = targetBucket.Aggregators

    sourceBucket.Aggregators |> Array.iteri (fun i -> targetAggregators.[i].Merge)

  let private makeStarBucket (aggregationContext: AggregationContext) =
    let isGlobal = isGlobalAggregation aggregationContext

    let executionContext = aggregationContext.ExecutionContext

    // Group labels are all '*'s
    let group = Array.create aggregationContext.GroupingLabels.Length (String "*")

    let aggregators =
      aggregationContext.Aggregators
      |> Seq.map fst
      |> Seq.map (Aggregator.create executionContext isGlobal)
      |> Seq.toArray

    let starBucket = Bucket.make group aggregators executionContext
    // Not currently used, but may be in the future.
    starBucket |> Bucket.putAttribute BucketAttributes.IS_STAR_BUCKET (Boolean true)
    starBucket

  /// Iterates and materializes the bucket sequence.
  let private iterateBuckets f (buckets: Bucket seq) =
    buckets
    |> Seq.map (fun bucket ->
      f bucket
      bucket
    )
    // We do this because re-running a sequence is potentially dangerous if it has side effects.
    |> Seq.toArray

  let private computeStarBucket callback aggregationContext buckets =
    let starBucket = makeStarBucket aggregationContext
    let lowCountIndex = lowCountIndex aggregationContext
    let diffixCountIndex = diffixCountIndex aggregationContext

    let mutable bucketCount = 0

    let buckets =
      buckets
      |> iterateBuckets (fun bucket ->
        let isAlreadyMerged =
          bucket
          |> Bucket.getAttribute BucketAttributes.IS_LED_MERGED
          |> Value.unwrapBoolean

        if not isAlreadyMerged && isLowCount lowCountIndex bucket then
          bucketCount <- bucketCount + 1
          bucket |> mergeAllAggregatorsInto starBucket
      )

    let executionContext = starBucket.ExecutionContext

    let isStarBucketLowCount =
      starBucket.Aggregators.[lowCountIndex].Final(executionContext)
      |> Value.unwrapBoolean

    let isStarBucketSingleBucket = bucketCount < 2

    let suppressedAnonCount =
      // NOTE: we can have a suppress bin consisting of a single suppressed bucket,
      // which won't be suppressed by itself (different noise seed). In such case,
      // we must enforce the suppression manually with `isStarBucketSingleBucket`.
      if isStarBucketLowCount || isStarBucketSingleBucket then
        Null
      else
        starBucket.Aggregators.[diffixCountIndex].Final(executionContext)

    callback suppressedAnonCount
    buckets :> Bucket seq

  let hook callback (aggregationContext: AggregationContext) (buckets: Bucket seq) =
    computeStarBucket callback aggregationContext buckets
