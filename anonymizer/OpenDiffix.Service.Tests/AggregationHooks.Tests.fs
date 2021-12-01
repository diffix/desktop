module OpenDiffix.Service.AggregationHooksTests

open Xunit
open FsUnit.Xunit

open System
open OpenDiffix.Core

let noiselessAnonParams: AnonymizationParams =
  {
    TableSettings = Map []
    Salt = [||]
    Suppression = { LowThreshold = 3; LowMeanGap = 0.; SD = 0. }
    OutlierCount = { Lower = 1; Upper = 1 }
    TopCount = { Lower = 1; Upper = 1 }
    LayerNoiseSD = 0.
  }

let csvReader (csv: string) =
  let cleanedCsv =
    csv.Split("\n", StringSplitOptions.TrimEntries ||| StringSplitOptions.RemoveEmptyEntries)
    |> String.join "\n"

  new CSV.DataProvider(new System.IO.StringReader(cleanedCsv))

let withHooks hooks context =
  { context with PostAggregationHooks = hooks }

let run hooks csv query =
  let queryContext = QueryContext.make noiselessAnonParams (csvReader csv) |> withHooks hooks
  QueryEngine.run queryContext query

let runWithHook csv query =
  run [ AggregationHooks.Led.hook ] csv query

let runWithoutHook csv query = run [] csv query

let rows (result: QueryEngine.QueryResult) = result.Rows

let assertHookDifference csv query (diff: List<Row * Row>) =
  let withoutHookRows = runWithoutHook csv query |> rows
  let withHookRows = runWithHook csv query |> rows

  List.zip withoutHookRows withHookRows
  |> List.filter (fun (left, right) -> Row.equalityComparer.Equals(left, right) |> not)
  |> should equal diff

let assertHookFails csv query (errorFragment: string) =
  try
    runWithHook csv query |> ignore
    failwith "Expecting query to fail"
  with
  | ex ->
    let str = ex.Message.ToLower()

    if str.Contains(errorFragment.ToLower()) then
      ()
    else
      failwith $"Expecting error to contain '%s{errorFragment}'. Got '%s{str}' instead."

let csvWithVictim =
  """
  dept,gender,title
  math,m,prof
  math,m,prof
  math,m,prof
  math,m,prof
  math,f,prof
  math,f,prof
  math,f,prof
  math,f,prof
  history,m,prof
  history,m,prof
  history,m,prof
  history,m,prof
  history,f,prof
  history,f,prof
  history,f,prof
  history,f,prof
  cs,m,prof
  cs,m,prof
  cs,m,prof
  cs,m,prof
  cs,f,prof
  """

let csvWithTwoVictims = csvWithVictim + "\n" + "cs,f,prof"
let csvWithThreeCsWomen = csvWithTwoVictims + "\n" + "cs,f,prof"
let csvWithDifferentTitles = csvWithVictim + "\n" + "cs,f,asst"

let query =
  """
  SELECT dept, gender, title, diffix_count(*, RowIndex), diffix_low_count(RowIndex)
  FROM table
  GROUP BY 1, 2, 3
  """

[<Fact>]
let ``Merges victim bucket`` () =
  assertHookDifference
    csvWithVictim
    query
    [
      [| String "cs"; String "m"; String "prof"; Integer 4L; Boolean false |],
      [| String "cs"; String "m"; String "prof"; Integer 5L; Boolean false |]
    ]

[<Fact>]
let ``Merges 2 victims with same title`` () =
  assertHookDifference
    csvWithTwoVictims
    query
    [
      [| String "cs"; String "m"; String "prof"; Integer 4L; Boolean false |],
      [| String "cs"; String "m"; String "prof"; Integer 6L; Boolean false |]
    ]

[<Fact>]
let ``Does not merge high count buckets`` () =
  assertHookDifference csvWithThreeCsWomen query []

[<Fact>]
let ``Works with count distinct`` () =
  assertHookDifference
    csvWithVictim
    """
    SELECT dept, gender, title, diffix_count(distinct RowIndex, RowIndex), diffix_low_count(RowIndex)
    FROM table
    GROUP BY 1, 2, 3
    """
    [
      [| String "cs"; String "m"; String "prof"; Integer 4L; Boolean false |],
      [| String "cs"; String "m"; String "prof"; Integer 5L; Boolean false |]
    ]

[<Fact>]
let ``Works when low count filter is in HAVING`` () =
  assertHookDifference
    csvWithVictim
    """
    SELECT dept, gender, title, diffix_count(*, RowIndex)
    FROM table
    GROUP BY 1, 2, 3
    HAVING NOT diffix_low_count(RowIndex)
    """
    [
      [| String "cs"; String "m"; String "prof"; Integer 4L |],  //
      [| String "cs"; String "m"; String "prof"; Integer 5L |]
    ]

[<Fact>]
let ``Requires low count filter aggregator in scope`` () =
  assertHookFails
    csvWithVictim
    """
    SELECT dept, gender, title, diffix_count(*, RowIndex)
    FROM table
    GROUP BY 1, 2, 3
    """
    "cannot find required aggregator"

[<Fact>]
let ``Ignores real count`` () =
  assertHookDifference
    csvWithVictim
    """
    SELECT dept, gender, title, count(*), diffix_count(*, RowIndex), diffix_low_count(RowIndex)
    FROM table
    GROUP BY 1, 2, 3
    """
    [
      [| String "cs"; String "m"; String "prof"; Integer 4L; Integer 4L; Boolean false |],
      [| String "cs"; String "m"; String "prof"; Integer 4L; Integer 5L; Boolean false |]
    ]

[<Fact>]
let ``Ignores global aggregation`` () =
  assertHookDifference
    csvWithVictim
    """
    SELECT diffix_count(*, RowIndex)
    FROM table
    """
    []
