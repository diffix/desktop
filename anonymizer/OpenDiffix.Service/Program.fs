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


let runQuery query filePath anonParams =
  use dataProvider = new CSV.DataProvider(filePath) :> IDataProvider
  let context = QueryContext.make anonParams dataProvider
  QueryEngine.run context query

let quoteString (string: string) =
  "\"" + string.Replace("\"", "\"\"") + "\""

let csvFormat value =
  match value with
  | String string -> quoteString string
  | _ -> Value.toString value

let csvFormatter result =
  let header =
    result.Columns
    |> List.map (fun column -> quoteString column.Name)
    |> String.join ","

  let rows =
    result.Rows
    |> List.map (fun row -> row |> Array.map csvFormat |> String.join ",")

  header :: rows |> String.join "\n"

let handleLoad ({ InputPath = inputPath; Rows = rows }: LoadRequest) =
  let query = $"SELECT * FROM table LIMIT %d{rows}"

  AnonymizationParams.Default |> runQuery query inputPath |> encodeResponse

let unwrapCount count =
  match count with
  | Integer count -> count
  | _ -> failwith "Unexpected value type received for count."

let getAnonParams (requestAnonParams: RequestAnonParams) (salt: string) =
  {
    TableSettings = Map.empty
    Salt = Text.Encoding.UTF8.GetBytes(salt)
    Suppression = requestAnonParams.Suppression
    OutlierCount = requestAnonParams.OutlierCount
    TopCount = requestAnonParams.TopCount
    NoiseSD = requestAnonParams.NoiseSD
  }

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

  let query =
    $"""
      SELECT
        diffix_low_count(%s{aidColumn}),
        count(%s{countInput}), diffix_count(%s{countInput}, %s{aidColumn}),
        %s{String.join ", " buckets}
      FROM table
      GROUP BY %s{String.join ", " [ 4 .. buckets.Length + 3 ]}
    """

  let result = runQuery query inputPath anonParams

  let mutable totalBuckets = 0
  let mutable lowCountBuckets = 0
  let mutable totalRows = 0
  let mutable lowCountRows = 0

  let distortions = Array.create result.Rows.Length 0.0

  for row in result.Rows do
    let realCount = int (unwrapCount row.[1])
    totalBuckets <- totalBuckets + 1
    totalRows <- totalRows + realCount

    if row.[0] = Boolean true then
      lowCountBuckets <- lowCountBuckets + 1
      lowCountRows <- lowCountRows + realCount
    else
      let noisyCount = int (unwrapCount row.[2])
      let distortion = float (abs (noisyCount - realCount)) / float realCount
      let anonBucket = totalBuckets - lowCountBuckets - 1
      distortions.[anonBucket] <- distortion

  let anonBuckets = totalBuckets - lowCountBuckets
  let distortions = if anonBuckets = 0 then [| 0.0 |] else Array.truncate anonBuckets distortions
  Array.sortInPlace distortions

  let summary =
    {
      TotalBuckets = totalBuckets
      LowCountBuckets = lowCountBuckets
      TotalRows = totalRows
      LowCountRows = lowCountRows
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

  let query =
    $"""
      SELECT
        %s{String.join ", " buckets},
        diffix_count(%s{countInput}, %s{aidColumn}) AS count
      FROM table
      GROUP BY %s{String.join ", " [ 1 .. buckets.Length ]}
      HAVING NOT diffix_low_count(%s{aidColumn})
    """

  let output = anonParams |> runQuery query inputPath |> csvFormatter

  File.WriteAllText(outputPath, output)

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

  let queryResult = anonParams |> runQuery query inputPath
  queryResult.Rows.Length > 0 |> encodeResponse

let mainCore consoleInput =
  match consoleInput |> decodeRequest with
  | Load load -> handleLoad load
  | Preview preview -> handlePreview preview
  | Export export -> handleExport export
  | HasMissingValues hasMissingValues -> handleHasMissingValues hasMissingValues

[<EntryPoint>]
let main argv =
  Logger.backend <- Logger.LogMessage.toString >> eprintfn "%s"

  try
    // Option.map because we don't want a newline at the end on empty response
    Console.In.ReadToEnd() |> mainCore |> printf "%s"
    0

  with
  | e ->
    eprintfn $"ERROR: {e.ToString()}"
    1
