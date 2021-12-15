namespace OpenDiffix.Service

open OpenDiffix.Core

module BucketAttributes =
  let IS_LED_MERGED = "is_led_merged"
  let IS_STAR_BUCKET = "is_star_bucket"

module Utils =
  let private findSingleIndex cond arr =
    arr
    |> Array.indexed
    |> Array.filter (snd >> cond)
    |> function
      | [| index, _item |] -> Some index
      | _ -> None

  let private findAggregator aggFn aggregators =
    aggregators |> findSingleIndex (fun ((fn, _), _) -> fn = aggFn)

  let isLowCount lowCountIndex bucket =
    bucket.Aggregators.[lowCountIndex].Final(bucket.ExecutionContext)
    |> Value.unwrapBoolean

  let lowCountIndex (aggregationContext: AggregationContext) =
    match findAggregator DiffixLowCount aggregationContext.Aggregators with
    | Some index -> index
    | None -> failwith "Cannot find required DiffixLowCount aggregator"

  let diffixCountIndex (aggregationContext: AggregationContext) =
    match findAggregator DiffixCount aggregationContext.Aggregators with
    | Some index -> index
    | None -> failwith "Cannot find required DiffixCount aggregator"

  let safeIter fn (seq: 'a seq) : 'a array =
    match seq with
    | :? ('a array) as arr ->
      Array.iter fn arr
      arr
    | _ ->
      seq
      |> Seq.map (fun x ->
        fn x
        x
      )
      |> Seq.toArray
