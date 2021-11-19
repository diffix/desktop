module CSV

open System
open System.Globalization
open System.IO
open CsvHelper
open OpenDiffix.Core

let private openCsvStream stream =
  let configuration = Configuration.CsvConfiguration(CultureInfo.InvariantCulture)

  configuration.DetectDelimiter <- true
  let csv = new CsvReader(stream, configuration)

  if not (csv.Read() && csv.ReadHeader()) then
    csv.Dispose()
    failwith "Invalid data header!"

  csv

type DataProvider(stream: TextReader) =
  let csv = openCsvStream stream

  new(dbPath: string) = new DataProvider(new StreamReader(dbPath))

  interface IDisposable with
    member this.Dispose() =
      csv.Dispose()
      stream.Dispose()

  interface IDataProvider with
    member this.GetSchema() =
      let columns =
        csv.HeaderRecord
        |> Array.toList
        |> List.map (fun name -> { Name = name; Type = StringType })

      [
        {
          Name = "table"
          Columns = { Name = "RowIndex"; Type = IntegerType } :: columns
        }
      ]

    member this.OpenTable(table, columnIndices) =
      assert (table.Name = "table")

      seq<Row> {
        let mutable rowIndex = 0L

        while csv.Read() do
          rowIndex <- rowIndex + 1L

          let row = Array.create (csv.HeaderRecord.Length + 1) Null

          for index in columnIndices do
            if index = 0 then
              row.[0] <- Integer rowIndex
            else
              row.[index] <- csv.GetField(index - 1) |> String

          yield row
      }
