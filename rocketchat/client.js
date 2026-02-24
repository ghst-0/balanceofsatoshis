import http from 'node:http';
import https from 'node:https';

import { AbortController } from 'abort-controller';

import { toGrammyError, toHttpError } from './error.js';


/**
 * Calls `JSON.stringify` but removes `null` values from objects before
 * serialization
 *
 * @param value value
 * @returns stringified value
 */
function str(value) {
  return JSON.stringify(value, (_, v) => v !== null && v !== void 0 ? v : undefined);
}
/**
 * Turns a payload into an options object that can be passed to a `fetch` call
 * by setting the necessary headers and method. May only be called for payloads
 * `P` that let `requiresFormDataUpload(P)` return `false`.
 *
 * @param payload The payload to wrap
 */
function createJsonPayload(payload) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      connection: "keep-alive",
    },
    body: str(payload),
  };
}



// === Base configuration for `fetch` calls
const httpAgents = new Map();
const httpsAgents = new Map();
function getCached(map, key, otherwise) {
  let value = map.get(key);
  if (value === undefined) {
    value = otherwise();
    map.set(key, value);
  }
  return value;
}

// Transformer base functions
function concatTransformer(prev, trans) {
  return (method, payload, signal) => trans(prev, method, payload, signal);
}
class ApiClient {
  constructor(token, options = {}, webhookReplyEnvelope = {}) {
    let _a, _b, _c, _d, _e, _f;
    this.token = token;
    this.webhookReplyEnvelope = webhookReplyEnvelope;
    this.hasUsedWebhookReply = false;
    this.installedTransformers = [];
    this.call = async (method, p, signal) => {
      const payload = p !== null && p !== void 0 ? p : {};
      console.debug(`Calling ${method}`);
      if (signal !== undefined)
        validateSignal(method, payload, signal);
      // General config
      const opts = this.options;
      // Short-circuit on webhook reply
      if (this.webhookReplyEnvelope.send !== undefined &&
        !this.hasUsedWebhookReply &&
        opts.canUseWebhookReply(method)) {
        this.hasUsedWebhookReply = true;
        const config = (0, createJsonPayload)({ ...payload, method });
        await this.webhookReplyEnvelope.send(config.body);
        return { ok: true, result: true };
      }
      // Handle timeouts and errors in the underlying form-data stream
      const controller = createAbortControllerFromSignal(signal);
      const timeout = createTimeout(controller, opts.timeoutSeconds, method);
      const streamErr = createStreamError(controller);
      // Build request URL and config
      const url = opts.buildUrl(opts.apiRoot, this.token, method, opts.environment);
      const config = (0, createJsonPayload)(payload);
      const sig = controller.signal;
      const options = { ...opts.baseFetchConfig, signal: sig, ...config };
      // Perform fetch call, and handle networking errors
      const successPromise = this.fetch(url instanceof URL ? url.href : url, options).catch((0, toHttpError)(method, opts.sensitiveLogs));
      // Those are the three possible outcomes of the fetch call:
      const operations = [successPromise, streamErr.promise, timeout.promise];
      // Wait for result
      try {
        const res = await Promise.race(operations);
        return await res.json();
      }
      finally {
        if (timeout.handle !== undefined)
          clearTimeout(timeout.handle);
      }
    };
    const apiRoot = options.apiRoot;
    const environment = (_b = options.environment) !== null && _b !== void 0 ? _b : "prod";

    let baseFechConfig
    if (apiRoot.startsWith("https:")) {
      baseFechConfig = {
        compress: true,
        agent: getCached(httpsAgents, apiRoot, () => new https.Agent({ keepAlive: true })),
      };
    }
    else  {
      baseFechConfig = {
        agent: getCached(httpAgents, apiRoot, () => new http.Agent({ keepAlive: true })),
      };
    }

    this.options = {
      apiRoot,
      environment,
      buildUrl: (_c = options.buildUrl) !== null && _c !== void 0 ? _c : defaultBuildUrl,
      timeoutSeconds: (_d = options.timeoutSeconds) !== null && _d !== void 0 ? _d : 500,
      baseFetchConfig: {
        ...baseFechConfig,
        ...options.baseFetchConfig,
      },
      canUseWebhookReply: (_e = options.canUseWebhookReply) !== null && _e !== void 0 ? _e : (() => false),
      sensitiveLogs: (_f = options.sensitiveLogs) !== null && _f !== void 0 ? _f : false,
      fetch: ((...args) => fetch(...args)),
    };
    this.fetch = this.options.fetch;
    if (this.options.apiRoot.endsWith("/")) {
      throw new Error(`Remove the trailing '/' from the 'apiRoot' option (use '${this.options.apiRoot.slice(0, this.options.apiRoot.length - 1)}' instead of '${this.options.apiRoot}')`);
    }
  }
  use(...transformers) {
    this.call = transformers.reduce(concatTransformer, this.call);
    this.installedTransformers.push(...transformers);
    return this;
  }
  async callApi(method, payload, signal) {
    const data = await this.call(method, payload, signal);
    if (data.ok)
      return data.result;

    throw (0, toGrammyError)(data, method, payload);
  }
}
/**
 * Creates a new transformable API, i.e. an object that lets you perform raw API
 * calls to the Telegram Bot API server but pass the calls through a stack of
 * transformers before. This will create a new API client instance under the
 * hood that will be used to connect to the Telegram servers. You therefore need
 * to pass the bot token. In addition, you may pass API client options as well
 * as a webhook reply envelope that allows the client to perform up to one HTTP
 * request in response to a webhook call if this is desired.
 *
 * @param token The bot's token
 * @param {{}} options A number of options to pass to the created API client
 * @param webhookReplyEnvelope The webhook reply envelope that will be used
 */
