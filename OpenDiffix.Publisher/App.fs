module OpenDiffix.Publisher.App

open Feliz
open Feliz.UseElmish
open Elmish
open OpenDiffix.Publisher.SharedTypes

type IPCResult<'a> =
  | NotRequested
  | Requested of 'a option
  | Returned of 'a
  
  member this.SetRequested () =
    match this with
    | NotRequested -> Requested None
    | Returned data -> Requested (Some data)
    | other -> other
    
type AnonState =
  {
    Schema: IPCResult<FrontendTable>
    AnonymizedResult: IPCResult<TableData>
    SelectedColumns: Set<string>
  }
  
  static member Empty =
    {
      Schema = NotRequested
      AnonymizedResult = NotRequested
      SelectedColumns = Set.empty
    }

type Screen =
  | WelcomeScreen
  | AnonymizeScreen of AnonState
  
type Msg =
  | StartOver
  | LoadCsv of string
  | LoadedSchema of FrontendTable
  | AnonymizedResult of TableData
  | RequestAnonymization
  
  // Column selection
  | SelectColumn of string
  | RemoveColumn of string
  
  // Misc
  | IPCException of exn

type State = {
  Screen: Screen
}

let init() =
  let subscriptionCmd =
    Cmd.ofSub (fun dispatch ->
      IPC.onAnonymizedData(IPCCoder.unpack<TableData> >> AnonymizedResult >> dispatch)
      IPC.onSchemaLoaded(IPCCoder.unpack<FrontendTable> >> LoadedSchema >> dispatch)
    )
  { Screen = WelcomeScreen }, subscriptionCmd
  
let updateAnonState state fn =
  match state.Screen with
  | AnonymizeScreen anonState ->
    let updatedState, cmd = fn anonState
    { state with Screen = AnonymizeScreen updatedState }, cmd
  | _ ->
    Browser.Dom.console.error($"Attempting to update state related to anonymization screen while not there!")
    state, Cmd.none

let update msg state =
  match msg with
  | StartOver -> { state with Screen = WelcomeScreen }, Cmd.none
  
  // ----------------------------------------------------------------
  // Welcome screen
  // ----------------------------------------------------------------
  | LoadCsv fileName ->
    IPC.loadCsv fileName
    { state with Screen = AnonymizeScreen {AnonState.Empty with Schema = Requested None}}, Cmd.none
    
  // ----------------------------------------------------------------
  // ANON SCREEN
  // ----------------------------------------------------------------
  
  // IPC back from main app
  | LoadedSchema schema ->
    updateAnonState state (fun anonState -> { anonState with Schema = Returned schema }, Cmd.ofMsg RequestAnonymization)
  | AnonymizedResult result ->
    updateAnonState state (fun anonState -> { anonState with AnonymizedResult = Returned result }, Cmd.none)
    
  | RequestAnonymization ->
    updateAnonState state (fun anonState ->
      IPC.anonymizeForColumns (Set.toList anonState.SelectedColumns)
      { anonState with AnonymizedResult = anonState.AnonymizedResult.SetRequested() }, Cmd.none
    )
  | SelectColumn columnName ->
    updateAnonState state (fun anonState ->
      { anonState with SelectedColumns = Set.add columnName anonState.SelectedColumns }, Cmd.ofMsg RequestAnonymization
    )
  | RemoveColumn columnName ->
    updateAnonState state (fun anonState ->
      { anonState with SelectedColumns = Set.remove columnName anonState.SelectedColumns }, Cmd.ofMsg RequestAnonymization
    )
    
  // ----------------------------------------------------------------
  // IPC
  // ----------------------------------------------------------------
  | IPCException exn ->
    printfn $"Got an exception on the IPC call: %s{exn.Message}"
    state, Cmd.none
    
let wordmarkify (phrase: string) =
  Html.span [
    prop.className "font-bold text-white transition-all duration-500"
    prop.children [
      Html.span [
        prop.className "inline-block text-transparent bg-gradient-to-r bg-clip-text from-pink-500 to-purple-500"
        prop.text phrase
      ]
    ]
  ]
  
