module Led

open System
open OpenDiffix.Core

let private findSingleIndex cond arr =
  arr
  |> Array.indexed
  |> Array.filter (snd >> cond)
  |> function
    | [| index, _item |] -> Some index
    | _ -> None

let private findAggregator aggFn aggFns =
  aggFns
  |> findSingleIndex (
    function
    | AggregateFunction (fn, _) -> fn = aggFn
    | _ -> false
  )
  |> function
    | Some index -> index
    | None -> failwith "Cannot find required aggregator for executor hook"

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

type BucketState =
  {
    Aggregators: Aggregator.T array
    LowCountArguments: Collections.Generic.List<Value list>
    CountArguments: Collections.Generic.List<Value list>
    ExecutionContext: ExecutionContext
    OutputRow: Row
    mutable IsLowCount: bool
  }

type SiblingPerColumn =
  | NoBuckets
  | SingleBucket of BucketState
  | MultipleBuckets

let private mergeBucket groupingLabelsLength lowCountIndex countIndex destinationBucket fromBucket =
  let lowCountAggregator = destinationBucket.Aggregators.[lowCountIndex]
  let countAggregator = destinationBucket.Aggregators.[countIndex]

  fromBucket.LowCountArguments |> Seq.iter lowCountAggregator.Transition
  fromBucket.CountArguments |> Seq.iter countAggregator.Transition

  destinationBucket.OutputRow.[groupingLabelsLength + lowCountIndex] <-
    lowCountAggregator.Final destinationBucket.ExecutionContext

  destinationBucket.OutputRow.[groupingLabelsLength + countIndex] <-
    countAggregator.Final destinationBucket.ExecutionContext

let private LOCAL_AGGREGATION = false

let private executeLed executionContext (childPlan, groupingLabels, aggregators) : seq<Row> =
  let groupingLabels = Array.ofList groupingLabels
  let aggFns, aggArgs = aggregators |> Array.ofList |> Executor.Utils.unpackAggregators
  let groupingLabelsLength = groupingLabels.Length
  let rowSize = groupingLabelsLength + aggFns.Length

  let lowCountIndex = findAggregator DiffixLowCount aggFns
  let countIndex = findAggregator DiffixCount aggFns

  let mergeBucketInto = mergeBucket groupingLabelsLength lowCountIndex countIndex

  let makeBucket (group: Value array) =
    let bucketSeed = Executor.Utils.addValuesToSeed executionContext.NoiseLayers.BucketSeed group

    {
      Aggregators = aggFns |> Array.map (Aggregator.create executionContext LOCAL_AGGREGATION)
      LowCountArguments = Collections.Generic.List<Value list>()
      CountArguments = Collections.Generic.List<Value list>()
      ExecutionContext =
        { executionContext with
            NoiseLayers = { executionContext.NoiseLayers with BucketSeed = bucketSeed }
        }
      // Aggregator values are computed later
      OutputRow = Array.init rowSize (fun i -> if i < groupingLabelsLength then group.[i] else Null)
      IsLowCount = false
    }

  let state = Collections.Generic.Dictionary<Row, BucketState>(Row.equalityComparer)

  // Group rows into buckets and keep track of low-count/count arguments
  for row in Executor.execute executionContext childPlan do
    let argEvaluator = Expression.evaluate row
    let group = groupingLabels |> Array.map argEvaluator

    let bucket =
      match state.TryGetValue(group) with
      | true, bucketState -> bucketState
      | false, _ ->
        let bucketState = makeBucket group
        state.[group] <- bucketState
        bucketState

    bucket.Aggregators
    |> Array.iteri (fun i aggregator ->
      let args = aggArgs.[i] |> List.map argEvaluator

      if i = lowCountIndex then bucket.LowCountArguments.Add(args)
      else if i = countIndex then bucket.CountArguments.Add(args)

      args |> aggregator.Transition
    )

  // Compute aggregator final values
  let buckets =
    state
    |> Seq.map (fun pair ->
      let bucket = pair.Value
      let executionContext = bucket.ExecutionContext
      let outputRow = bucket.OutputRow

      bucket.Aggregators
      |> Array.iteri (fun i aggregator ->
        if i = lowCountIndex then
          let isLowCountValue = aggregator.Final executionContext
          bucket.IsLowCount <- Value.unwrapBoolean isLowCountValue
          outputRow.[groupingLabelsLength + i] <- isLowCountValue
        else
          outputRow.[groupingLabelsLength + i] <- aggregator.Final executionContext
      )

      bucket
    )
    |> Seq.toArray

  // Merge victim buckets into sibling buckets
  //
  // for each low count bucket:
  //   keep track of siblings per column (initially all empty lists)
  //
  //   for each other bucket:
  //     find index where a single column is different
  //     if such index:
  //       add bucket to that column's siblings
  //
  //   if a column without siblings exists:
  //     for each list of siblings per column:
  //       if siblings.length = 1 and not siblings[0].lowCount:
  //         merge bucket into siblings[0]
  buckets
  |> Array.iteri (fun i victimBucket ->
    if victimBucket.IsLowCount then
      let victimRow = victimBucket.OutputRow
      let siblingsPerColumn = Array.create groupingLabelsLength NoBuckets

      buckets
      |> Array.iteri (fun j otherBucket ->
        if i <> j then
          match findSingleNonMatchingColumn groupingLabelsLength victimRow otherBucket.OutputRow with
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
          | SingleBucket siblingBucket when not siblingBucket.IsLowCount ->
            Logger.debug $"Merging %A{victimRow} into %A{siblingBucket.OutputRow}"
            victimBucket |> mergeBucketInto siblingBucket
          | _ -> ()
        )
  )

  buckets |> Seq.map (fun bucket -> bucket.OutputRow)

let executorHook executionContext plan =
  match plan with
  | Plan.Aggregate (_plan, [], _aggregators) ->
    // Not applicable for global aggregation
    Executor.executePlanNode executionContext plan
  | Plan.Aggregate (plan, labels, aggregators) -> executeLed executionContext (plan, labels, aggregators)
  | _ -> Executor.executePlanNode executionContext plan
