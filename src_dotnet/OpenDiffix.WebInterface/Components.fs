module OpenDiffix.WebInterface

open Feliz
open OpenDiffix.Core.QueryEngine

let button (title: string) action =
  Html.button [
    prop.text title
    prop.className "rounded ml-2 border bg-gray-200 text-gray-900 text-xs px-1 py-0.5"
    prop.onClick (fun _e -> action ())
  ]
  
[<ReactComponent>]
let ColumnSelector (columns: string array, columnsChanged: string array -> unit) =
  let selected, setSelected = React.useState Set.empty
  
  let updateSet newSet =
    setSelected newSet
    newSet |> Set.toArray |> columnsChanged 
  
  if columns = Array.empty
  then React.fragment []
  else 
    Html.ul [
      prop.className "space-y-1 text-sm mt-4 text-gray-200" 
      prop.children (
        columns
        |> Array.map(fun column ->
          Html.li [
            prop.key column
            prop.children [
              Html.span column
              
              if Set.contains column selected
              then button "Remove" (fun () -> updateSet (Set.remove column selected))
              else button "Add" (fun () -> updateSet (Set.add column selected))
            ]
          ]
        )
      )
    ]
    
[<ReactComponent>]
let AnonymizedResult (results: QueryResult option) =
  match results with
  | Some results ->
    Html.div [
      prop.className "rounded bg-gray-800 p-2 mt-4"
      prop.children [
        Html.table [
          prop.className "w-full"
          prop.children [
            Html.thead [
              Html.tr (
                results.Columns
                |> List.map(Html.th)
              )
            ]
            
            Html.tbody (
              results.Rows
              |> List.map(fun row ->
                Html.tr (
                  row |> Array.map(OpenDiffix.Core.Value.toString >> Html.td)
                )
              )
            )
          ]
        ]
      ]
    ]
    
    
  | None -> React.fragment []