[<ReactComponent>]
let ColumnSelector state dispatch (columns: JsColumn list) =
  match columns with
  | [] -> React.fragment []
  | columns ->
    Html.ul [
      prop.className "space-y-2 text-sm mt-3" 
      prop.children (
        columns
        // The first column is the AID column. We skip it for the purposes of the UX
        |> List.skip 1
        |> List.map(fun column ->
          let enabled = Set.contains column.Name state.SelectedColumns
          Html.li [
            prop.className "flex"
            prop.key column.Name
            prop.children [
              ImportedComponents.Toggle (enabled, fun setEnabled ->
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
    
[<ReactComponent>]
let AnonymizedResultTable (results: TableData) =
  Html.div [
    prop.className "rounded bg-gray-50 p-4 mt-2"
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
    
let renderWelcomeScreen dispatch =
  Html.div [
    prop.className "h-screen"
    prop.children [
      Html.div [
        prop.className "p-4 h-full flex flex-col"
        prop.children [
          Html.div [
            prop.className "text-4xl flex-grow-0"
            prop.children [
              Html.h1 [
                wordmarkify "Easy Diffix"
              ]
            ]
          ]
          Html.div [
            prop.className "flex-grow pb-4"
            prop.children [
              ImportedComponents.CsvDropzone (fun fileName -> dispatch (LoadCsv fileName))
            ]
          ]
        ]
      ]
    ]
  ]
  
let isAnonymizing (state: AnonState) =
  match state.AnonymizedResult with
  | Requested _ -> true
  | _ -> false
  
let renderAnonymizeScreen (state: AnonState) dispatch =
  let conditionalClasses =
    if isAnonymizing state
    then "animate-pulse"
    else ""
  Html.div [
    prop.className $"flex flex-row-reverse text-gray-800 overflow-hidden %s{conditionalClasses}"
    prop.children [
      Html.div [
        prop.className "w-64 flex-grow-0 border-l bg-gray-100 h-screen flex flex-col"
        prop.children [
          Html.div [
            prop.className "flex-grow overflow-y-auto"
            prop.children [
              Html.div [
                prop.className "px-2 pt-3"
                prop.children [
                  Html.h1 [
                    prop.text "Dimensions"
                  ]
                  match state.Schema with
                  | NotRequested -> React.fragment []
                  | Requested _ ->
                    Html.div [
                      prop.className "text-sm text-gray-500 mt-2"
                      prop.text "The dataset is being processed and the dimensions loaded. This operation might take a while."
                    ]
                  | Returned schema -> ColumnSelector state dispatch schema.Columns
                ]
              ]
            ]
          ]
          Html.div [
            prop.className "flex-grow-0 border-t mx-2 py-1 border-gray-50 text-gray-600"
            prop.children [
              Html.button [
                prop.className "border rounded-lg px-2 py-1 w-full bg-gray-200 hover:bg-gray-300"
                prop.onClick (fun _ -> dispatch StartOver)
                prop.text "Start over"
              ]
            ]
          ]
        ]
      ]
      
      Html.div [
        prop.className "flex-grow bg-white overflow-y-auto h-screen"
        prop.children [
          match state.AnonymizedResult with
          | NotRequested ->
            Html.div [
              prop.className "mt-2 px-4"
              prop.children [
                Html.div [
                  prop.className "mt-2 text-4xl py-4"
                  prop.children (wordmarkify "Easy Diffix")
                ]
                Html.p [
                  prop.className "mt-2"
                  prop.text "The system is processing the data and getting ready for anonymization!"
                ]
                Html.p [
                  prop.className "mt-2"
                  prop.text "This might take a while. Please be patient or go get a cup of coffee."
                ]
              ]
            ]
          | Requested resultOption ->
            Html.div [
              prop.className "animate-pulse flex-col"
              prop.children [
                Html.h1 [
                  prop.className "mt-2 text-4xl p-4 flex-grow-0"
                  prop.children (wordmarkify "Anonymizing results")
                ]
                
                resultOption
                |> Option.map (fun result ->
                  Html.div [
                    prop.className "flex-grow overflow-y-auto"
                    prop.children [
                      AnonymizedResultTable result
                    ]
                  ]
                )
                |> Option.defaultValue (
                  Html.div [
                    prop.className "mt-2 px-4 animate-pulse"
                    prop.text "Calculating results..."
                  ]
                )
              ]
            ]
          | Returned result ->
            Html.div [
              prop.className "flex-col"
              prop.children [
                Html.div [
                  prop.className "mt-2 text-4xl p-4 flex-grow-0"
                  prop.children (wordmarkify "Anonymized results")
                ]
                Html.div [
                  prop.className "flex-grow overflow-y-auto"
                  prop.children [
                    AnonymizedResultTable result
                  ]
                ]
              ]
            ]
        ]
      ]
    ]
  ]
  
[<ReactComponent>]
let App() =
  let state, dispatch = React.useElmish(init, update, [| |])
  
  match state.Screen with
  | WelcomeScreen -> renderWelcomeScreen dispatch
  | AnonymizeScreen anonState -> renderAnonymizeScreen anonState dispatch