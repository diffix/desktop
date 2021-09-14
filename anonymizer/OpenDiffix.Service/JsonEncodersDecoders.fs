module JsonEncodersDecoders

open OpenDiffix.Core
open Thoth.Json.Net

type Summary =
  {
    TotalBuckets: int
    LowCountBuckets: int
    TotalRows: int
    LowCountRows: int
    MaxDistortion: float
    MedianDistortion: float
  }

type LoadResponse = QueryEngine.QueryResult

type PreviewResponse = { Summary: Summary; Rows: Row list }

type LoadRequest = { InputPath: string; Rows: int }

type PreviewRequest =
  {
    InputPath: string
    AidColumn: string
    Rows: int
    Salt: string
    Buckets: string []
  }

type ExportRequest =
  {
    InputPath: string
    AidColumn: string
    Salt: string
    Buckets: string []
    OutputPath: string
  }

type Request =
  | Load of LoadRequest
  | Preview of PreviewRequest
  | Export of ExportRequest

let rec private encodeValue =
  function
  | Null -> Encode.nil
  | Boolean bool -> Encode.bool bool
  | Integer int64 -> Encode.float (float int64)
  | Real float -> Encode.float float
  | String string -> Encode.string string
  | List values -> Encode.list (values |> List.map encodeValue)

let rec private typeName =
  function
  | BooleanType -> "boolean"
  | IntegerType -> "integer"
  | RealType -> "real"
  | StringType -> "text"
  | ListType itemType -> typeName itemType + "[]"
  | UnknownType _ -> "unknown"

let private encodeType = typeName >> Encode.string

let private generateDecoder<'T> = Decode.Auto.generateDecoder<'T> CamelCase

let private extraEncoders =
  Extra.empty
  |> Extra.withCustom encodeType generateDecoder<ExpressionType>
  |> Extra.withCustom encodeValue generateDecoder<Value>

let private decodeType request =
  Decode.Auto.unsafeFromString (request, caseStrategy = CamelCase)

let encodeResponse response =
  Encode.Auto.toString (2, response, caseStrategy = CamelCase, extra = extraEncoders)

let decodeRequest request =
  match Decode.unsafeFromString (Decode.field "type" Decode.string) request with
  | "Load" -> Load(decodeType request)
  | "Preview" -> Preview(decodeType request)
  | "Export" -> Export(decodeType request)
  | unknownType -> failwith $"Unknown request type: %s{unknownType}"
