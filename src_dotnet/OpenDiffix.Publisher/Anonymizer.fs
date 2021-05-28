module OpenDiffix.Publisher.Anonymizer

open OpenDiffix
open OpenDiffix.Core
open OpenDiffix.Core.ParserTypes
open OpenDiffix.Core.QueryEngine
open OpenDiffix.Publisher.CsvProvider

let anonymize (data: Shared.Data) (columns: string array) =
  let columnExpressions =
    columns
    |> Array.map(fun columnName -> Identifier (None, columnName))
    |> Array.toList
  let countStar = Function("count", [Star])
  let queryAst = {
    SelectDistinct = false
    Expressions =
      (columnExpressions @ [countStar])
      |> List.map(fun expr -> As (expr, None))
    From = Table ("data", None)
    Where = None
    GroupBy = columnExpressions
    Having = None
  }
  printfn $"%A{queryAst}"
  
  let schema: Schema =
    data.JsSchema
    |> Array.map(fun jsTable -> {Name = jsTable.Name; Columns = jsTable.Columns |> Array.toList})
    |> Array.toList
    
  let evaluationContext = {
    AnonymizationParams = {
      TableSettings = Map.ofList ["data", {AidColumns = ["AID"]}]
      Seed = 1
      MinimumAllowedAids = 2
      
      OutlierCount = {Lower = 2; Upper = 3}
      TopCount = {Lower = 2; Upper = 3}
      Noise = {StandardDev = 1.; Cutoff = 3.}
    }
    DataProvider = CsvProvider(schema, data.Rows)
  }
  
  match run evaluationContext queryAst with
  | Ok result -> result
  | Error errorMsg -> ({ Columns = ["Error"]; Rows = [[| Value.String errorMsg |]] }: QueryResult)