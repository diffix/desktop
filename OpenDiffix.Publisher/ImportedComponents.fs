module OpenDiffix.Publisher.ImportedComponents

open Feliz

[<ReactComponent(import="CsvDropzone", from="../src/renderer/components/CsvDropzone.js")>]
let CsvDropzone (loadCsv: string -> unit) = React.imported()

[<ReactComponent(import="Toggle", from="../src/renderer/components/Toggle.js")>]
let Toggle (enabled: bool, setEnabled: bool -> unit) = React.imported()