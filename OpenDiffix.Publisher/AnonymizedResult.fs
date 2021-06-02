module OpenDiffix.Publisher.AnonymizedResult

open Feliz

[<ReactComponent>]
let AnonymizedResult (results: SharedTypes.TableData option) =
  match results with
  | None -> React.fragment []
    
  | Some results ->
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
