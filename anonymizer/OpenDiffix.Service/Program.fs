module OpenDiffix.Service.Program

open System
open System.IO

open OpenDiffix.Core
open OpenDiffix.Core.QueryEngine
open JsonEncodersDecoders

let toSalt =
  function
  | Some (salt: string) -> Text.Encoding.UTF8.GetBytes(salt)
  | _ -> [||]

let NO_HOOKS = []

let withHooks hooks context =
  { context with PostAggregationHooks = hooks }

let unwrapOption error option =
  match option with
  | Some value -> value
  | None -> failwith error

let runQuery hooks query (filePath: string) anonParams =
  use dataProvider = new CSV.DataProvider(filePath) :> IDataProvider
  let context = QueryContext.make anonParams dataProvider |> withHooks hooks
  QueryEngine.run context query

let handleLoad ({ InputPath = inputPath; Rows = rows }: LoadRequest) =
  let query = $"SELECT * FROM table LIMIT %d{rows}"

  AnonymizationParams.Default
  |> runQuery NO_HOOKS query inputPath
  |> encodeResponse

let safeUnwrapCount count =
  match count with
  | Integer count -> Some(int count)
  | _ -> None

let unwrapCount count =
  count
  |> safeUnwrapCount
  |> function
    | Some count -> count
    | _ -> failwith "Unexpected value type received for count."

let getAnonParams (requestAnonParams: RequestAnonParams) (salt: string) =
  {
    TableSettings = Map.empty
    Salt = Text.Encoding.UTF8.GetBytes(salt)
    Suppression = requestAnonParams.Suppression
    OutlierCount = requestAnonParams.OutlierCount
    TopCount = requestAnonParams.TopCount
    LayerNoiseSD = requestAnonParams.LayerNoiseSD
  }

let prependStarBucketRow suppressedAnonCount result =
  if suppressedAnonCount <> Null then
    let starBucketRow =
      result.Columns
      |> List.map (
        function
        | { Name = "count" } -> suppressedAnonCount
        | _ -> String "*"
      )
      |> Array.ofList

    { result with Rows = starBucketRow :: result.Rows }
  else
    result

let handlePreview
  {
    InputPath = inputPath
    AidColumn = aidColumn
    Rows = rows
    Salt = salt
    Buckets = buckets
    CountInput = countInput
    AnonParams = requestAnonParams
  }
  =
  let anonParams = getAnonParams requestAnonParams salt

  let countInput =
    match countInput with
    | Rows -> "*"
    | Entities -> $"distinct %s{aidColumn}"

  let countColumns =
    $"""
      diffix_low_count(%s{aidColumn}),
      count(%s{countInput}),
      diffix_count(%s{countInput}, %s{aidColumn})
    """

  let query =
    if Array.isEmpty buckets then
      $"SELECT %s{countColumns} FROM table"
    else
      $"""
        SELECT %s{countColumns}, %s{String.join ", " buckets}
        FROM table
        GROUP BY %s{String.join ", " [ 4 .. buckets.Length + 3 ]}
      """

  // We get a hold of the star bucket results reference via side effects.
  let mutable suppressedAnonCount = Null
  let pullHookResultsCallback results = suppressedAnonCount <- results
  let starBucketHook = StarBucket.hook pullHookResultsCallback

  let result = runQuery [ Led.hook; starBucketHook ] query inputPath anonParams

  let mutable totalBuckets = 0
  let mutable suppressedBuckets = 0
  let mutable totalCount = 0
  let mutable suppressedCount = 0

  let distortions = Array.create result.Rows.Length 0.0

  for row in result.Rows do
    let realCount = unwrapCount row.[1]
    totalBuckets <- totalBuckets + 1
    totalCount <- totalCount + realCount

    if row.[0] = Boolean true then
      suppressedBuckets <- suppressedBuckets + 1
      suppressedCount <- suppressedCount + realCount
    else
      let noisyCount = unwrapCount row.[2]
      let distortion = float (abs (noisyCount - realCount)) / float realCount
      let anonBucket = totalBuckets - suppressedBuckets - 1
      distortions.[anonBucket] <- distortion

  let anonBuckets = totalBuckets - suppressedBuckets
  let distortions = if anonBuckets = 0 then [| 0.0 |] else Array.truncate anonBuckets distortions
  Array.sortInPlace distortions

  let summary =
    {
      TotalBuckets = totalBuckets
      SuppressedBuckets = suppressedBuckets
      TotalCount = totalCount
      SuppressedCount = suppressedCount
      SuppressedAnonCount = safeUnwrapCount suppressedAnonCount
      MaxDistortion = Array.last distortions
      MedianDistortion = distortions.[anonBuckets / 2]
    }

  encodeResponse { Summary = summary; Rows = List.truncate rows result.Rows }

let handleExport
  {
    InputPath = inputPath
    AidColumn = aidColumn
    Salt = salt
    Buckets = buckets
    CountInput = countInput
    OutputPath = outputPath
    AnonParams = requestAnonParams
  }
  =
  let anonParams = getAnonParams requestAnonParams salt

  let countInput =
    match countInput with
    | Rows -> "*"
    | Entities -> $"distinct %s{aidColumn}"

  let countColumn = $"diffix_count(%s{countInput}, %s{aidColumn}) AS count"

  // We get a hold of the star bucket results reference via side effects.
  let mutable suppressedAnonCount = Null

  let hooks, query =
    if Array.isEmpty buckets then
      [], $"SELECT %s{countColumn} FROM table"
    else
      let pullHookResultsCallback results = suppressedAnonCount <- results
      let starBucketHook = StarBucket.hook pullHookResultsCallback

      [ Led.hook; starBucketHook ],
      $"""
        SELECT %s{String.join ", " buckets}, %s{countColumn}
        FROM table
        GROUP BY %s{String.join ", " [ 1 .. buckets.Length ]}
        HAVING NOT diffix_low_count(%s{aidColumn})
      """

  let result =
    anonParams
    |> runQuery hooks query inputPath
    |> prependStarBucketRow suppressedAnonCount

  File.WriteAllText(outputPath, CSVFormatter.format result)
  ""

let handleHasMissingValues
  {
    HasMissingValuesRequest.InputPath = inputPath
    HasMissingValuesRequest.AidColumn = aidColumn
  }
  =
  let anonParams = AnonymizationParams.Default

  let query =
    $"""
      SELECT %s{aidColumn}
      FROM table
      WHERE %s{aidColumn} is NULL or %s{aidColumn} = ''
      LIMIT 1
    """

  let queryResult = anonParams |> runQuery NO_HOOKS query inputPath
  queryResult.Rows.Length > 0 |> encodeResponse

let mainCore consoleInput =
  match consoleInput |> decodeRequest with
  | Load load -> handleLoad load
  | Preview preview -> handlePreview preview
  | Export export -> handleExport export
  | HasMissingValues hasMissingValues -> handleHasMissingValues hasMissingValues

[<EntryPoint>]
let main _argv =
  Logger.backend <- Logger.LogMessage.toString >> eprintfn "%s"

  try
    // Option.map because we don't want a newline at the end on empty response
    Console.In.ReadToEnd() |> mainCore |> printf "%s"
    0

  with
  | e ->
    eprintfn $"ERROR: {e.ToString()}"
    1
