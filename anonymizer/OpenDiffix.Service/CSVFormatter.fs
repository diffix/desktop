module OpenDiffix.Service.CSVFormatter

open OpenDiffix.Core
open OpenDiffix.Core.QueryEngine

let private quoteString (string: string) =
  "\"" + string.Replace("\"", "\"\"") + "\""

let private csvFormat value =
  match value with
  | Null -> ""
  // Lowercase `Boolean` in order to be consistent with JavaScript rendering.
  | Boolean false -> "false"
  | Boolean true -> "true"
  | String string -> quoteString string
  | _ -> Value.toString value

let format (result: QueryResult) =
  let header =
    result.Columns
    |> List.map (fun column -> quoteString column.Name)
    |> String.join ","

  let rows =
    result.Rows
    |> List.map (fun row -> row |> Array.map csvFormat |> String.join ",")

  header :: rows |> String.join "\n"
