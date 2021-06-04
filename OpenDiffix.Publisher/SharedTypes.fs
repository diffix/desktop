module OpenDiffix.Publisher.SharedTypes

open Thoth.Json

type JsColumn = {Name: string; SampleValues: string list}

module IPCCoder =
  let inline pack<'a> (item: 'a) =
    "encoded=" + Encode.Auto.toString(0, item)
  
  let inline unpack<'a>(encodedString: string) =
    match Decode.Auto.fromString<'a>(encodedString.Substring(8)) with
    | Ok frontendTable -> frontendTable
    | Error msg -> failwith $"Failed to encode IPC message with %s{msg}"
  
type FrontendTable =
  { Name: string; Columns: JsColumn list }
  
type EncodedFrontendTable = string

type Row = string list

type TableData =
  {
    Headers: string list
    Rows: Row list
  }

type EncodedTableData = string