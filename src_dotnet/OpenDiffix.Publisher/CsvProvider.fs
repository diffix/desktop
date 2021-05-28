module OpenDiffix.Publisher.CsvProvider

open OpenDiffix
open OpenDiffix.Core.CommonTypes

let private tableName table = table.Name

type CsvProvider (schema: Schema, data) =
  interface IDataProvider with
    member this.OpenTable(_name) = data
    member this.GetSchema() = schema

let fromCsv (content: string, separator: char): Shared.Data =
  content.Split('\n')
  |> Array.map(fun line ->
    printfn $"Processing line: %s{line}"
    line.Split separator |> Array.toList
  )
  |> Array.toList
  |> function
    | [] ->
      {
        JsSchema = [||]
        Rows = [||]
        Columns = Array.empty
      }
      
    | headers :: rows ->
      let providedHeaderColumns = headers |> List.map(fun header -> { Name = header; Type = StringType })
      let aidColumn = {Name = "AID"; Type = IntegerType}
      let table: Shared.JsTable = {
        Name = "data"
        Columns = (aidColumn :: providedHeaderColumns) |> List.toArray
      }
      let rows =
        rows
        |> List.mapi(fun index row -> Integer (int64 index) :: (row |> List.map String) |> List.toArray)
        |> List.toArray
      
      {
        JsSchema = [| table |]
        Rows = rows
        Columns = table.Columns |> Array.map(fun column -> column.Name)
      }