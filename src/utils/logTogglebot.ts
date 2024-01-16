import chalk, { Color } from "chalk";
import { getDevCycleClient } from "../devcycle";
import togglebot from "../assets/togglebot";
import togglebotWink from "../assets/togglebotWink";
import togglebotOffAxis from "../assets/togglebotOffAxis";
import readline from 'readline'

/**
 * Since this is used outside of a request context, we define a service user.
 * This can contian properties unique to this service, and allows you to target
 * services in the same way you would target app users.
 */
const SERVICE_USER = { user_id: "api-service" };

const SIZE = 40; // each frame will be padded to this size

type Color = typeof Color | 'rainbow'; // needed because chalk v5 doesn't support typescript


/**
 * Log togglebot to the console overwriting the previous frame
 */
const logTogglebot = () => {
  const devcycleClient = getDevCycleClient();

  let idx = 0;
  const renderFrame = (frame: string, timeout = 500) => {
    const wink = devcycleClient.variableValue(
      SERVICE_USER,
      "togglebot-wink",
      false
    );
    const speed = devcycleClient.variableValue(
      SERVICE_USER,
      "togglebot-speed",
      "off"
    );
    const color = speed === "surprise" ? "rainbow" : "blue";

    writeToConsole(frame, color);
    setTimeout(() => {
      let frames = wink ? togglebotWink : togglebot;
      if (speed === "off-axis") frames = togglebotOffAxis;

      let nextFrame;
      if (speed === "off") {
        idx = 0;
        nextFrame = frames[0];
      } else {
        idx = (idx + 1) % frames.length;
        nextFrame = frames[idx];
      }

      const nextTimeout = ["fast", "surprise", "off-axis"].includes(speed)
        ? 100
        : 500;

      clearConsole();
      renderFrame(nextFrame, nextTimeout);
    }, timeout);
  };
  renderFrame(togglebot[0]);
};

/**
 * Pad the text with empty lines so that the frames are always the same size
 */
const addPadding = (text: string) => {
  const rows = text.split("\n");
  while (rows.length <= SIZE) {
    rows.length % 2 ? rows.push("") : rows.unshift("");
  }

  return rows.join("\n");
};

/**
 * Use chalk to apply the given color to the text
 */
const addColor = (text: string, color: Color) => {
  let colorFn;
  if (color === "rainbow") {
    const rainbow = [
      chalk.red,
      chalk.yellow,
      chalk.green,
      chalk.blue,
      chalk.magenta,
    ];
    colorFn = (text: string) =>
      text
        .split("")
        .map((c, i) => rainbow[i % rainbow.length](c))
        .join("");
  } else {
    colorFn = chalk[color];
  }
  return colorFn(text);
};

/**
 * Write the text to stdout, with the given colour
 */
const writeToConsole = (text: string, color: Color = "blue") => {
  text = addPadding(text);
  text = addColor(text, color);

  process.stdout.write(text);
};

/**
 * Clear content from lines where next frame will be written
 */
const clearConsole = () => {
  readline.moveCursor(process.stdout, 0, -1 * SIZE);
  readline.clearScreenDown(process.stdout);
};

export { logTogglebot };
