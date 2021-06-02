module OpenDiffix.Publisher.App

open Feliz
open Feliz.UseElmish
open Elmish
open OpenDiffix.Publisher.SharedTypes

type Page =
  | WelcomeScreen
  
type IPCResult<'a> =
  | NotRequested
  | Requested of 'a option
  | Returned of 'a
  
  member this.SetRequested () =
    match this with
    | NotRequested -> Requested None
    | Returned data -> Requested (Some data)
    | other -> other
  
type Msg =
  | ChangePage of Page
  | LoadedSchema of FrontendTable
  | AnonymizedResult of TableData
  | RequestAnonymization
  
  // Column selection
  | SelectColumn of string
  | RemoveColumn of string

type State = {
  Page: Page
  Schema: FrontendTable option
  AnonymizedResult: IPCResult<TableData>
  SelectedColumns: Set<string>
}

let init() =
  let cmd =
    Cmd.ofSub (fun dispatch ->
      printfn "Creating subscription..."
      IPC.onSchemaChange(LoadedSchema >> dispatch)
      IPC.onAnonymizedResult(AnonymizedResult >> dispatch)
    )
  {
    Page = WelcomeScreen
    Schema = None
    AnonymizedResult = NotRequested
    SelectedColumns = Set.empty
  }, cmd

let update msg state =
  match msg with
  | ChangePage newPage -> { state with Page = newPage }, Cmd.none
  
  // IPC back from main app
  | LoadedSchema schema ->
    { state with Schema = Some schema; SelectedColumns = Set.empty }, Cmd.none
  | AnonymizedResult result ->
    { state with AnonymizedResult = Returned result }, Cmd.none
  
  | RequestAnonymization ->
    let selectedColumns = Set.toList state.SelectedColumns
    IPC.anonymizeForColumns selectedColumns
    { state with AnonymizedResult = state.AnonymizedResult.SetRequested() }, Cmd.none
    
  // Selecting and deselecting columns
  | SelectColumn columnName ->
    { state with SelectedColumns = Set.add columnName state.SelectedColumns }, Cmd.ofMsg RequestAnonymization
  | RemoveColumn columnName ->
    { state with SelectedColumns = Set.remove columnName state.SelectedColumns }, Cmd.ofMsg RequestAnonymization
    
let wordMark =
  Html.span [
    prop.className "font-bold text-white transition-all duration-500"
    prop.children [
      Html.span [
        prop.className "inline-block text-transparent bg-gradient-to-r bg-clip-text from-pink-500 to-purple-500"
        prop.text "Easy Diffix"
      ]
    ]
  ]

let button (title: string) action =
  Html.button [
    prop.text title
    prop.className "rounded ml-2 border hover:bg-gray-100 bg-gray-200 text-gray-900 text-xs px-1 py-0.5"
    prop.onClick (fun _e -> action ())
  ]
  
[<ReactComponent>]
let ColumnSelector state dispatch (columns: JsColumn list) =
  match columns with
  | [] -> React.fragment []
  | columns ->
    Html.ul [
      prop.className "space-y-1 text-sm mt-4" 
      prop.children (
        columns
        // The first column is the AID column. We skip it for the purposes of the UX
        |> List.skip 1
        |> List.map(fun column ->
          Html.li [
            prop.key column.Name
            prop.children [
              Html.span column.Name
              
              if Set.contains column.Name state.SelectedColumns
              then button "Remove" (fun () -> RemoveColumn column.Name |> dispatch)
              else button "Add" (fun () -> SelectColumn column.Name |> dispatch)
            ]
          ]
        )
      )
    ]
    
[<ReactComponent>]
let AnonymizedResult (results: TableData) =
  Html.div [
    prop.className "rounded bg-gray-50 p-2 mt-4"
    prop.children [
      Html.table [
        prop.className "w-full"
        prop.children [
          Html.thead [
            Html.tr (results.Headers |> List.map Html.th)
          ]
          
          Html.tbody [
            prop.className "border-t"
            prop.children (
              results.Rows
              |> List.map(fun row ->
                Html.tr (row |> List.map Html.td)
              )
            )
          ]
        ]
      ]
    ]
  ]
    
let renderWelcomeScreen (state: State) dispatch =
  React.fragment [
    Html.h1 wordMark
      
    ImportedComponents.CsvDropzone IPC.loadCsv
    
    match state.Schema with
    | None -> React.fragment []
    | Some schema -> ColumnSelector state dispatch schema.Columns 
    
    match state.AnonymizedResult with
    | NotRequested -> React.fragment []
    | Requested None ->
      Html.div [
        Html.span "Calculating results..."
      ]
    | Requested (Some previousResult) ->
      Html.div [
        prop.children [
          Html.span "Calculating results..."
          AnonymizedResult previousResult
        ]
      ]
    | Returned result ->
      AnonymizedResult result
  ]
  
[<ReactComponent>]
let App() =
  let state, dispatch = React.useElmish(init, update, [| |])
  
  match state.Page with
  | WelcomeScreen -> renderWelcomeScreen state dispatch