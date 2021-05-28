module OpenDiffix.Publisher.Anonymizer

open OpenDiffix.Core
open OpenDiffix.Core.ParserTypes

let anonymize dataProvider columns =
  let columnExpressions = columns |> List.map(fun column -> Identifier (None, column.Name))
  let countStar = Function("count", [Star])
  let queryAst: SelectQuery = {
    SelectDistinct = false
    Expressions = columnExpressions @ [countStar]
    From = Table ("data", None)
    Where = None
    GroupBy = columnExpressions
    Having = None
  }
  
  let evaluationContext = {
    AnonymizationParams = {
      TableSettings = Map.ofList ["data", {AidColumns = ["AID"]}]
      Seed = 1
      MinimumAllowedAids = 2
      
      OutlierCount = {Lower = 2; Upper = 3}
      TopCount = {Lower = 2; Upper = 3}
      Noise = {StandardDev = 1.; Cutoff = 3.}
    }
    DataProvider = dataProvider
  }
  
  match QueryEngine.run evaluationContext queryAst with
  | Ok result -> result
  | Error errorMsg -> { Columns = ["Error"]; Rows = [[| Value.String errorMsg |]] }