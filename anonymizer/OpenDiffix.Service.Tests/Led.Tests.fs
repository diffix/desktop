module OpenDiffix.Service.LedTests

open Xunit
open FsUnit.Xunit

open OpenDiffix.Core

let assertHookDifference csv query (diff: List<Row * Row>) =
  let rows (result: QueryEngine.QueryResult) = result.Rows
  let withoutHookRows = TestHelpers.run [] csv query |> rows
  let withHookRows = TestHelpers.run [ Led.hook ] csv query |> rows

  List.zip withoutHookRows withHookRows
  |> List.filter (fun (left, right) -> Row.equalityComparer.Equals(left, right) |> not)
  |> should equal diff

let assertHookFails csv query (errorFragment: string) =
  try
    TestHelpers.run [ Led.hook ] csv query |> ignore
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
    "cannot find required DiffixLowCount aggregator"

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

[<Fact>]
let ``Ignores if the victim cannot be singled out`` () =
  assertHookDifference
    csvWithDifferentTitles
    """
    SELECT diffix_count(*, RowIndex)
    FROM table
    """
    []
