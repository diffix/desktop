module OpenDiffix.Service.Led

open OpenDiffix.Core

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

/// Returns an array of indexes pointing to anonymizing aggregators (diffix count, low count).
let private anonymizingAggregatorIndexes (aggregationContext: AggregationContext) =
  aggregationContext.Aggregators
  |> Seq.map fst
  |> Seq.indexed
  |> Seq.choose (fun (i, aggSpec) -> if Aggregator.isAnonymizing aggSpec then Some i else None)
  |> Seq.toArray

/// Merges only given indexes from source bucket to destination bucket.
let private mergeGivenAggregatorsInto (targetBucket: Bucket) aggIndexes (sourceBucket: Bucket) =
  targetBucket.RowCount <- targetBucket.RowCount + 1

  let sourceAggregators = sourceBucket.Aggregators
  let targetAggregators = targetBucket.Aggregators

  for i in aggIndexes do
    targetAggregators.[i].Merge(sourceAggregators.[i])

[<Literal>]
let TOP_VALUES = 3

/// Removes given value from the list.
/// In addition, truncates the list to at most TOP_VALUES elements.
let rec private removeValue index value list =
  if index = TOP_VALUES then
    [] // Trim off excess
  else
    match list with
    | [] -> []
    | (topValue, _topCount) :: tail when topValue = value -> tail
    | head :: tail -> head :: removeValue (index + 1) value tail

/// Inserts a (value, count) pair in the sorted list (in descending order).
/// In addition, truncates the list to at most TOP_VALUES elements.
let rec private insertValueSorted index (value, count) list =
  if index = TOP_VALUES then
    [] // Trim off excess
  else
    match list with
    | [] -> [ value, count ]
    | (_topValue, topCount) :: _tail when count > topCount -> (value, count) :: removeValue (index + 1) value list
    | head :: tail -> head :: insertValueSorted (index + 1) (value, count) tail

/// Used to keep track of value distribution for a column.
/// TopValues is a sorted list which is kept in sync with the three most frequent values.
type private ColumnState = { Values: Dictionary<Value, int>; mutable TopValues: (Value * int) list }

/// Determines isolating columns in the result set and returns an array of their indexes.
let private isolatingColumns (aggregationContext: AggregationContext) (buckets: Bucket array) =
  // The only columns that can be isolating columns are columns where:
  //   - One distinct value has at least 60% of all rows
  //   - Two distinct values each have at least 30% of all rows
  //   - Three distinct values each have at least 20% of all rows

  let countsByColumn =
    Array.init aggregationContext.GroupingLabels.Length (fun _ -> { Values = Dictionary(); TopValues = [] })

  let mutable totalRows = 0

  for bucket in buckets do
    let count = bucket.RowCount
    totalRows <- totalRows + count

    bucket.Group
    |> Array.iteri (fun i value ->
      let state = countsByColumn.[i]
      let currentCount = Dictionary.getOrDefault value 0 state.Values
      let newCount = currentCount + count
      state.Values.[value] <- newCount
      state.TopValues <- insertValueSorted 0 (value, newCount) state.TopValues
    )

  let aboveThreshold percent values =
    let threshold = int (float totalRows * percent)
    values |> List.forall (fun v -> v >= threshold)

  let isolatingColumns =
    countsByColumn
    |> Array.map (fun state -> state.TopValues |> List.map snd)
    |> Array.indexed
    |> Array.choose (
      function
      | i, v1 :: _ when [ v1 ] |> aboveThreshold 0.6 -> Some i
      | i, v1 :: v2 :: _ when [ v1; v2 ] |> aboveThreshold 0.3 -> Some i
      | i, v1 :: v2 :: v3 :: _ when [ v1; v2; v3 ] |> aboveThreshold 0.2 -> Some i
      | _other -> None
    )

  isolatingColumns

/// Tracks number of siblings for bucket column.
/// A sibling is a bucket that matches all other columns except the current one.
type private SiblingPerColumn =
  | NoBuckets
  | SingleBucket of bucket: Bucket * lowCount: bool
  | MultipleBuckets

/// Checks if any column is unknown.
/// An unknown column has no siblings.
let private hasUnknownColumn (siblingsPerColumn: SiblingPerColumn array) =
  siblingsPerColumn
  |> Array.exists (
    function
    | NoBuckets -> true
    | _ -> false
  )

/// Checks if any column is isolating.
/// An isolating column has a single high-count sibling.
let private hasIsolatingColumn (siblingsPerColumn: SiblingPerColumn array) =
  siblingsPerColumn
  |> Array.exists (
    function
    | SingleBucket (_, false) -> true
    | _ -> false
  )

