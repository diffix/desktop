module OpenDiffix.Service.StarBucket

open OpenDiffix.Core

/// Merges all source aggregators into the target bucket.
let private mergeAllAggregatorsInto (targetBucket: Bucket) (sourceBucket: Bucket) =
  let targetAggregators = targetBucket.Aggregators

  sourceBucket.Aggregators |> Array.iteri (fun i -> targetAggregators.[i].Merge)

let private makeStarBucket (aggregationContext: AggregationContext) =
  let isGlobal = aggregationContext.GroupingLabels.Length = 0

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

let hook callback (aggregationContext: AggregationContext) (buckets: Bucket seq) =
  let starBucket = makeStarBucket aggregationContext
  let lowCountIndex = Utils.lowCountIndex aggregationContext
  let diffixCountIndex = Utils.diffixCountIndex aggregationContext

  let isInStarBucket bucket =
    let isAlreadyMerged =
      bucket
      |> Bucket.getAttribute BucketAttributes.IS_LED_MERGED
      |> Value.unwrapBoolean

    not isAlreadyMerged && Utils.isLowCount lowCountIndex bucket

  let bucketsInStarBucket =
    buckets
    |> Seq.filter isInStarBucket
    |> Seq.map (mergeAllAggregatorsInto starBucket)
    |> Seq.length

  let executionContext = starBucket.ExecutionContext

  let isStarBucketLowCount =
    starBucket.Aggregators.[lowCountIndex].Final(executionContext)
    |> Value.unwrapBoolean

  let suppressedAnonCount =
    // NOTE: we can have a suppress bin consisting of a single suppressed bucket,
    // which won't be suppressed by itself (different noise seed). In such case,
    // we must enforce the suppression manually.
    if isStarBucketLowCount || bucketsInStarBucket < 2 then
      Null
    else
      starBucket.Aggregators.[diffixCountIndex].Final(executionContext)

  callback suppressedAnonCount
  buckets
