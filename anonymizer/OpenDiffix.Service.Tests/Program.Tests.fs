module OpenDiffix.Service.ProgramTests

open Xunit
open FsUnit.Xunit

open OpenDiffix.Service.Program

let private normalizePath (path: string) = path.Replace('\\', '/')

let private dataPath = normalizePath (__SOURCE_DIRECTORY__) + "/../reference/data/customers.csv"

type private TempFile() =
  let path = System.IO.Path.GetTempFileName() |> normalizePath
  member this.Path = path

  interface System.IDisposable with
    member this.Dispose() = System.IO.File.Delete(path)

let private defaultAnonParams =
  $"""
  {{"suppression":{{"lowThreshold":3,"sD":1,"lowMeanGap":2}},"outlierCount":{{"lower":2,"upper":5}},"topCount":{{"lower":2,"upper":5}},"noiseSD":1.0}}
  """

let private defaultQueryParams anonParams =
  $"""
  "inputPath": "%s{dataPath}",
  "aidColumn": "id",
  "salt": "1",
  "anonParams": %s{anonParams},
  "buckets": ["age", "city"]
  """


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
    {{"type":"Preview",%s{defaultQueryParams defaultAnonParams},"countInput":"Rows","rows":1000}}
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
let ``Handles Preview request with custom anonParams`` () =
  let anonParams =
    $"""
    {{"suppression":{{"lowThreshold":0,"sD":0,"lowMeanGap":0}},"outlierCount":{{"lower":2,"upper":5}},"topCount":{{"lower":2,"upper":5}},"noiseSD":1.0}}
    """

  let requestCustom =
    $"""
    {{"type":"Preview",%s{defaultQueryParams anonParams},"countInput":"Rows","rows":1000}}
    """

  let responseCustom = requestCustom |> mainCore
  // The custom anonymization params have removed suppression. Assertion checks whether
  // that's respected by the service
  responseCustom |> should haveSubstring "\"lowCountRows\": 0"

[<Fact>]
let ``Handles Export request`` () =
  use outputFile = new TempFile()

  let request =
    $"""
    {{"type":"Export",%s{defaultQueryParams defaultAnonParams},"countInput":"Rows","outputPath":"%s{outputFile.Path}"}}
    """

  request |> mainCore |> should equal ""

  let result = System.IO.File.ReadAllLines(outputFile.Path)
  result |> should contain "\"age\",\"city\",\"count\""
  result.Length |> should equal 2

[<Fact>]
let ``Handles Export request with custom anonParams`` () =
  use outputFile = new TempFile()

  let anonParams =
    $"""
    {{"suppression":{{"lowThreshold":300,"sD":1,"lowMeanGap":2}},"outlierCount":{{"lower":2,"upper":5}},"topCount":{{"lower":2,"upper":5}},"noiseSD":1.0}}
    """

  let requestCustom =
    $"""
    {{"type":"Export",%s{defaultQueryParams anonParams},"countInput":"Rows","outputPath":"%s{outputFile.Path}"}}
    """

  requestCustom |> mainCore |> should equal ""

  let result = System.IO.File.ReadAllLines(outputFile.Path)
  // The custom anonymization params have ridiculous suppression threshold to suppress all buckets
  // Assertion checks whether that's respected by the service
  result |> should contain "\"age\",\"city\",\"count\""
  result.Length |> should equal 1
