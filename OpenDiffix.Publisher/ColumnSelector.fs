module OpenDiffix.Publisher.ColumnSelector

open Feliz
 
let button (title: string) action =
  Html.button [
    prop.text title
    prop.className "rounded ml-2 border hover:bg-gray-100 bg-gray-200 text-gray-900 text-xs px-1 py-0.5"
    prop.onClick (fun _e -> action ())
  ]
  
[<ReactComponent>]
let ColumnSelector (columns: SharedTypes.JsColumn list, columnsChanged: string list -> unit) =
  let selected, setSelected = React.useState Set.empty
  
  let updateSet newSet =
    setSelected newSet
    newSet |> Set.toList |> columnsChanged 
  
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
              
              if Set.contains column.Name selected
              then button "Remove" (fun () -> updateSet (Set.remove column.Name selected))
              else button "Add" (fun () -> updateSet (Set.add column.Name selected))
            ]
          ]
        )
      )
    ]