function createRawApi(token, options, webhookReplyEnvelope) {
  const client = new ApiClient(token, options, webhookReplyEnvelope);
  const proxyHandler = {
    get(_, m) {
      return m === "toJSON"
        ? "__internal"
        // Methods with zero parameters are called without any payload,
        // so we have to manually inject an empty payload.
        : m === "getWebhookInfo" ||
        m === "getForumTopicIconStickers" ||
        m === "getAvailableGifts" ||
        m === "logOut" ||
        m === "close" ||
        m === "getMyStarBalance" ||
        m === "removeMyProfilePhoto"
          ? client.callApi.bind(client, m, {})
          : client.callApi.bind(client, m);
    },
    ...proxyMethods,
  };
  const raw = new Proxy({}, proxyHandler);
  const installedTransformers = client.installedTransformers;
  const api = {
    raw,
    installedTransformers,
    use: (...t) => {
      client.use(...t);
      return api;
    },
  };
  return api;
}
const defaultBuildUrl = (root, token, method, env) => {
  const prefix = env === "test" ? "test/" : "";
  return `${root}/bot${token}/${prefix}${method}`;
};
const proxyMethods = {
  set() {
    return false;
  },
  defineProperty() {
    return false;
  },
  deleteProperty() {
    return false;
  },
  ownKeys() {
    return [];
  },
};
/** Creates a timeout error which aborts a given controller */
function createTimeout(controller, seconds, method) {
  let handle = undefined;
  const promise = new Promise((_, reject) => {
    handle = setTimeout(() => {
      const msg = `Request to '${method}' timed out after ${seconds} seconds`;
      reject(new Error(msg));
      controller.abort();
    }, 1000 * seconds);
  });
  return { promise, handle };
}
/** Creates a stream error which abort a given controller */
function createStreamError(abortController) {
  let onError = (err) => {
    // Re-throw by default, but will be overwritten immediately
    throw err;
  };
  const promise = new Promise((_, reject) => {
    onError = (err) => {
      reject(err);
      abortController.abort();
    };
  });
  return { promise, catch: onError };
}
function createAbortControllerFromSignal(signal) {
  const abortController = new AbortController();
  if (signal === undefined)
    return abortController;
  const sig = signal;
  function abort() {
    abortController.abort();
    sig.removeEventListener("abort", abort);
  }
  if (sig.aborted)
    abort();
  else
    sig.addEventListener("abort", abort);
  return { abort, signal: abortController.signal };
}
function validateSignal(method, payload, signal) {
  // We use a very simple heuristic to check for AbortSignal instances
  // in order to avoid doing a runtime-specific version of `instanceof`.
  if (typeof (signal === null || signal === void 0 ? void 0 : signal.addEventListener) === "function") {
    return;
  }
  let payload0 = JSON.stringify(payload);
  if (payload0.length > 20) {
    payload0 = payload0.slice(0, 16) + " ...";
  }
  let payload1 = JSON.stringify(signal);
  if (payload1.length > 20) {
    payload1 = payload1.slice(0, 16) + " ...";
  }
  throw new Error(`Incorrect abort signal instance found! \
You passed two payloads to '${method}' but you should merge \
the second one containing '${payload1}' into the first one \
containing '${payload0}'! If you are using context shortcuts, \
you may want to use a method on 'ctx.api' instead.

If you want to prevent such mistakes in the future, \
consider using TypeScript. https://www.typescriptlang.org/`);
}

export { createRawApi };
