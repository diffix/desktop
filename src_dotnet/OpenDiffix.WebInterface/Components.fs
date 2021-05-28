module OpenDiffix.WebInterface

open Feliz
open OpenDiffix.Core.QueryEngine

[<ReactComponent>]
let ColumnSelector (columns: string array, columnsChanged: string array -> unit) =
  let selected, setSelected = React.useState Set.empty
  
  let updateSet newSet =
    setSelected newSet
    newSet |> Set.toArray |> columnsChanged 
  
  if columns = Array.empty
  then React.fragment []
  else 
    Html.ul (
      columns
      |> Array.map(fun column ->
        Html.li [
          prop.key column
          prop.children [
            Html.span column
            
            if Set.contains column selected
            then
              Html.button [
                prop.text "Remove"
                prop.onClick (fun _e -> updateSet (Set.remove column selected))
              ]
            else
              Html.button [
                prop.text "Add"
                prop.onClick (fun _e -> updateSet (Set.add column selected))
              ]
          ]
        ]
      )
    )
    
[<ReactComponent>]
let AnonymizedResult (results: QueryResult option) =
  match results with
  | Some results ->
    printfn $"Rendering with results: %A{results.Rows}"
    Html.table [
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
    
  | None -> React.fragment []
