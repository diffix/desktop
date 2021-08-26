open System
open System.IO
open Argu
open OpenDiffix.Core
open OpenDiffix.Core.QueryEngine

type CliArguments =
    | [<Unique; AltCommandLine("-f")>] In_File_Path of file_path: string
    | [<Unique; AltCommandLine("-o")>] Out_File_Path of file_path: string
    | Aid_Columns of column_name: string list
    | [<AltCommandLine("-q")>] Query of sql: string
    | [<Unique; AltCommandLine("-s")>] Salt of salt_value: string
    | Json

    // Threshold values
    | [<Unique>] Threshold_Outlier_Count of lower: int * upper: int
    | [<Unique>] Threshold_Top_Count of lower: int * upper: int
    | [<Unique>] Minimum_Allowed_Aid_Values of threshold: int

    // General anonymization parameters
    | [<Unique>] Noise_SD of std_dev: float

    interface IArgParserTemplate with
        member this.Usage =
            match this with
            | In_File_Path _ -> "Specifies the path on disk to the CSV file containing the data to be anonymized."
            | Out_File_Path _ ->
                "Specifies the path on disk where the output is to be written. By default, standard out is used."
            | Aid_Columns _ -> "Specifies the AID column(s). Each AID should follow the format tableName.columnName."
            | Query _ -> "The SQL query to execute."
            | Salt _ -> "The salt value to use when anonymizing the data. Changing the salt will change the result."
            | Json -> "Outputs the query result as JSON. By default, output is in CSV format."
            | Threshold_Outlier_Count _ ->
                "Threshold used in the count aggregate to determine how many of the entities with the most extreme values "
                + "should be excluded. A number is picked from a uniform distribution between the upper and lower limit."
            | Threshold_Top_Count _ ->
                "Threshold used in the count aggregate together with the outlier count threshold. It determines how many "
                + "of the next most contributing users' values should be used to calculate the replacement value for the "
                + "excluded users. A number is picked from a uniform distribution between the upper and lower limit."
            | Minimum_Allowed_Aid_Values _ ->
                "Sets the bound for the minimum number of AID values must be present in a bucket for it to pass the low count filter."
            | Noise_SD _ -> "Specifies the standard deviation used when calculating the noise throughout the system."

let executableName = "OpenDiffix.CLI"

let parser =
    ArgumentParser.Create<CliArguments>(programName = executableName)

let failWithUsageInfo errorMsg =
    failwith $"%s{errorMsg}\n\nPlease run '%s{executableName} -h' for help."

let toThreshold =
    function
    | Some (lower, upper) -> { Lower = lower; Upper = upper }
    | _ -> Threshold.Default

let toNoise =
    function
    | Some stdDev -> stdDev
    | _ -> AnonymizationParams.Default.NoiseSD

let private toTableSettings (aidColumns: string list option) =
    aidColumns
    |> Option.defaultValue List.empty<string>
    |> List.map
        (fun aidColumn ->
            match aidColumn.Split '.' with
            | [| tableName; columnName |] -> (tableName, columnName)
            | _ -> failWithUsageInfo "Invalid request: AID doesn't have the format `table_name.column_name`")
    |> List.groupBy fst
    |> List.map (fun (tableName, fullAidColumnList) -> (tableName, { AidColumns = fullAidColumnList |> List.map snd }))
    |> Map.ofList

let toSalt =
    function
    | Some (salt: string) -> Text.Encoding.UTF8.GetBytes(salt)
    | _ -> [||]

let constructAnonParameters (parsedArgs: ParseResults<CliArguments>) : AnonymizationParams =
    { TableSettings =
          parsedArgs.TryGetResult Aid_Columns
          |> toTableSettings
      Salt = parsedArgs.TryGetResult Salt |> toSalt
      MinimumAllowedAids =
          parsedArgs.TryGetResult Minimum_Allowed_Aid_Values
          |> Option.defaultValue 2
      OutlierCount =
          parsedArgs.TryGetResult Threshold_Outlier_Count
          |> toThreshold
      TopCount =
          parsedArgs.TryGetResult Threshold_Top_Count
          |> toThreshold
      NoiseSD = parsedArgs.TryGetResult Noise_SD |> toNoise }

let getQuery (parsedArgs: ParseResults<CliArguments>) =
    match parsedArgs.TryGetResult Query with
    | Some query -> query
    | None -> failWithUsageInfo "Please specify the query."

let getInFilePath (parsedArgs: ParseResults<CliArguments>) =
    match parsedArgs.TryGetResult In_File_Path with
    | Some filePath ->
        if File.Exists(filePath) then
            filePath
        else
            failWithUsageInfo $"Could not find a file at %s{filePath}"
    | None -> failWithUsageInfo "Please specify the file path."

let getOutputStream (parsedArgs: ParseResults<CliArguments>) =
    match parsedArgs.TryGetResult Out_File_Path with
    | Some filePath -> new StreamWriter(filePath)
    | None -> new StreamWriter(Console.OpenStandardOutput())

let runQuery query filePath anonParams =
    use dataProvider =
        new CSV.DataProvider(filePath) :> IDataProvider

    let context =
        EvaluationContext.make anonParams dataProvider

    QueryEngine.run context query

let quoteString (string: string) =
    "\"" + string.Replace("\"", "\"\"") + "\""

let csvFormat value =
    match value with
    | String string -> quoteString string
    | _ -> Value.toString value

let csvFormatter result =
    let header =
        result.Columns
        |> List.map (fun column -> quoteString column.Name)
        |> String.join ","

    let rows =
        result.Rows
        |> List.map (fun row -> row |> Array.map csvFormat |> String.join ",")

    header :: rows |> String.join "\n"

let jsonFormatter =
    JsonEncodersDecoders.encodeQueryResult
    >> Thoth.Json.Net.Encode.toString 2

[<EntryPoint>]
let main argv =
    try
        let parsedArguments =
            parser.ParseCommandLine(
                inputs = argv,
                raiseOnUsage = true,
                ignoreMissing = false,
                ignoreUnrecognized = false
            )

        let query = getQuery parsedArguments
        let inFilePath = getInFilePath parsedArguments
        let anonParams = constructAnonParameters parsedArguments

        let outputFormatter =
            if parsedArguments.Contains Json then
                jsonFormatter
            else
                csvFormatter

        let output =
            runQuery query inFilePath anonParams
            |> outputFormatter

        use writer = getOutputStream parsedArguments
        fprintfn writer $"%s{output}"
        0

    with e ->
        eprintfn $"ERROR: %s{e.Message}"
        1
