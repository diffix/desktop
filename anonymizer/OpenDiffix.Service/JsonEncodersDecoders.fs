module OpenDiffix.Service.JsonEncodersDecoders

open OpenDiffix.Core
open Thoth.Json.Net

type Summary =
  {
    TotalBuckets: int
    SuppressedBuckets: int
    TotalCount: int
    SuppressedCount: int
    // `None` if the star bucket has been suppressed
    SuppressedAnonCount: int option
    MaxDistortion: float
    MedianDistortion: float
    TotalDistortion: float
  }

type LoadResponse = QueryEngine.QueryResult

type PreviewResponse = { Summary: Summary; Rows: Row list }

type LoadRequest = { InputPath: string; Rows: int }

type CountInput =
  | Rows
  | Entities

type RequestAnonParams =
  {
    Suppression: SuppressionParams

    // Count params
    OutlierCount: Interval
    TopCount: Interval
    LayerNoiseSD: float

    RecoverOutliers: bool
  }

type PreviewRequest =
  {
    InputPath: string
    AidColumn: string
    Rows: int
    Salt: string
    Buckets: string []
    CountInput: CountInput
    AnonParams: RequestAnonParams
  }

type ExportRequest =
  {
    InputPath: string
    AidColumn: string
    Salt: string
    Buckets: string []
    OutputPath: string
    CountInput: CountInput
    AnonParams: RequestAnonParams
  }

type HasMissingValuesRequest = { InputPath: string; AidColumn: string }

type HasMissingValuesResponse = bool

type Request =
  | Load of LoadRequest
  | Preview of PreviewRequest
  | Export of ExportRequest
  | HasMissingValues of HasMissingValuesRequest

let private encodeIntOption =
  function
  | Some int -> Encode.int int
  | None -> Encode.nil

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
  | UnknownType _ -> "unknown"
  | ListType _ -> "list"

let private encodeType = typeName >> Encode.string

let private generateDecoder<'T> = Decode.Auto.generateDecoder<'T> CamelCase

let private extraCoders =
  Extra.empty
  |> Extra.withCustom encodeType generateDecoder<ExpressionType>
  |> Extra.withCustom encodeValue generateDecoder<Value>
  |> Extra.withCustom encodeIntOption generateDecoder<int option>

let private decodeType request =
  Decode.Auto.unsafeFromString (request, caseStrategy = CamelCase, extra = extraCoders)

let encodeResponse response =
  Encode.Auto.toString (2, response, caseStrategy = CamelCase, extra = extraCoders)

let decodeRequest request =
  match Decode.unsafeFromString (Decode.field "type" Decode.string) request with
  | "Load" -> Load(decodeType request)
  | "Preview" -> Preview(decodeType request)
  | "Export" -> Export(decodeType request)
  | "HasMissingValues" -> HasMissingValues(decodeType request)
  | unknownType -> failwith $"Unknown request type: %s{unknownType}"
