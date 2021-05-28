module OpenDiffix.Shared

open OpenDiffix.Core.CommonTypes

type JsTable = { Name: string; Columns: Column array }

type Data = {
  JsSchema: JsTable array
  Rows: Row array
  Columns: string array
}