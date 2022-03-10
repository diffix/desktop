module OpenDiffix.Service.CSVDataProviderTests

open Xunit
open FsUnit.Xunit

open System.IO

open OpenDiffix.Core


let private makeProvider csv =
  new CSV.DataProvider(new StringReader(csv), new StringReader(csv)) :> IDataProvider

let referenceSchema =
  let csv =
    $"""
"age","city","discount","active"
20,"Berlin",0.2,true
"""

  (makeProvider csv).GetSchema()

[<Fact>]
let ``Loads simple full CSV`` () =
  let csv =
    $"""
"age","city","discount","active"
20,"Berlin",0.2,true
"""

  (makeProvider csv).GetSchema()
  |> should
       equal
       [
         {
           Name = "table"
           Columns =
             [
               { Name = "RowIndex"; Type = IntegerType }
               { Name = "age"; Type = IntegerType }
               { Name = "city"; Type = StringType }
               { Name = "discount"; Type = RealType }
               { Name = "active"; Type = BooleanType }
             ]
         }
       ]

[<Fact>]
let ``Tolerates nulls`` () =
  let csv =
    $"""
"age","city","discount","active"
,"Berlin",0.2,true
20,,0.2,true
20,"Berlin",,true
20,"Berlin",0.2,
,,,
"""

  (makeProvider csv).GetSchema() |> should equal referenceSchema

[<Fact>]
let ``Understands various boolean values`` () =
  let csv =
    $"""
"age","city","discount","active"
20,"Berlin",0.2,1
20,"Berlin",0.2,0
20,"Berlin",0.2,
"""

  (makeProvider csv).GetSchema() |> should equal referenceSchema

  let csv2 =
    $"""
"age","city","discount","active"
20,"Berlin",0.2,"true"
20,"Berlin",0.2,TRUE
20,"Berlin",0.2,
20,"Berlin",0.2,FALSE
"""

  (makeProvider csv2).GetSchema() |> should equal referenceSchema

[<Fact>]
let ``Resolves mixed types towards text`` () =
  let csv =
    $"""
"age","city","discount","active"
20,0.2,0.2,true
20,2,0.2,true
20,true,0.2,true
"""

  (makeProvider csv).GetSchema() |> should equal referenceSchema

[<Fact>]
let ``Resolves mixed types towards real`` () =
  let csv =
    $"""
"age","city","discount","active"
20,"Berlin",0.2,true
20,"Berlin",1,true
20,"Berlin",1.000000e-15,true
"""

  (makeProvider csv).GetSchema() |> should equal referenceSchema

[<Fact>]
let ``Resolves empty columns as text`` () =
  let csv =
    $"""
"age","city","discount","active"
20,,0.2,true
20,,0.2,true
20,,0.2,true
"""

  (makeProvider csv).GetSchema() |> should equal referenceSchema

[<Fact>]
let ``Reads typed values`` () =
  let csv =
    $"""
"age","city","discount","active"
20,"Berlin",0.2,true
,,,
"""

  let dummyTable = { Name = "table"; Columns = [] }
  let allColumnIndices = [ 0; 1; 2; 3; 4 ]

  (makeProvider csv).OpenTable(dummyTable, allColumnIndices)
  |> List.ofSeq
  |> should
       equal
       [
         [| Integer 1L; Integer 20L; String "Berlin"; Real 0.2; Boolean true |]
         [| Integer 2L; Null; String ""; Null; Null |]
       ]
