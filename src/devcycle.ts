import { initializeDevCycle, DevCycleClient } from "@devcycle/nodejs-server-sdk"
import { OpenFeature, Client } from "@openfeature/server-sdk"
import { initializeOpenTelemetry } from "./otelSetup"
import { DynatraceOtelLogHook } from "./dynatraceOtelLogHook"

const DEVCYCLE_SERVER_SDK_KEY = process.env.DEVCYCLE_SERVER_SDK_KEY as string

let devcycleClient: DevCycleClient
let openFeatureClient: Client

export const getDevCycleClient = () => devcycleClient
export const getOpenFeatureClient = () => openFeatureClient

const { getLogger } = initializeOpenTelemetry()
const otelFeatureLogger = getLogger("openfeature-evaluation-logger")
const dynatraceLogHook = new DynatraceOtelLogHook(otelFeatureLogger)
OpenFeature.addHooks(dynatraceLogHook) // Add globally

export async function initializeDevCycleWithOpenFeature() {
  devcycleClient = initializeDevCycle(DEVCYCLE_SERVER_SDK_KEY, {
    logLevel: "info",
    // Controls the polling interval in milliseconds to fetch new environment config changes
    configPollingIntervalMS: 5 * 1000,
    // Controls the interval between flushing events to the DevCycle servers
    eventFlushIntervalMS: 1000,
  })

  // Pass the DevCycle OpenFeature Provider to OpenFeature, wait for devcycle to be initialized
  await OpenFeature.setProviderAndWait(
    await devcycleClient.getOpenFeatureProvider()
  )
  openFeatureClient = OpenFeature.getClient()

  return { devcycleClient, openFeatureClient }
}
