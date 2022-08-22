import fetch from "node-fetch";
import type Message from "./interfaces/Message.js";
import type mfaResponse from "./interfaces/mfaResponse.js";
import type loginResponse from "./interfaces/loginResponse.js";
import type DiscordCounterOptions from "./interfaces/DiscordCounterOptions.js";
import { config, headers } from "./app.js";
import logger from "./logger.js";

export default class DiscordCounter {
    mfaToken: string;
    channelId: string;
    userId: string;
    messages: Message[];
    interval: number;
    private stopped: boolean;

    /**
     * @param options The necessary configuration options for the counter
     */
    constructor(options?: DiscordCounterOptions) {
        this.mfaToken = options?.mfaToken ?? "";
        this.channelId = options?.channelId ?? "";
        this.userId = options?.userId ?? "";
        this.interval = options?.interval ?? 30;
        this.messages = [];
        this.stopped = false;
    }

    /**
     * Sets the MFA token to use for API requests
     * @param token The MFA token
     */
    public setMfaToken(token: string) {
        this.mfaToken = token;
        return this;
    }

    /**
     * Set the channel to count in
     * @param channelId The channel id
     */
    public setChannelId(channelId: string) {
        this.channelId = channelId;
        return this;
    }

    /**
     * Set the user to count as
     * @param userId The user id
     */
    public setUserId(userId: string) {
        this.userId = userId;
        return this;
    }

    /**
     * Sets the interval for the counter loop
     * @param interval How often to count in seconds (every x seconds)
     */
    public setInterval(interval: number) {
        this.interval = interval;
        return this;
    }

    /**
     * Throws Error if there are missing necessary arguments
     *
     * Needed cause using setters hides missing arguments
     */
    private _checkArgs() {
        if (!this.mfaToken || !this.channelId || !this.userId)
            throw new Error("You must set the MFA token, Channel Id and User Id at least");
    }

    /**
     * Starts the Loop and sends the first message
     */
    public async start() {
        this._checkArgs();
        const err = await this.sendMessage();

        if (err instanceof Error) {
            logger.error(err.message);
        } else {
            logger.info(err);
        }

        const counterLoop = setInterval(async () => {
            if (this.stopped) clearInterval(counterLoop);
            const err = await this.sendMessage();

            if (err instanceof Error) {
                logger.error(err);
            } else {
                logger.info(err);
            }
        }, this.interval * 1000);
    }

    /**
     * Stops the counter loop
     */
    public async stop() {
        this.stopped = true;
        logger.info("Stopped Discord Counter");
    }

    /**
     * Fetches messages from the channel and sends the next number. Logs errors.
     */
    public async sendMessage() {
        try {
            this.messages = await this.fetchMessages();
            const currentNum = this._getCurrentNum();

            if (!this.messages.length) throw new Error("Failed to fetch messages from discord");

            return await this._sendIncrementedNum(currentNum);
        } catch (err) {
            return err as Error;
        }
    }

    /**
     * Makes a request to discord to fetch the latest messages in the channel
     * @returns An array of messages from the channel
     */
    public async fetchMessages(limit: number = 10) {
        const messagesRes = await fetch(
            `https://discord.com/api/v9/channels/${this.channelId}/messages?limit=${limit}`,
            {
                method: "GET",
                headers: {
                    ...headers,
                    authorization: this.mfaToken,
                },
            }
        );
        logger.debug(`Fetch response: ${messagesRes.status} ${messagesRes.statusText}`);
        if (!messagesRes.ok) return [];
        return (await messagesRes.json()) as Message[];
    }

    /**
     * Checks the latest messages and looks for the latest one that is a valid number
     */
    private _getCurrentNum() {
        const latestNumericMessage = this._getLatestNumericMessage();

        if (!latestNumericMessage)
            throw new Error("Couldn't find a single message that is a valid number");
        const currentNum = parseInt(latestNumericMessage.content);

        if (latestNumericMessage.author.id === config.userId)
            throw new Error("You can't send multiple messages in a row!");
        if (
            isNaN(parseInt(this.messages[0].content)) ||
            parseInt(this.messages[0].content) !== parseInt(this.messages[1].content) + 1
        )
            return 0;
        return currentNum;
    }

    /**
     * Checks the latest messages and looks for the latest one that is a valid number
     */
    private _getLatestNumericMessage() {
        return this.messages.find((message) => parseInt(message.content) >= 0);
    }

    /**
     * Makes a request to discord to send the incremented number in the channel
     * @param currentNum The currently highest number in the channel
     */
    private async _sendIncrementedNum(currentNum: number) {
        const response = await fetch(
            `https://discord.com/api/v9/channels/${this.channelId}/messages`,
            {
                method: "POST",
                headers: {
                    ...headers,
                    authorization: this.mfaToken,
                },
                body: JSON.stringify({
                    content: `${currentNum + 1}`,
                }),
            }
        );

        logger.debug(`Increment response: ${response.status} ${response.statusText}`);
        if (response.statusText === "Too Many Requests")
            throw new Error(`Failed to send message, Slow Mode is still on!`);
        else if (!response.ok)
            throw new Error(`Failed to send message, discord's API is probably having issues`);

        if (currentNum === 0) return `Started counting from 0 again`;

        return `Successfully incremented number ${currentNum} to ${currentNum + 1}`;
    }

    /**
     * Makes some requests to discord's API to obtain the MFA token that's necessary for every subsequent request
     * @param mfaCode The MFA code provided by the user
     * @returns a valid MFA token
     */
    static async getMfaToken(mfaCode: string) {
        const loginResponse = await fetch("https://discord.com/api/v9/auth/login", {
            method: "POST",
            headers,
            body: JSON.stringify({
                captcha_key: null,
                gift_code_sku_id: null,
                login: config.email,
                login_source: null,
                password: config.password,
                undelete: false,
            }),
        });

        if (loginResponse.status === 400)
            throw new Error("Invalid email or password, check your config.jsonc");
        else if (!loginResponse.ok)
            throw new Error("Failed to login, discord's API is probably having issues");
        const { ticket } = (await loginResponse.json()) as loginResponse;

        logger.info("Successfully logged in");

        const mfaResponse = await fetch("https://discord.com/api/v9/auth/mfa/totp", {
            method: "POST",
            headers,
            body: JSON.stringify({
                code: mfaCode,
                ticket,
                login_source: null,
                gift_code_sku_id: null,
            }),
        });

        if (mfaResponse.status === 400) throw new Error("Invalid MFA code");
        else if (!mfaResponse.ok)
            throw new Error(`Failed to get MFA token, discord's API is probably having issues`);

        logger.info("Successfully obtained MFA token");
        return ((await mfaResponse.json()) as mfaResponse).token;
    }
}
