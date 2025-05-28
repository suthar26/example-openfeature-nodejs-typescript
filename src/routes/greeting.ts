import { Request, Response } from "express"
import { OpenFeature } from "@openfeature/server-sdk"

type GreetingStep = "default" | "step-1" | "step-2" | "step-3"

interface GreetingContent {
  header: string
  body: string
}

const greetings: Record<GreetingStep, GreetingContent> = {
  default: {
    header: "Welcome to DevCycle's example app.",
    body: "If you got to the example app on your own, follow our README guide to create the Feature and Variables you need to control this app in DevCycle.",
  },
  "step-1": {
    header: "Welcome to DevCycle's example app.",
    body: "If you got here through the onboarding flow, just follow the instructions to change and create new Variations and see how the app reacts to new Variable values.",
  },
  "step-2": {
    header: "Great! You've taken the first step in exploring DevCycle.",
    body: "You've successfully toggled your very first Variation. You are now serving a different value to your users and you can see how the example app has reacted to this change. Next, go ahead and create a whole new Variation to see what else is possible in this app.",
  },
  "step-3": {
    header: "You're getting the hang of things.",
    body: "By creating a new Variation with new Variable values and toggling it on for all users, you've already explored the fundamental concepts within DevCycle. There's still so much more to the platform, so go ahead and complete the onboarding flow and play around with the feature that controls this example in your dashboard.",
  },
}

export default async (req: Request, res: Response) => {
  const openFeatureClient = OpenFeature.getClient()
  const step = await openFeatureClient.getStringValue<GreetingStep>(
    "example-text",
    "default",
    req.user
  )
  const { header, body } = greetings[step]

  res.set({ "Content-Type": "text/html" })
  res.send(
    `<h2>${header}</h2><p>${body}</p><p><a href="/variables">All Variables</a></p>`
  )
}