let private led (aggregationContext: AggregationContext) (buckets: Bucket array) (isolatingColumns: int array) =
  let stopwatch = System.Diagnostics.Stopwatch.StartNew()
  let mergeHistogram = Dictionary<int, int>()
  let mutable bucketsLowCount = 0
  let mutable bucketsIsolatingColumn = 0
  let mutable bucketsMerged = 0
  let mutable comparisons = 0UL

  let bumpDistribution bucketCount =
    mergeHistogram.[bucketCount] <- (Dictionary.getOrDefault bucketCount 0 mergeHistogram) + 1

  let lowCountIndex = Utils.lowCountIndex aggregationContext
  let groupingLabelsLength = aggregationContext.GroupingLabels.Length

  let nonIsolatingColumns =
    [| 0 .. groupingLabelsLength - 1 |]
    |> Array.filter (fun column -> isolatingColumns |> Array.contains column |> not)

  let anonAggregators = anonymizingAggregatorIndexes aggregationContext

  let isolatorCache = Dictionary<Row, MutableList<Bucket * bool>>(Row.equalityComparer)

  let victimBuckets =
    buckets
    |> Array.choose (fun bucket ->
      let lowCount = Utils.isLowCount lowCountIndex bucket
      let cacheKey = nonIsolatingColumns |> Array.map (fun i -> bucket.Group.[i])
      let siblings = isolatorCache |> Dictionary.getOrInit cacheKey (fun _ -> MutableList())
      siblings.Add((bucket, lowCount))
      if lowCount then bucketsLowCount <- bucketsLowCount + 1
      if lowCount && bucket.RowCount <= 3 then Some(bucket, cacheKey) else None
    )

  // Main victim bucket loop
  for victimBucket, cacheKey in victimBuckets do
    let victimGroup = victimBucket.Group
    let siblingsPerColumn = Array.create groupingLabelsLength NoBuckets
    let isolatorCandidates = isolatorCache.[cacheKey]

    // Test for isolating columns
    for otherBucket, otherLowCount in isolatorCandidates do
      if not (obj.ReferenceEquals(victimBucket, otherBucket)) then
        comparisons <- comparisons + 1UL

        match findSingleNonMatchingColumn groupingLabelsLength victimGroup otherBucket.Group with
        | Some nonMatchingColumn ->
          siblingsPerColumn.[nonMatchingColumn] <-
            match siblingsPerColumn.[nonMatchingColumn] with
            | NoBuckets -> SingleBucket(otherBucket, otherLowCount)
            | _ -> MultipleBuckets
        | None -> ()

    if hasIsolatingColumn siblingsPerColumn then
      bucketsIsolatingColumn <- bucketsIsolatingColumn + 1

      // todo, unknown cols

      if hasUnknownColumn siblingsPerColumn then
        bucketsMerged <- bucketsMerged + 1

        siblingsPerColumn
        |> Array.iter (
          function
          | SingleBucket (siblingBucket, false) ->
            bumpDistribution victimBucket.RowCount
            victimBucket |> mergeGivenAggregatorsInto siblingBucket anonAggregators

            victimBucket
            |> Bucket.putAttribute BucketAttributes.IS_LED_MERGED (Boolean true)
          | _ -> ()
        )

  let isolatingColumnsStr = isolatingColumns |> Seq.map string |> String.join ", "

  let mergeHistogramStr =
    mergeHistogram
    |> Seq.sortBy (fun pair -> pair.Key)
    |> Seq.map (fun pair -> $"({pair.Key}, {pair.Value})")
    |> Seq.append [ $"(*, {mergeHistogram |> Seq.sumBy (fun pair -> pair.Value)})" ]
    |> String.join " "

  Logger.debug $"[LED] Total buckets: {buckets.Length}"
  Logger.debug $"[LED] Suppressed buckets: {bucketsLowCount}"
  Logger.debug $"[LED] Suppressed buckets below threshold: {victimBuckets.Length}"
  Logger.debug $"[LED] Isolating columns: [{isolatingColumnsStr}]"
  Logger.debug $"[LED] Buckets with isolating column(s): {bucketsIsolatingColumn}"
  Logger.debug $"[LED] Merged buckets: {bucketsMerged}"
  Logger.debug $"[LED] Merge distribution: {mergeHistogramStr}"
  Logger.debug $"[LED] Total comparisons: {comparisons}"
  Logger.debug $"[LED] Runtime: {stopwatch.Elapsed}"

  buckets :> Bucket seq

let hook (aggregationContext: AggregationContext) (buckets: Bucket seq) =
  // LED requires at least 2 columns - an isolating column and an unknown column.
  // With exactly 2 columns attacks are not useful because
  // they would have to isolate victims against the whole dataset.
  if aggregationContext.GroupingLabels.Length <= 2 then
    buckets
  else
    let buckets = Utils.toArray buckets
    let isolatingColumns = isolatingColumns aggregationContext buckets

    // Attacks are possible only if there are isolating columns.
    if isolatingColumns.Length > 0 then
      led aggregationContext buckets isolatingColumns
    else
      buckets :> Bucket seq
