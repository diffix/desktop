module OpenDiffix.Service.TestHelpers

open System
open OpenDiffix.Core

let private noiselessAnonParams: AnonymizationParams =
  {
    TableSettings = Map []
    Salt = [||]
    Suppression = { LowThreshold = 3; LowMeanGap = 0.; LayerSD = 0. }
    OutlierCount = { Lower = 1; Upper = 1 }
    TopCount = { Lower = 1; Upper = 1 }
    LayerNoiseSD = 0.
  }

let private csvReader (csv: string) =
  let cleanedCsv =
    csv.Split("\n", StringSplitOptions.TrimEntries ||| StringSplitOptions.RemoveEmptyEntries)
    |> String.join "\n"

  new CSV.DataProvider(new System.IO.StringReader(cleanedCsv))

let private withHooks hooks context =
  { context with PostAggregationHooks = hooks }

let run hooks csv query =
  let queryContext = QueryContext.make noiselessAnonParams (csvReader csv) |> withHooks hooks
  QueryEngine.run queryContext query
