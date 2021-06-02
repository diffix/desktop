module OpenDiffix.Publisher.IPC

open Fable.Core
open SharedTypes

[<Emit("window.electron.loadFile($0)")>]
let loadCsv (fileName: string): unit = jsNative

[<Emit("window.electron.onSchemaChange($0)")>]
let onSchemaChange (callback: FrontendTable -> unit): unit = jsNative

[<Emit("window.electron.onAnonymizedResult($0)")>]
let onAnonymizedResult (callback: TableData -> unit): unit = jsNative

[<Emit("window.electron.anonymizeForColumns($0)")>]
let anonymizeForColumns (columns: string list): unit = jsNative
