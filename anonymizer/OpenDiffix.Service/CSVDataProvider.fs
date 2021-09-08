module CSV

open System
open System.Globalization
open System.IO
open CsvHelper
open OpenDiffix.Core

let private openCSVStream stream =
  let configuration = Configuration.CsvConfiguration(CultureInfo.InvariantCulture)

  configuration.DetectDelimiter <- true
  let csv = new CsvReader(stream, configuration)

  if not (csv.Read() && csv.ReadHeader()) then
    csv.Dispose()
    failwith "Invalid data header!"

  csv

type DataProvider(dbPath: string) =
  let stream = new StreamReader(dbPath)
  let csv = openCSVStream stream

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

    member this.OpenTable(table) =
      assert (table.Name = "table")

      seq<Row> {
        let mutable index = 0L

        while csv.Read() do
          index <- index + 1L

          yield
            Array.init csv.HeaderRecord.Length (csv.GetField >> String)
            |> Array.append [| Integer index |]
      }
