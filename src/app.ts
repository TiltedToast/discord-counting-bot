import pkg from "cookiefile";
import { readFileSync } from "fs";
const { CookieMap } = pkg;
import promptSync from "prompt-sync";
import DiscordCounter from "./DiscordCounter.js";
import logger from "./logger.js";
import { jsonc } from "jsonc";
import type Config from "./interfaces/Config.js";

let cookieFile = new CookieMap("./cookies.txt");
const cookies: string = cookieFile.toRequestHeader().split(" ").slice(1).join(" ");
export const headers = { cookies, "content-type": "application/json" };
export const config = jsonc.parse(readFileSync("./config.jsonc", "utf8")) as Config;

if (process.argv.includes("--debug")) {
    logger.level = "debug";
}

async function main() {
    const mfaCode = promptSync()("Enter MFA code: ");
    let mfaToken: string;

    const { userId, channelId, interval } = config;

    try {
        mfaToken = await DiscordCounter.getMfaToken(mfaCode);
    } catch (error) {
        return logger.error(error);
    }
    logger.debug(`MFA token: ${mfaToken}`);
    logger.debug(JSON.stringify(headers, null, 4));

    const dc = new DiscordCounter()
        .setMfaToken(mfaToken)
        .setUserId(userId)
        .setChannelId(channelId)
        .setInterval(interval);

    return await dc.start();
}

await main();
