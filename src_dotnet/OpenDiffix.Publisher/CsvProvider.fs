module OpenDiffix.Publisher.CsvProvider

open OpenDiffix.Core.CommonTypes

let private tableName table = table.Name

type CsvProvider (schema: Schema, data) =
  member this.OpenTable(_name) = data
  member this.GetSchema() = schema
  
let fromCsv (content: string, separator: char) =
  content.Split('\n')
  |> Array.map(fun line -> line.Split separator |> Array.toList)
  |> Array.toList
  |> function
    | [] -> CsvProvider([], Seq.empty)
    | headers :: rows ->
      let providedHeaderColumns = headers |> List.map(fun header -> { Name = header; Type = StringType })
      let aidColumn = {Name = "AID"; Type = IntegerType}
      let table = {
        Name = "data"
        Columns = aidColumn :: providedHeaderColumns
      }
      let values = rows |> List.mapi(fun index row -> Integer (int64 index) :: (row |> List.map String))
      CsvProvider ([table], values)