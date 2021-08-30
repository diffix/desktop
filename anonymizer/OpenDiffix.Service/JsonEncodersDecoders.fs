module JsonEncodersDecoders

open OpenDiffix.Core
open Thoth.Json.Net

let rec encodeValue =
  function
  | Null -> Encode.nil
  | Boolean bool -> Encode.bool bool
  | Integer int64 -> Encode.int64 int64
  | Real float -> Encode.float float
  | String string -> Encode.string string
  | List values -> Encode.list (values |> List.map encodeValue)

let rec typeName =
  function
  | BooleanType -> "boolean"
  | IntegerType -> "integer"
  | RealType -> "real"
  | StringType -> "text"
  | ListType itemType -> typeName itemType + "[]"
  | UnknownType _ -> "unknown"

let encodeRow values =
  Encode.list (values |> Array.toList |> List.map encodeValue)

let encodeColumn (column: Column) =
  Encode.object [ "name", Encode.string column.Name; "type", column.Type |> typeName |> Encode.string ]

let encodeQueryResult (queryResult: QueryEngine.QueryResult) =
  Encode.object [
    "columns", Encode.list (queryResult.Columns |> List.map encodeColumn)
    "rows", Encode.list (queryResult.Rows |> List.map encodeRow)
  ]

type Load = { InputPath: string; Rows: int }

type Preview = { InputPath: string; Rows: int; Salt: string; Query: string }

type Export = { InputPath: string; Salt: string; Query: string; OutputPath: string }

type Request =
  | Load of Load
  | Preview of Preview
  | Export of Export

let decodeType<'T> request =
  Decode.Auto.unsafeFromString<'T> (request, caseStrategy = CamelCase)

let decodeRequest request =
  match Decode.unsafeFromString (Decode.field "type" Decode.string) request with
  | "Load" -> Load(decodeType<Load> request)
  | "Preview" -> Preview(decodeType<Preview> request)
  | "Export" -> Export(decodeType<Export> request)
  | unknownType -> failwith $"Unknown request type: %s{unknownType}"
