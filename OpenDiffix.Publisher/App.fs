module OpenDiffix.Publisher.App

open Feliz
open Feliz.UseElmish
open Elmish
open OpenDiffix.Publisher.SharedTypes

type Screen =
  | WelcomeScreen
  | AnonymizeScreen
  
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
  | ChangeScreen of Screen
  | LoadedSchema of FrontendTable
  | AnonymizedResult of TableData
  | RequestAnonymization
  
  // Column selection
  | SelectColumn of string
  | RemoveColumn of string

type State = {
  Screen: Screen
  Schema: FrontendTable option
  AnonymizedResult: IPCResult<TableData>
  SelectedColumns: Set<string>
}

let init() =
  let cmd =
    Cmd.ofSub (fun dispatch ->
      IPC.onSchemaChange(LoadedSchema >> dispatch)
      IPC.onAnonymizedResult(AnonymizedResult >> dispatch)
    )
  {
    Screen = WelcomeScreen
    Schema = None
    AnonymizedResult = NotRequested
    SelectedColumns = Set.empty
  }, cmd

let update msg state =
  match msg with
  | ChangeScreen newPage -> { state with Screen = newPage }, Cmd.none
  
  // IPC back from main app
  | LoadedSchema schema ->
    { state with Schema = Some schema; SelectedColumns = Set.empty }, Cmd.ofMsg (ChangeScreen AnonymizeScreen)
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
  
[<ReactComponent>]
let ColumnSelector state dispatch (columns: JsColumn list) =
  match columns with
  | [] -> React.fragment []
  | columns ->
    Html.div [
      prop.children [
        Html.div [
          prop.className "w-full bg-gray-200 text-sm px-1 py-0.5 text-gray-900"
          prop.text "Dimension"
        ]
        Html.ul [
          prop.className "space-y-2 text-sm mt-3 px-3" 
          prop.children (
            columns
            // The first column is the AID column. We skip it for the purposes of the UX
            |> List.skip 1
            |> List.map(fun column ->
              Html.li [
                prop.className "flex"
                prop.key column.Name
                prop.children [
                  let enabled = Set.contains column.Name state.SelectedColumns
                  ImportedComponents.Toggle (enabled, fun setEnabled ->
                    printfn $"Callback called with %A{setEnabled}"
                    if setEnabled
                    then dispatch <| SelectColumn column.Name
                    else dispatch <| RemoveColumn column.Name
                  )
                  Html.span [
                    prop.className "ml-2"
                    prop.text column.Name
                  ]
                ]
              ]
            )
          )
        ]
      ]
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
    
let renderWelcomeScreen =
  React.fragment [
    Html.h1 wordMark
    ImportedComponents.CsvDropzone IPC.loadCsv
  ]
  
let renderAnonymizeScreen (state: State) dispatch =
  Html.div [
    prop.className "flex flex-row-reverse"
    prop.children [
      Html.div [
        prop.className "w-64 flex-grow-0 border-l border-gray-100 h-screen overflow-auto"
        prop.children [
          match state.Schema with
          | None -> React.fragment []
          | Some schema -> ColumnSelector state dispatch schema.Columns 
        ]
      ]
      
      Html.div [
        prop.className "flex-grow bg-white"
        prop.children [
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
      ]
    ]
  ]
  
[<ReactComponent>]
let App() =
  let state, dispatch = React.useElmish(init, update, [| |])
  React.useEffectOnce (fun () -> IPC.loadCsv "/Users/sebastian/work-projects/DiffixPublisher/sample.csv")
  
  match state.Screen with
  | WelcomeScreen -> renderWelcomeScreen 
  | AnonymizeScreen -> renderAnonymizeScreen state dispatch