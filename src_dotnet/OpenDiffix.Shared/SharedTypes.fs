module OpenDiffix.Shared

type JsColumn = {Name: string; SampleValues: string list}

type FrontendTable = { Name: string; Columns: JsColumn list }

type Row = string list

type TableData = {
  Headers: string list
  Rows: Row list
}