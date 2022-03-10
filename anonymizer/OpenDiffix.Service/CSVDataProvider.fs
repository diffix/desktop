module OpenDiffix.Service.CSV

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

type private TypeInfo = { IsEmpty: bool; IsBoolean: bool; IsInteger: bool; IsReal: bool }

let private unknownTypeInfo = { IsEmpty = true; IsBoolean = true; IsInteger = true; IsReal = true }
let private integerTypeInfo = { IsEmpty = false; IsBoolean = false; IsInteger = true; IsReal = true }

let private parseBoolean (field: string) =
  if field = "1" then
    Boolean true
  else if field = "0" then
    Boolean false
  else
    match Boolean.TryParse field with
    | (true, value) -> Boolean value
    | (false, _) -> Null

let private parseInt64 (field: string) =
  match Int64.TryParse field with
  | (true, value) -> Integer value
  | (false, _) -> Null

let private parseDouble (field: string) =
  match Double.TryParse field with
  | (true, value) -> Real value
  | (false, _) -> Null

let private tryInferType (field: string) =
  if field = "" then
    Some unknownTypeInfo
  else
    Some
      {
        IsEmpty = false
        IsBoolean = parseBoolean field <> Null
        IsInteger = parseInt64 field <> Null
        IsReal = parseDouble field <> Null
      }

let private deriveColumnType (columnTypeInfo: TypeInfo) =
  if columnTypeInfo.IsEmpty then StringType
  else if columnTypeInfo.IsBoolean then BooleanType
  else if columnTypeInfo.IsInteger then IntegerType
  else if columnTypeInfo.IsReal then RealType
  else StringType

let private inferColumnTypes columnIndices (typeInfosByRow: TypeInfo option array list) =
  let inferred =
    columnIndices
    |> List.map (fun i ->
      typeInfosByRow
      |> Seq.map (fun rowTypeInfo -> rowTypeInfo.[i].Value)
      |> Seq.fold
        (fun (acc: TypeInfo) fieldTypeInfo ->
          { acc with
              IsEmpty = acc.IsEmpty && fieldTypeInfo.IsEmpty
              IsBoolean = acc.IsBoolean && fieldTypeInfo.IsBoolean
              IsInteger = acc.IsInteger && fieldTypeInfo.IsInteger
              IsReal = acc.IsReal && fieldTypeInfo.IsReal
          }
        )
        unknownTypeInfo
    )

  let row = Array.create (List.max columnIndices + 1) (UnknownType "")

  for inferredIndex, columnIndex in List.indexed columnIndices do
    row.[columnIndex] <- deriveColumnType inferred.[inferredIndex]


  row

let private parse columnType field =
  match columnType with
  | BooleanType -> parseBoolean field
  | IntegerType -> parseInt64 field
  | RealType -> parseDouble field
  | _ -> String field

type DataProvider(stream: TextReader, streamForTypes: TextReader) =
  let csv = openCsvStream stream
  let csvForTypes = openCsvStream streamForTypes
  let schemaColumnIndices = seq { 0 .. (csvForTypes.HeaderRecord.Length) } |> List.ofSeq

  let inferredColumnTypes =
    seq<TypeInfo option array> {
      while csvForTypes.Read() do
        let row = Array.create (csvForTypes.HeaderRecord.Length + 1) None

        for index in schemaColumnIndices do
          if index = 0 then
            // `RowIndex` column, which isn't coming from the CSV file.
            row.[0] <- Some integerTypeInfo
          else
            row.[index] <- csvForTypes.GetField(index - 1) |> tryInferType

        yield row
    }
    |> Seq.truncate 1000
    |> List.ofSeq
    |> inferColumnTypes schemaColumnIndices

  new(dbPath: string) = new DataProvider(new StreamReader(dbPath), new StreamReader(dbPath))

  interface IDisposable with
    member this.Dispose() =
      csv.Dispose()
      stream.Dispose()
      csvForTypes.Dispose()
      streamForTypes.Dispose()

  interface IDataProvider with
    member this.GetSchema() =

      let columns =
        csv.HeaderRecord
        |> Array.toList
        // `inferredColumnTypes.[0]` is reserved for `RowIndex`.
        |> List.mapi (fun i name -> { Name = name; Type = inferredColumnTypes.[i + 1] })

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
              row.[index] <- csv.GetField(index - 1) |> parse inferredColumnTypes.[index]

          yield row
      }
