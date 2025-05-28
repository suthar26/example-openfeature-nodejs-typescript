import dotenv from "dotenv"
dotenv.config()
import express, { Request } from "express"
import { initializeDevCycleWithOpenFeature } from "./devcycle"
import greetingHandler from "./routes/greeting"
import { logVariation } from "./utils/logVariation"
import { DevCycleUser } from "@devcycle/nodejs-server-sdk"
import { EvaluationContext, OpenFeature } from "@openfeature/server-sdk"

export interface OpenFeatureRequest extends Request {
  user: EvaluationContext
}

async function run() {
  const devcycleClient = await initializeDevCycleWithOpenFeature()
  const openFeatureClient = OpenFeature.getClient()

  const app = express()
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())

  app.use((req, res, next) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Access-Control-Allow-Origin, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    })
    next()
  })
  app.use((req, res, next) => {
    /**
     * In a real application you would build the user object based on the
     * authenticated user
     */
    req.user = {
      user_id: "user123",
      name: "Jane Doe",
      email: "jane.doe@email.com",
    }
    next()
  })

  /**
   * Return a greeting based on the value of the example-text variable
   */
  app.get("/", greetingHandler)

  /**
   * Return all variable values for debugging purposes
   */
  app.get("/variables", (req, res) => {
    const variables = devcycleClient.allVariables(
      req.user as unknown as DevCycleUser
    )
    res.json(variables)
  })

  /**
   * Log togglebot to the console using the togglebot-spin and togglebot-wink
   * variables to control the output
   */
  logVariation(devcycleClient, openFeatureClient)

  return app
}

export default run
