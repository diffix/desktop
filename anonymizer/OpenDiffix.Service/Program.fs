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

  let context = EvaluationContext.make anonParams dataProvider

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

  let output = AnonymizationParams.Default |> runQuery query inputPath |> encodeResponse

  printfn $"%s{output}"

let unwrapCount count =
  match count with
  | Integer count -> count
  | _ -> failwith "Unexpected value type received for count."

let handlePreview { InputPath = inputPath; Rows = rows; Salt = salt; Buckets = buckets } =
  let anonParams = { AnonymizationParams.Default with Salt = Text.Encoding.UTF8.GetBytes(salt) }

  let query =
    $"""
      SELECT
        diffix_low_count(RowIndex),
        count(*),
        diffix_count(RowIndex),
        %s{String.join ", " buckets}
      FROM table
      GROUP BY %s{String.join ", " [ 4 .. buckets.Length + 3 ]}
    """

  let result = runQuery query inputPath anonParams

  let mutable totalBuckets = 0L
  let mutable lowCountBuckets = 0L
  let mutable totalRows = 0L
  let mutable lowCountRows = 0L
  let mutable maxDistortion = 0.0
  let mutable sumDistortion = 0.0

  for row in result.Rows do
    let realCount = unwrapCount row.[1]
    totalBuckets <- totalBuckets + 1L
    totalRows <- totalRows + realCount

    if row.[0] = Boolean true then
      lowCountBuckets <- lowCountBuckets + 1L
      lowCountRows <- lowCountRows + realCount
    else
      let noisyCount = unwrapCount row.[2]
      let distortion = float (abs (noisyCount - realCount)) / float realCount
      maxDistortion <- max maxDistortion distortion
      sumDistortion <- sumDistortion + distortion

  let avgDistortion =
    if totalBuckets = lowCountBuckets then
      0.0
    else
      sumDistortion / float (totalBuckets - lowCountBuckets)

  let summary =
    {
      TotalBuckets = totalBuckets
      LowCountBuckets = lowCountBuckets
      TotalRows = totalRows
      LowCountRows = lowCountRows
      MaxDistortion = maxDistortion
      AvgDistortion = avgDistortion
    }

  let output = encodeResponse { Summary = summary; Rows = List.truncate rows result.Rows }
  printfn $"%s{output}"

let handleExport
  {
    InputPath = inputPath
    Salt = salt
    Buckets = buckets
    OutputPath = outputPath
  }
  =
  let anonParams = { AnonymizationParams.Default with Salt = Text.Encoding.UTF8.GetBytes(salt) }

  let query =
    $"""
      SELECT
        %s{String.join ", " buckets},
        diffix_count(RowIndex)
      FROM table
      GROUP BY %s{String.join ", " [ 1 .. buckets.Length ]}
      HAVING NOT diffix_low_count(RowIndex)
    """

  let output = anonParams |> runQuery query inputPath |> csvFormatter

  File.WriteAllText(outputPath, output)

[<EntryPoint>]
let main argv =
  try
    match Console.In.ReadToEnd() |> decodeRequest with
    | Load load -> handleLoad load
    | Preview preview -> handlePreview preview
    | Export export -> handleExport export

    0

  with e ->
    eprintfn $"ERROR: %s{e.Message}"
    1
