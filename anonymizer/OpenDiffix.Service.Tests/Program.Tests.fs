module OpenDiffix.Service.ProgramTests

open Xunit
open FsUnit.Xunit

open OpenDiffix.Service.Program

let private dataPath = __SOURCE_DIRECTORY__ + "/../reference/data/customers.csv"

type TempFile() =
  let path = System.IO.Path.GetTempFileName()
  member this.Path = path

  interface System.IDisposable with
    member this.Dispose() = System.IO.File.Delete(path)

[<Fact>]
let ``Handles Load request`` () =
  let request =
    $"""
    {{"type":"Load","inputPath":"%s{dataPath}","rows":10000}}
    """

  let response = request |> mainCore
  response |> should haveSubstring "columns"
  response |> should haveSubstring "rows"

[<Fact>]
let ``Handles HasMissingValues request`` () =
  let request =
    $"""
    {{"type":"HasMissingValues","inputPath":"%s{dataPath}","aidColumn":"id"}}
    """

  [ "true"; "false" ] |> should contain (request |> mainCore)

[<Fact>]
let ``Handles Preview request`` () =
  let request =
    $"""
    {{"type":"Preview","inputPath":"%s{dataPath}","aidColumn":"id","salt":"1","buckets":["age","city"],"countInput":"Rows","rows":1000}}
    """

  let response = request |> mainCore
  response |> should haveSubstring "summary"
  response |> should haveSubstring "totalBuckets"
  response |> should haveSubstring "lowCountBuckets"
  response |> should haveSubstring "totalRows"
  response |> should haveSubstring "lowCountRows"
  response |> should haveSubstring "maxDistortion"
  response |> should haveSubstring "medianDistortion"
  response |> should haveSubstring "rows"

[<Fact>]
let ``Handles Export request`` () =
  use outputFile = new TempFile()

  let request =
    $"""
    {{"type":"Export","inputPath":"%s{dataPath}","aidColumn":"id","salt":"1","buckets":["age","city"],"countInput":"Rows","outputPath":"%s{outputFile.Path}"}}
    """

  request |> mainCore |> should equal ""

  let result = System.IO.File.ReadAllLines(outputFile.Path)
  result |> should contain "\"age\",\"city\",\"diffix_count\""
  result.Length |> should equal 2
