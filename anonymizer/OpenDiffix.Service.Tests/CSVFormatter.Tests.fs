module OpenDiffix.Service.CSVFormatterTests

open Xunit
open FsUnit.Xunit

open OpenDiffix.Core
open OpenDiffix.Core.QueryEngine

[<Fact>]
let ``Formats result`` () =
  let result =
    {
      Columns =
        [
          { Name = "age"; Type = IntegerType }
          { Name = "city"; Type = StringType }
          { Name = "discount"; Type = RealType }
          { Name = "active"; Type = BooleanType }
          { Name = "count"; Type = IntegerType }
        ]
      Rows =
        [
          [| String "*"; String "*"; String "*"; String "*"; Integer 2L |]
          [| Integer 18L; String "Berlin"; Real 0.5; Boolean true; Integer 1L |]
        ]
    }

  let CSVResult = (CSVFormatter.format result).Split('\n')

  CSVResult.[0]
  |> should equal "\"age\",\"city\",\"discount\",\"active\",\"count\""

  CSVResult.[1] |> should equal "\"*\",\"*\",\"*\",\"*\",2"
  CSVResult.[2] |> should equal "18,\"Berlin\",0.5,true,1"
  CSVResult.Length |> should equal 3

[<Fact>]
let ``Handles quotes`` () =
  let result =
    {
      Columns = [ { Name = "name"; Type = StringType } ]
      Rows = [ [| String "\"John Quoted\"" |] ]
    }

  let CSVResult = (CSVFormatter.format result).Split('\n')

  CSVResult.[1] |> should equal "\"\"\"John Quoted\"\"\""
  CSVResult.Length |> should equal 2

[<Fact>]
let ``Formats nulls`` () =
  let result =
    {
      Columns =
        [
          { Name = "age"; Type = IntegerType }
          { Name = "city"; Type = StringType }
          { Name = "discount"; Type = RealType }
          { Name = "active"; Type = BooleanType }
          { Name = "count"; Type = IntegerType }
        ]
      Rows = [ [| Null; Null; Null; Null; Null |] ]
    }

  let CSVResult = (CSVFormatter.format result).Split('\n')

  CSVResult.[1] |> should equal ",,,,"
  CSVResult.Length |> should equal 2
