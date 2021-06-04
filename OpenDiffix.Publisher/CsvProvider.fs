module OpenDiffix.Publisher.CsvProvider

open OpenDiffix.Core.CommonTypes

let tableName = "data"

type ParsedData = {
  Columns: Column list
  Rows: Row seq
}

type CsvProvider (parsedData: ParsedData) =
  interface IDataProvider with
    member this.OpenTable(_name) = parsedData.Rows
    member this.GetSchema() =
      [
        {
          Name = tableName
          Columns = parsedData.Columns
        }
      ]

module private DataCleaner =
  let cleanColumnValue (columnValue: string) =
    columnValue.Trim('"')
  
let parseCsv(content: string, separator: char): ParsedData =
  content.Split('\n')
  |> Array.map(fun line ->
    line.Split separator
    |> Array.toList
    |> List.map DataCleaner.cleanColumnValue
  )
  |> Array.toList
  |> function
    | [] ->
      {
        Columns = []
        Rows = [||]
      }
      
    | headers :: rows ->
      let providedHeaderColumns = headers |> List.map(fun header -> { Name = header; Type = StringType })
      let aidColumn = {Name = "AID"; Type = IntegerType}
      let columns = aidColumn :: providedHeaderColumns
      
      let rows =
        rows
        |> List.mapi(fun index row -> Integer (int64 index) :: (row |> List.map String) |> List.toArray)
        |> List.toArray
      
      let tableData: ParsedData =
        {
          Columns = columns
          Rows = rows
        }
      
      tableData

let toDataProvider (parsedData: ParsedData) =
  CsvProvider(parsedData)
  
let toFrontendTable (parsedData: ParsedData): SharedTypes.EncodedTableData =
  let sampleRows =
    parsedData.Rows
    |> Seq.truncate 10
    |> Array.ofSeq
  
  let frontendTable: SharedTypes.FrontendTable = 
    {
      Name = tableName
      Columns =
        parsedData.Columns
        |> List.mapi(fun i column ->
          {
            Name = column.Name
            SampleValues =
              sampleRows
              |> Array.map(fun (row: Row) -> row |> Array.item i |> OpenDiffix.Core.Value.toString)
              |> Array.toList
          }
        )
    }
  SharedTypes.IPCCoder.pack<SharedTypes.FrontendTable>(frontendTable)