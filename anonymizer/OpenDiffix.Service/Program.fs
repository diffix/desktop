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

let jsonFormatter = encodeQueryResult >> Thoth.Json.Net.Encode.toString 2

let handleLoad ({ InputPath = inputPath; Rows = rows }: Load) =
  let query = $"SELECT * FROM table LIMIT %d{rows}"
  let output = AnonymizationParams.Default |> runQuery query inputPath |> jsonFormatter
  printfn $"%s{output}"

let handlePreview { InputPath = inputPath; Rows = rows; Salt = salt; Query = query } =
  let anonParams = { AnonymizationParams.Default with Salt = Text.Encoding.UTF8.GetBytes(salt) }
  let output = anonParams |> runQuery query inputPath |> jsonFormatter
  printfn $"%s{output}"

let handleExport { InputPath = inputPath; Salt = salt; Query = query; OutputPath = outputPath } =
  let anonParams = { AnonymizationParams.Default with Salt = Text.Encoding.UTF8.GetBytes(salt) }
  let output = anonParams |> runQuery query inputPath |> csvFormatter
  use writer = new StreamWriter(outputPath)
  fprintfn writer $"%s{output}"

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
