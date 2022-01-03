module OpenDiffix.Service.LedTests

open Xunit
open FsUnit.Xunit

open OpenDiffix.Core

let assertRowsDifference rows1 rows2 (diff: List<Row * Row>) =
  List.zip rows1 rows2
  |> List.filter (fun (left, right) -> Row.equalityComparer.Equals(left, right) |> not)
  |> should equal diff

let assertHookDifference csv query (diff: List<Row * Row>) =
  let rows (result: QueryEngine.QueryResult) = result.Rows
  let withoutHookRows = TestHelpers.run [] csv query |> rows
  let withHookRows = TestHelpers.run [ Led.hook ] csv query |> rows

  assertRowsDifference withoutHookRows withHookRows diff

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

let csvWithProperStarBucket =
  csvWithVictim
  + """
    biol,f,asst
    chem,m,asst
    biol,f,prof
    """

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
let ``Does not merge if the victim cannot be singled out`` () =
  assertHookDifference csvWithDifferentTitles query []

[<Fact>]
let ``Merges taking precedence before star bucket hook`` () =
  // We get a hold of the star bucket results reference via side effects.
  let mutable suppressedAnonCount = Null
  let pullHookResultsCallback results = suppressedAnonCount <- results
  let starBucketHook = StarBucket.hook pullHookResultsCallback

  let rows (result: QueryEngine.QueryResult) = result.Rows
  let withoutHookRows = TestHelpers.run [] csvWithProperStarBucket query |> rows

  let withHookRows =
    TestHelpers.run [ Led.hook; starBucketHook ] csvWithProperStarBucket query
    |> rows

  assertRowsDifference
    withoutHookRows
    withHookRows
    [
      [| String "cs"; String "m"; String "prof"; Integer 4L; Boolean false |],
      [| String "cs"; String "m"; String "prof"; Integer 5L; Boolean false |]
    ]

  // 3 is correct, this is the number of suppressed rows, _we exclude_ the merged row
  // from the star bucket.
  suppressedAnonCount |> should equal (Integer 3L)

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
