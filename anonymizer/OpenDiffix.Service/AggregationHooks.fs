module AggregationHooks

open OpenDiffix.Core

module BucketAttributes =
  let IS_LED_MERGED = "is_led_merged"

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

  let private led lowCountIndex (aggregationContext: AggregationContext) (buckets: Bucket seq) =
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
      let lowCountIndex =
        match findAggregator DiffixLowCount aggregationContext.Aggregators with
        | Some index -> index
        | None -> failwith "Cannot find required aggregator for LED hook"

      led lowCountIndex aggregationContext buckets
