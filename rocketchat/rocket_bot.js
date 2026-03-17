import { Composer } from './composer.js';

import { Context } from './context.js';
import { Api } from './api.js';
import { GrammyError, HttpError } from './error.js';
import { parse, preprocess } from './filter.js';

const DEFAULT_UPDATE_TYPES = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
  "business_connection",
  "business_message",
  "edited_business_message",
  "deleted_business_messages",
  "inline_query",
  "chosen_inline_result",
  "callback_query",
  "shipping_query",
  "pre_checkout_query",
  "purchased_paid_media",
  "poll",
  "poll_answer",
  "my_chat_member",
  "chat_join_request",
  "chat_boost",
  "removed_chat_boost",
];
/**
 * This is the single most important class of grammY. It represents your bot.
 *
 * You should do three things to run your bot:
 * ```ts
 * // 1. Create a bot instance
 * const bot = new Bot('<secret-token>')
 * // 2. Listen for updates
 * bot.on('message:text', ctx => ctx.reply('You wrote: ' + ctx.message.text))
 * // 3. Launch it!
 * bot.start()
 * ```
 */
class Bot extends Composer {
  /**
   * Creates a new Bot with the given token.
   *
   * Remember that you can listen for messages by calling
   * ```ts
   * bot.on('message', ctx => { ... })
   * ```
   * or similar methods.
   *
   * The simplest way to start your bot is via simple long polling:
   * ```ts
   * bot.start()
   * ```
   *
   * @param token The bot's token as acquired from https://t.me/BotFather
   * @param config Optional configuration properties for the bot
   */
  constructor(token, config) {
    let _a;
    super();
    this.token = token;
    this.lastTriedUpdateId = 0;
    /** Used to log a warning if some update types are not in allowed_updates */
    this.observedUpdateTypes = new Set();
    /**
     * Holds the bot's error handler that is invoked whenever middleware throws
     * (rejects). If you set your own error handler via `bot.catch`, all that
     * happens is that this variable is assigned.
     */
    this.errorHandler = (err) => {
      let _a, _b;
      console.error("Error in middleware while handling update", (_b = (_a = err.ctx) === null || _a === void 0 ? void 0 : _a.update) === null || _b === void 0 ? void 0 : _b.update_id, err.error);
      console.error("No error handler was set!");
      console.error("Set your own error handler with `bot.catch = ...`");
      throw err;
    };
    if (!token)
      throw new Error("Empty token!");
    this.me = config === null || config === void 0 ? void 0 : config.botInfo;
    this.clientConfig = config === null || config === void 0 ? void 0 : config.client;
    this.ContextConstructor = (_a = config === null || config === void 0 ? void 0 : config.ContextConstructor) !== null && _a !== void 0 ? _a : Context;
    this.api = new Api(token, this.clientConfig);
  }
  /**
   * Starting the bot will always perform the initialization automatically,
   * unless a manual value is already set.
   *
   * Note that the recommended way to set a custom bot information object is
   * to pass it to the configuration object of the `new Bot()` instantiation,
   * rather than assigning this property.
   */
  set botInfo(botInfo) {
    this.me = botInfo;
  }
  get botInfo() {
    if (this.me === undefined) {
      throw new Error("Bot information unavailable! Make sure to call `await bot.init()` before accessing `bot.botInfo`!");
    }
    return this.me;
  }
  /**
   * @inheritdoc
   */
  on(filter, ...middleware) {
    for (const [u] of (0, parse)(filter).flatMap(preprocess)) {
      this.observedUpdateTypes.add(u);
    }
    return super.on(filter, ...middleware);
  }
  /**
   * @inheritdoc
   */
  reaction(reaction, ...middleware) {
    this.observedUpdateTypes.add("message_reaction");
    return super.reaction(reaction, ...middleware);
  }
  /**
   * Sets the bots error handler that is used during long polling.
   *
   * You should call this method to set an error handler if you are using long
   * polling, no matter whether you use `bot.start` or the `@grammyjs/runner`
   * package to run your bot.
   *
   * Calling `bot.catch` when using other means of running your bot (or
   * webhooks) has no effect.
   *
   * @param errorHandler A function that handles potential middleware errors
   */
  catch(errorHandler) {
    this.errorHandler = errorHandler;
  }
}

