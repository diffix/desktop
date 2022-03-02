module OpenDiffix.Service.CSVFormatter

open OpenDiffix.Core
open OpenDiffix.Core.QueryEngine

let private quoteString (string: string) =
  "\"" + string.Replace("\"", "\"\"") + "\""

let private csvFormat value =
  match value with
  | String string -> quoteString string
  | _ -> Value.toString value

let format suppressedAnonCount (result: QueryResult) =
  let header =
    result.Columns
    |> List.map (fun column -> quoteString column.Name)
    |> String.join ","

  let starBucketRow =
    result.Columns
    |> List.map (
      function
      | { Name = "count" } -> csvFormat suppressedAnonCount
      | _ -> csvFormat (Value.String "*")
    )
    |> String.join ","

  let rows =
    result.Rows
    |> List.map (fun row -> row |> Array.map csvFormat |> String.join ",")

  match suppressedAnonCount with
  // no suppression took place _OR_ the star bucket was itself suppressed
  | Null -> header :: rows |> String.join "\n"
  // there was suppression and the star bucket wasn't suppressed
  | Integer _ -> header :: starBucketRow :: rows |> String.join "\n"
  | _ -> failwith "Unexpected value of SuppressedAnonCount"
