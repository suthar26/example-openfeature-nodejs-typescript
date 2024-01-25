# DevCycle NodeJS Server SDK Example App (Typescript)

An example app built using the [DevCycle NodeJS Server SDK](https://docs.devcycle.com/sdk/server-side-sdks/node/) and TypeScript

## Creating a Demo Feature
This example app requires that your project has a feature with the expected variables, as well as some simple targeting rules. 

#### ⇨ [Click here](https://app.devcycle.com/r/create?resource=feature&key=hello-togglebot) to automatically create the feature in your project ⇦

When you run the example app and switch your identity between users, you'll be able to see the feature's different variations.


## Running the Example
### Setup

* Run `npm install` in the project directory to install dependencies
* Create a `.env` file and set `DEVCYCLE_SERVER_SDK_KEY` to your Environment's SDK Key.\
You can find this under [Settings > Environments](https://app.devcycle.com/r/environments) on the DevCycle dashboard.
[Learn more about environments](https://docs.devcycle.com/essentials/environments).

### Development

`npm run start`

Runs the app in the development mode.\
Requests may be sent to [http://localhost:5002](http://localhost:5002). See `src/app.js` for available endpoints.

### Testing

`npm run test`

## Documentation
For more information about using the DevCycle NodeJS Server SDK, see [the documentation](https://docs.devcycle.com/sdk/server-side-sdks/node/)