/**
 * Performs a network call task, retrying upon known errors until success.
 *
 * If the task errors and a retry_after value can be used, a subsequent retry
 * will be delayed by the specified period of time.
 *
 * Otherwise, if the first attempt at running the task fails, the task is
 * retried immediately. If second attempt fails, too, waits for 100 ms, and then
 * doubles this delay for every subsequent attempt. Never waits longer than 1
 * hour before retrying.
 *
 * @param task Async task to perform
 * @param signal Optional `AbortSignal` to prevent further retries
 */
async function withRetries(task, signal) {
  // Set up delays between retries
  const INITIAL_DELAY = 50; // ms
  let lastDelay = INITIAL_DELAY;
  // Define error handler
  /**
   * Determines the error handling strategy based on various error types.
   * Sleeps if necessary, and returns whether to retry or rethrow an error.
   */
  async function handleError(error) {
    let delay = false;
    let strategy = "rethrow";
    if (error instanceof HttpError) {
      delay = true;
      strategy = "retry";
    }
    else if (error instanceof GrammyError) {
      if (error.error_code >= 500) {
        delay = true;
        strategy = "retry";
      }
      else if (error.error_code === 429) {
        const retryAfter = error.parameters.retry_after;
        if (typeof retryAfter === "number") {
          // ignore the backoff for sleep, then reset it
          await sleep(retryAfter, signal);
          lastDelay = INITIAL_DELAY;
        }
        else {
          delay = true;
        }
        strategy = "retry";
      }
    }
    if (delay) {
      // Do not sleep for the first retry
      if (lastDelay !== INITIAL_DELAY) {
        await sleep(lastDelay, signal);
      }
      const TWENTY_MINUTES = 20 * 60 * 1000; // ms
      lastDelay = Math.min(TWENTY_MINUTES, 2 * lastDelay);
    }
    return strategy;
  }
  // Perform the actual task with retries
  let result = { ok: false };
  while (!result.ok) {
    try {
      result = { ok: true, value: await task() };
    }
    catch (error) {
      console.error(error);
      const strategy = await handleError(error);
      switch (strategy) {
        case "retry":
          continue;
        case "rethrow":
          throw error;
      }
    }
  }
  return result.value;
}
/**
 * Returns a new promise that resolves after the specified number of seconds, or
 * rejects as soon as the given signal is aborted.
 */
async function sleep(seconds, signal) {
  let handle;
  let reject;
  function abort() {
    reject === null || reject === void 0 ? void 0 : reject(new Error("Aborted delay"));
    if (handle !== undefined)
      clearTimeout(handle);
  }
  try {
    await new Promise((res, rej) => {
      reject = rej;
      if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
        abort();
        return;
      }
      signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", abort);
      handle = setTimeout(res, 1000 * seconds);
    });
  }
  finally {
    signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", abort);
  }
}
/**
 * Takes a set of observed update types and a list of allowed updates and logs a
 * warning in debug mode if some update types were observed that have not been
 * allowed.
 */
function validateAllowedUpdates(updates, allowed = DEFAULT_UPDATE_TYPES) {
  const impossible = Array.from(updates).filter((u) => !allowed.includes(u));
  if (impossible.length > 0) {
    console.warn(`You registered listeners for the following update types, \
but you did not specify them in \`allowed_updates\` \
so they may not be received: ${impossible.map((u) => `'${u}'`).join(", ")}`);
  }
}
function noUseFunction() {
  throw new Error(`It looks like you are registering more listeners \
on your bot from within other listeners! This means that every time your bot \
handles a message like this one, new listeners will be added. This list grows until \
your machine crashes, so grammY throws this error to tell you that you should \
probably do things a bit differently.

On the other hand, if you actually know what you're doing and you do need to install \
further middleware while your bot is running, consider installing a composer \
instance on your bot, and in turn augment the composer after the fact. This way, \
you can circumvent this protection against memory leaks.`);
}

export { Bot, DEFAULT_UPDATE_TYPES }
