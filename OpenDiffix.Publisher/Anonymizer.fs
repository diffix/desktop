module OpenDiffix.Publisher.Anonymizer

open OpenDiffix.Core
open OpenDiffix.Core.ParserTypes
open OpenDiffix.Core.QueryEngine
open OpenDiffix.Publisher
open OpenDiffix.Publisher.SharedTypes

let anonymize (data: CsvProvider.ParsedData) (columns: string list): EncodedTableData =
  let columnExpressions = columns |> List.map(fun columnName -> Identifier (None, columnName))
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
  
  let evaluationContext = {
    AnonymizationParams = {
      TableSettings = Map.ofList ["data", {AidColumns = ["AID"]}]
      Seed = 1
      MinimumAllowedAids = 2
      
      OutlierCount = {Lower = 1; Upper = 2}
      TopCount = {Lower = 2; Upper = 3}
      Noise = {StandardDev = 1.; Cutoff = 3.}
    }
    DataProvider = CsvProvider.toDataProvider data
  }
  
  let queryResult: TableData =
    match run evaluationContext queryAst with
    | Ok result ->
      {
        Headers = result.Columns
        Rows =
          result.Rows
          |> List.map(fun row ->
            row
            |> Array.map(Value.toString)
            |> List.ofArray
          )
      }
      
    | Error errorMsg ->
      {
        Headers = ["Error"]
        Rows = [
          [errorMsg]
        ]
      }
  
  IPCCoder.pack queryResult