import { initializeDevCycle } from "@devcycle/nodejs-server-sdk"
import { OpenFeature } from "@openfeature/server-sdk"
import { otelSetup } from "./otelSetup"
import { DynatraceOtelLogHook } from "./dynatraceOtelLogHook"

const DEVCYCLE_SERVER_SDK_KEY = process.env.DEVCYCLE_SERVER_SDK_KEY

if (!DEVCYCLE_SERVER_SDK_KEY) {
  throw new Error("DEVCYCLE_SERVER_SDK_KEY environment variable is required")
}

const { getLogger, getTracer } = otelSetup
const logger = getLogger()
const tracer = getTracer()

const dynatraceLogHook = new DynatraceOtelLogHook(logger, tracer)

export async function initializeDevCycleWithOpenFeature() {
  const devcycleClient = initializeDevCycle(DEVCYCLE_SERVER_SDK_KEY as string, {
    logLevel: "info",
  })
  OpenFeature.addHooks(dynatraceLogHook)

  // Pass the DevCycle OpenFeature Provider to OpenFeature, wait for devcycle to be initialized
  await OpenFeature.setProviderAndWait(
    await devcycleClient.getOpenFeatureProvider()
  )

  return devcycleClient
}
