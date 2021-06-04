module OpenDiffix.Publisher.IPC

open Fable.Core
open SharedTypes

// -------------------------------------------------------------------
// Actions
// -------------------------------------------------------------------

[<Emit("window.electron.loadFile($0)")>]
let loadCsv (fileName: string): unit = jsNative

[<Emit("window.electron.anonymizeForColumns($0)")>]
let anonymizeForColumns (columns: string list): unit = jsNative

// -------------------------------------------------------------------
// Callbacks
// -------------------------------------------------------------------

[<Emit("window.electron.onSchemaLoaded($0)")>]
let onSchemaLoaded (callback: EncodedFrontendTable -> unit): unit = jsNative

[<Emit("window.electron.onAnonymizedData($0)")>]
let onAnonymizedData (callback: EncodedTableData -> unit): unit = jsNative
