module JsonEncodersDecoders

open OpenDiffix.Core
open Thoth.Json.Net

type QueryRequest =
    { Query: string
      DbPath: string
      AnonymizationParameters: AnonymizationParams }

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
    Encode.object [ "name", Encode.string column.Name
                    "type", column.Type |> typeName |> Encode.string ]

let encodeQueryResult (queryResult: QueryEngine.QueryResult) =
    Encode.object [ "columns", Encode.list (queryResult.Columns |> List.map encodeColumn)
                    "rows", Encode.list (queryResult.Rows |> List.map encodeRow) ]

let encodeThreshold (t: Threshold) =
    Encode.object [ "lower", Encode.int t.Lower
                    "upper", Encode.int t.Upper ]

let encodeTableSettings (ts: TableSettings) =
    Encode.object [ "aid_columns", Encode.list (ts.AidColumns |> List.map Encode.string) ]

let encodeAnonParams (ap: AnonymizationParams) =
    Encode.object [ "table_settings",
                    Encode.list (
                        ap.TableSettings
                        |> Map.toList
                        |> List.map
                            (fun (table, settings) ->
                                Encode.object [ "table", Encode.string table
                                                "settings", encodeTableSettings settings ])
                    )
                    "minimum_allowed_aid_values", Encode.int ap.MinimumAllowedAids
                    "outlier_count", encodeThreshold ap.OutlierCount
                    "top_count", encodeThreshold ap.TopCount
                    "noise_sd", Encode.float ap.NoiseSD ]

let encodeRequestParams query dbPath anonParams =
    Encode.object [ "anonymization_parameters", encodeAnonParams anonParams
                    "query", Encode.string query
                    "database_path", Encode.string dbPath ]

let encodeErrorMsg errorMsg =
    Encode.object [ "success", Encode.bool false
                    "error", Encode.string errorMsg ]

let encodeIndividualQueryResponse queryRequest queryResult =
    Encode.object [ "success", Encode.bool true
                    "anonymization_parameters", encodeAnonParams queryRequest.AnonymizationParameters
                    "result", encodeQueryResult queryResult ]

let decodeRequestParams content =
    Decode.Auto.fromString<QueryRequest list> (content, caseStrategy = SnakeCase)
