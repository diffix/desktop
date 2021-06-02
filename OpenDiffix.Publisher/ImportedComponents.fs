module OpenDiffix.Publisher.ImportedComponents

open Feliz

[<ReactComponent(import="CsvDropzone", from="../src/renderer/CsvDropzone.js")>]
let CsvDropzone (loadCsv: string -> unit) = React.imported()

