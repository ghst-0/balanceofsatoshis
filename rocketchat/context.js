import { matchFilter } from './filter.js';

const checker = {
  filterQuery(filter) {
    const pred = (0, matchFilter)(filter);
    return (ctx) => pred(ctx);
  },
  text(trigger) {
    const hasText = checker.filterQuery([":text", ":caption"]);
    const trg = triggerFn(trigger);
    return (ctx) => {
      let _a, _b;
      if (!hasText(ctx))
        return false;
      const msg = (_a = ctx.message) !== null && _a !== void 0 ? _a : ctx.channelPost;
      const txt = (_b = msg.text) !== null && _b !== void 0 ? _b : msg.caption;
      return match(ctx, txt, trg);
    };
  },
  command(command) {
    const hasEntities = checker.filterQuery(":entities:bot_command");
    const atCommands = new Set();
    const noAtCommands = new Set();
    for (const cmd of toArray(command)) {
      if (cmd.startsWith("/")) {
        throw new Error(`Do not include '/' when registering command handlers (use '${cmd.slice(1)}' not '${cmd}')`);
      }
      const set = cmd.includes("@") ? atCommands : noAtCommands;
      set.add(cmd);
    }
    return (ctx) => {
      let _a, _b;
      if (!hasEntities(ctx))
        return false;
      const msg = (_a = ctx.message) !== null && _a !== void 0 ? _a : ctx.channelPost;
      const txt = (_b = msg.text) !== null && _b !== void 0 ? _b : msg.caption;
      return msg.entities.some((e) => {
        if (e.type !== "bot_command")
          return false;
        if (e.offset !== 0)
          return false;
        const cmd = txt.slice(1, e.length);
        if (noAtCommands.has(cmd) || atCommands.has(cmd)) {
          ctx.match = txt.slice(cmd.length + 1).trimStart();
          return true;
        }
        const index = cmd.indexOf("@");
        if (index === -1)
          return false;
        const atTarget = cmd.slice(index + 1).toLowerCase();
        const username = ctx.me.username.toLowerCase();
        if (atTarget !== username)
          return false;
        const atCommand = cmd.slice(0, index);
        if (noAtCommands.has(atCommand)) {
          ctx.match = txt.slice(cmd.length + 1).trimStart();
          return true;
        }
        return false;
      });
    };
  },
  reaction(reaction) {
    const hasMessageReaction = checker.filterQuery("message_reaction");
    const normalized = typeof reaction === "string"
      ? [{ type: "emoji", emoji: reaction }]
      : (Array.isArray(reaction) ? reaction : [reaction]).map((emoji) => typeof emoji === "string" ? { type: "emoji", emoji } : emoji);
    const emoji = new Set(normalized.filter((r) => r.type === "emoji")
      .map((r) => r.emoji));
    const customEmoji = new Set(normalized.filter((r) => r.type === "custom_emoji")
      .map((r) => r.custom_emoji_id));
    const paid = normalized.some((r) => r.type === "paid");
    return (ctx) => {
      if (!hasMessageReaction(ctx))
        return false;
      const { old_reaction, new_reaction } = ctx.messageReaction;
      // try to find a wanted reaction that is new and not old
      for (const reaction of new_reaction) {
        // first check if the reaction existed previously
        let isOld = false;
        if (reaction.type === "emoji") {
          for (const old of old_reaction) {
            if (old.type !== "emoji")
              continue;
            if (old.emoji === reaction.emoji) {
              isOld = true;
              break;
            }
          }
        }
        else if (reaction.type === "custom_emoji") {
          for (const old of old_reaction) {
            if (old.type !== "custom_emoji")
              continue;
            if (old.custom_emoji_id === reaction.custom_emoji_id) {
              isOld = true;
              break;
            }
          }
        }
        else if (reaction.type === "paid") {
          for (const old of old_reaction) {
            if (old.type !== "paid")
              continue;
            isOld = true;
            break;
          }
        }
        else {
          // always regard unsupported emoji types as new
        }
        // disregard reaction if it is not new
        if (isOld)
          continue;
        // check if the new reaction is wanted and short-circuit
        if (reaction.type === "emoji") {
          if (emoji.has(reaction.emoji))
            return true;
        }
        else if (reaction.type === "custom_emoji") {
          if (customEmoji.has(reaction.custom_emoji_id))
            return true;
        }
        else if (reaction.type === "paid") {
          if (paid)
            return true;
        }
        else {
          // always regard unsupported emoji types as new
          return true;
        }
        // new reaction not wanted, check next one
      }
      return false;
    };
  },
  callbackQuery(trigger) {
    const hasCallbackQuery = checker.filterQuery("callback_query:data");
    const trg = triggerFn(trigger);
    return (ctx) => hasCallbackQuery(ctx) && match(ctx, ctx.callbackQuery.data, trg);
  },
  inlineQuery(trigger) {
    const hasInlineQuery = checker.filterQuery("inline_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasInlineQuery(ctx) && match(ctx, ctx.inlineQuery.query, trg);
  },
  chosenInlineResult(trigger) {
    const hasChosenInlineResult = checker.filterQuery("chosen_inline_result");
    const trg = triggerFn(trigger);
    return (ctx) => hasChosenInlineResult(ctx) &&
      match(ctx, ctx.chosenInlineResult.result_id, trg);
  },
  preCheckoutQuery(trigger) {
    const hasPreCheckoutQuery = checker.filterQuery("pre_checkout_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasPreCheckoutQuery(ctx) &&
      match(ctx, ctx.preCheckoutQuery.invoice_payload, trg);
  },
  shippingQuery(trigger) {
    const hasShippingQuery = checker.filterQuery("shipping_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasShippingQuery(ctx) &&
      match(ctx, ctx.shippingQuery.invoice_payload, trg);
  },
};
// === Context class
/**
 * When your bot receives a message, Telegram sends an update object to your
 * bot. The update contains information about the chat, the user, and of course
 * the message itself. There are numerous other updates, too:
 * https://core.telegram.org/bots/api#update
 *
 * When grammY receives an update, it wraps this update into a context object
 * for you. Context objects are commonly named `ctx`. A context object does two
 * things:
 * 1. **`ctx.update`** holds the update object that you can use to process the
 *    message. This includes providing useful shortcuts for the update, for
 *    instance, `ctx.msg` is a shortcut that gives you the message object from
 *    the update—no matter whether it is contained in `ctx.update.message`, or
 *    `ctx.update.edited_message`, or `ctx.update.channel_post`, or
 *    `ctx.update.edited_channel_post`.
 * 2. **`ctx.api`** gives you access to the full Telegram Bot API so that you
 *    can directly call any method, such as responding via
 *    `ctx.api.sendMessage`. Also here, the context objects has some useful
 *    shortcuts for you. For instance, if you want to send a message to the same
 *    chat that a message comes from (i.e. just respond to a user) you can call
 *    `ctx.reply`. This is nothing but a wrapper for `ctx.api.sendMessage` with
 *    the right `chat_id` pre-filled for you. Almost all methods of the Telegram
 *    Bot API have their own shortcut directly on the context object, so you
 *    probably never really have to use `ctx.api` at all.
 *
 * This context object is then passed to all of the listeners (called
 * middleware) that you register on your bot. Because this is so useful, the
 * context object is often used to hold more information. One example are
 * sessions (a chat-specific data storage that is stored in a database), and
 * another example is `ctx.match` that is used by `bot.command` and other
 * methods to keep information about how a regular expression was matched.
 *
 * Read up about middleware on the
 * [website](https://grammy.dev/guide/context) if you want to know more
 * about the powerful opportunities that lie in context objects, and about how
 * grammY implements them.
 */
class Context {
  constructor(
    /**
     * The update object that is contained in the context.
     */
    update,
    /**
     * An API instance that allows you to call any method of the Telegram
     * Bot API.
     */
    api,
    /**
     * Information about the bot itself.
     */
    me) {
    this.update = update;
    this.api = api;
    this.me = me;
  }
  // UPDATE SHORTCUTS
  // Keep in sync with types in `filter.ts`.
  /** Alias for `ctx.update.message` */
  get message() {
    return this.update.message;
  }
  /** Alias for `ctx.update.edited_message` */
  get editedMessage() {
    return this.update.edited_message;
  }
  /** Alias for `ctx.update.channel_post` */
  get channelPost() {
    return this.update.channel_post;
  }
  /** Alias for `ctx.update.edited_channel_post` */
  get editedChannelPost() {
    return this.update.edited_channel_post;
  }
  /** Alias for `ctx.update.business_connection` */
  get businessConnection() {
    return this.update.business_connection;
  }
  /** Alias for `ctx.update.business_message` */
  get businessMessage() {
    return this.update.business_message;
  }
  /** Alias for `ctx.update.edited_business_message` */
  get editedBusinessMessage() {
    return this.update.edited_business_message;
  }
  /** Alias for `ctx.update.deleted_business_messages` */
  get deletedBusinessMessages() {
    return this.update.deleted_business_messages;
  }
  /** Alias for `ctx.update.message_reaction` */
  get messageReaction() {
    return this.update.message_reaction;
  }
  /** Alias for `ctx.update.message_reaction_count` */
  get messageReactionCount() {
    return this.update.message_reaction_count;
  }
  /** Alias for `ctx.update.inline_query` */
  get inlineQuery() {
    return this.update.inline_query;
  }
  /** Alias for `ctx.update.chosen_inline_result` */
  get chosenInlineResult() {
    return this.update.chosen_inline_result;
  }
  /** Alias for `ctx.update.callback_query` */
  get callbackQuery() {
    return this.update.callback_query;
  }
  /** Alias for `ctx.update.shipping_query` */
  get shippingQuery() {
    return this.update.shipping_query;
  }
  /** Alias for `ctx.update.pre_checkout_query` */
  get preCheckoutQuery() {
    return this.update.pre_checkout_query;
  }
  /** Alias for `ctx.update.poll` */
  get poll() {
    return this.update.poll;
  }
  /** Alias for `ctx.update.my_chat_member` */
  get myChatMember() {
    return this.update.my_chat_member;
  }
  /** Alias for `ctx.update.chat_member` */
  get chatMember() {
    return this.update.chat_member;
  }
  /** Alias for `ctx.update.chat_join_request` */
  get chatJoinRequest() {
    return this.update.chat_join_request;
  }
  /** Alias for `ctx.update.chat_boost` */
  get chatBoost() {
    return this.update.chat_boost;
  }
  /** Alias for `ctx.update.removed_chat_boost` */
  get removedChatBoost() {
    return this.update.removed_chat_boost;
  }
  /** Alias for `ctx.update.purchased_paid_media` */
  get purchasedPaidMedia() {
    return this.update.purchased_paid_media;
  }
  // AGGREGATION SHORTCUTS
  /**
   * Get the message object from wherever possible. Alias for `this.message ??
   * this.editedMessage ?? this.channelPost ?? this.editedChannelPost ??
   * this.businessMessage ?? this.editedBusinessMessage ??
   * this.callbackQuery?.message`.
   */
  get msg() {
    let _a, _b, _c, _d, _e, _f, _g;
    // Keep in sync with types in `filter.ts`.
    return ((_f = (_e = (_d = (_c = (_b = (_a = this.message) !== null && _a !== void 0 ? _a : this.editedMessage) !== null && _b !== void 0 ? _b : this.channelPost) !== null && _c !== void 0 ? _c : this.editedChannelPost) !== null && _d !== void 0 ? _d : this.businessMessage) !== null && _e !== void 0 ? _e : this.editedBusinessMessage) !== null && _f !== void 0 ? _f : (_g = this.callbackQuery) === null || _g === void 0 ? void 0 : _g.message);
  }
  /**
   * Get the chat object from wherever possible. Alias for `(this.msg ??
   * this.deletedBusinessMessages ?? this.messageReaction ??
   * this.messageReactionCount ?? this.myChatMember ??  this.chatMember ??
   * this.chatJoinRequest ?? this.chatBoost ??  this.removedChatBoost)?.chat`.
   */
  get chat() {
    let _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // Keep in sync with types in `filter.ts`.
    return (_j = ((_h = (_g = (_f = (_e = (_d = (_c = (_b = (_a = this.msg) !== null && _a !== void 0 ? _a : this.deletedBusinessMessages) !== null && _b !== void 0 ? _b : this.messageReaction) !== null && _c !== void 0 ? _c : this.messageReactionCount) !== null && _d !== void 0 ? _d : this.myChatMember) !== null && _e !== void 0 ? _e : this.chatMember) !== null && _f !== void 0 ? _f : this.chatJoinRequest) !== null && _g !== void 0 ? _g : this.chatBoost) !== null && _h !== void 0 ? _h : this.removedChatBoost)) === null || _j === void 0 ? void 0 : _j.chat;
  }
  /**
   * Get the user object from wherever possible. Alias for
   * `(this.businessConnection ?? this.messageReaction ??
   * (this.chatBoost?.boost ?? this.removedChatBoost)?.source)?.user ??
   * (this.callbackQuery ?? this.msg ?? this.inlineQuery ??
   * this.chosenInlineResult ?? this.shippingQuery ?? this.preCheckoutQuery ??
   * this.myChatMember ?? this.chatMember ?? this.chatJoinRequest ??
   * this.purchasedPaidMedia)?.from`.
   */
  get from() {
    let _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    // Keep in sync with types in `filter.ts`.
    return (_g = (_f = ((_b = (_a = this.businessConnection) !== null && _a !== void 0 ? _a : this.messageReaction) !== null && _b !== void 0 ? _b : (_e = ((_d = (_c = this.chatBoost) === null || _c === void 0 ? void 0 : _c.boost) !== null && _d !== void 0 ? _d : this.removedChatBoost)) === null || _e === void 0 ? void 0 : _e.source)) === null || _f === void 0 ? void 0 : _f.user) !== null && _g !== void 0 ? _g : (_s = ((_r = (_q = (_p = (_o = (_m = (_l = (_k = (_j = (_h = this.callbackQuery) !== null && _h !== void 0 ? _h : this.msg) !== null && _j !== void 0 ? _j : this.inlineQuery) !== null && _k !== void 0 ? _k : this.chosenInlineResult) !== null && _l !== void 0 ? _l : this.shippingQuery) !== null && _m !== void 0 ? _m : this.preCheckoutQuery) !== null && _o !== void 0 ? _o : this.myChatMember) !== null && _p !== void 0 ? _p : this.chatMember) !== null && _q !== void 0 ? _q : this.chatJoinRequest) !== null && _r !== void 0 ? _r : this.purchasedPaidMedia)) === null || _s === void 0 ? void 0 : _s.from;
  }
  /**
   * Gets the chat identifier from wherever possible. Alias for `this.chat?.id
   * ?? this.businessConnection?.user_chat_id`.
   */
  get chatId() {
    let _a, _b, _c;
    // Keep in sync with types in `filter.ts`.
    return (_b = (_a = this.chat) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (_c = this.businessConnection) === null || _c === void 0 ? void 0 : _c.user_chat_id;
  }
  /**
   * Get the inline message identifier from wherever possible. Alias for
   * `(ctx.callbackQuery ?? ctx.chosenInlineResult)?.inline_message_id`.
   */
  get inlineMessageId() {
    let _a, _b, _c;
    return ((_b = (_a = this.callbackQuery) === null || _a === void 0 ? void 0 : _a.inline_message_id) !== null && _b !== void 0 ? _b : (_c = this.chosenInlineResult) === null || _c === void 0 ? void 0 : _c.inline_message_id);
  }
  /**
   * Get the business connection identifier from wherever possible. Alias for
   * `this.msg?.business_connection_id ?? this.businessConnection?.id ??
   * this.deletedBusinessMessages?.business_connection_id`.
   */
  get businessConnectionId() {
    let _a, _b, _c, _d, _e;
    return (_d = (_b = (_a = this.msg) === null || _a === void 0 ? void 0 : _a.business_connection_id) !== null && _b !== void 0 ? _b : (_c = this.businessConnection) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : (_e = this.deletedBusinessMessages) === null || _e === void 0 ? void 0 : _e.business_connection_id;
  }
  entities(types) {
    let _a, _b;
    const message = this.msg;
    if (message === undefined)
      return [];
    const text = (_a = message.text) !== null && _a !== void 0 ? _a : message.caption;
    if (text === undefined)
      return [];
    let entities = (_b = message.entities) !== null && _b !== void 0 ? _b : message.caption_entities;
    if (entities === undefined)
      return [];
    if (types !== undefined) {
      const filters = new Set(toArray(types));
      entities = entities.filter((entity) => filters.has(entity.type));
    }
    return entities.map((entity) => ({
      ...entity,
      text: text.substring(entity.offset, entity.offset + entity.length),
    }));
  }
  /**
   * Returns `true` if this context object matches the given filter query, and
   * `false` otherwise. This uses the same logic as `bot.on`.
   *
   * @param filter The filter query to check
   */
  has(filter) {
    return Context.has.filterQuery(filter)(this);
  }
  // API
  /**
   * Context-aware alias for `api.sendMessage`. Use this method to send text messages. On success, the sent Message is returned.
   *
   * @param text Text of the message to be sent, 1-4096 characters after entities parsing
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#sendmessage
   */
  reply(text, other, signal) {
    let _a;
    const msg = this.msg;
    return this.api.sendMessage(orThrow(this.chatId, "sendMessage"), text, {
      business_connection_id: this.businessConnectionId,
      ...((msg === null || msg === void 0 ? void 0 : msg.is_topic_message)
        ? { message_thread_id: msg.message_thread_id }
        : {}),
      direct_messages_topic_id: (_a = msg === null || msg === void 0 ? void 0 : msg.direct_messages_topic) === null || _a === void 0 ? void 0 : _a.topic_id,
      ...other,
    }, signal);
  }
  /**
   * Context-aware alias for `api.sendDocument`. Use this method to send general files. On success, the sent Message is returned. Bots can currently send files of any type of up to 50 MB in size, this limit may be changed in the future.
   *
   * @param document File to send. Pass a file_id as String to send a file that exists on the Telegram servers (recommended), pass an HTTP URL as a String for Telegram to get a file from the Internet, or upload a new one using multipart/form-data.
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#senddocument
   */
  replyWithDocument(document, other, signal) {
    let _a;
    const msg = this.msg;
    return this.api.sendDocument(orThrow(this.chatId, "sendDocument"), document, {
      business_connection_id: this.businessConnectionId,
      ...((msg === null || msg === void 0 ? void 0 : msg.is_topic_message)
        ? { message_thread_id: msg.message_thread_id }
        : {}),
      direct_messages_topic_id: (_a = msg === null || msg === void 0 ? void 0 : msg.direct_messages_topic) === null || _a === void 0 ? void 0 : _a.topic_id,
      ...other,
    }, signal);
  }
  /**
   * Context-aware alias for `api.sendChatAction`. Use this method when you need to tell the user that something is happening on the bot's side. The status is set for 5 seconds or less (when a message arrives from your bot, Telegram clients clear its typing status). Returns True on success.
   *
   * Example: The ImageBot needs some time to process a request and upload the image. Instead of sending a text message along the lines of “Retrieving image, please wait…”, the bot may use sendChatAction with action = upload_photo. The user will see a “sending photo” status for the bot.
   *
   * We only recommend using this method when a response from the bot will take a noticeable amount of time to arrive.
   *
   * @param action Type of action to broadcast. Choose one, depending on what the user is about to receive: typing for text messages, upload_photo for photos, record_video or upload_video for videos, record_voice or upload_voice for voice notes, upload_document for general files, choose_sticker for stickers, find_location for location data, record_video_note or upload_video_note for video notes.
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#sendchataction
   */
  replyWithChatAction(action, other, signal) {
    const msg = this.msg;
    return this.api.sendChatAction(orThrow(this.chatId, "sendChatAction"), action, {
      business_connection_id: this.businessConnectionId,
      message_thread_id: msg === null || msg === void 0 ? void 0 : msg.message_thread_id,
      ...other,
    }, signal);
  }
  /**
   * Context-aware alias for `api.getFile`. Use this method to get basic info about a file and prepare it for downloading. For the moment, bots can download files of up to 20MB in size. On success, a File object is returned. The file can then be downloaded via the link https://api.telegram.org/file/bot<token>/<file_path>, where <file_path> is taken from the response. It is guaranteed that the link will be valid for at least 1 hour. When the link expires, a new one can be requested by calling getFile again.
   *
   * Note: This function may not preserve the original file name and MIME type. You should save the file's MIME type and name (if available) when the File object is received.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#getfile
   */
  getFile(signal) {
    let _a, _b, _c, _d, _e, _f;
    const m = orThrow(this.msg, "getFile");
    const file = m.photo !== undefined
      ? m.photo.at(-1)
      : (_f = (_e = (_d = (_c = (_b = (_a = m.animation) !== null && _a !== void 0 ? _a : m.audio) !== null && _b !== void 0 ? _b : m.document) !== null && _c !== void 0 ? _c : m.video) !== null && _d !== void 0 ? _d : m.video_note) !== null && _e !== void 0 ? _e : m.voice) !== null && _f !== void 0 ? _f : m.sticker;
    return this.api.getFile(orThrow(file, "getFile").file_id, signal);
  }
  /**
   * Context-aware alias for `api.answerCallbackQuery`. Use this method to send answers to callback queries sent from inline keyboards. The answer will be displayed to the user as a notification at the top of the chat screen or as an alert. On success, True is returned.
   *
   * Alternatively, the user can be redirected to the specified Game URL. For this option to work, you must first create a game for your bot via @BotFather and accept the terms. Otherwise, you may use links like t.me/your_bot?start=XXXX that open your bot with a parameter.
   *
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#answercallbackquery
   */
  answerCallbackQuery(other, signal) {
    return this.api.answerCallbackQuery(orThrow(this.callbackQuery, "answerCallbackQuery").id, typeof other === "string" ? { text: other } : other, signal);
  }
  /**
   * Context-aware alias for `api.editMessageText`. Use this method to edit text and game messages. On success, if the edited message is not an inline message, the edited Message is returned, otherwise True is returned. Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours from the time they were sent.
   *
   * @param text New text of the message, 1-4096 characters after entities parsing
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#editmessagetext
   */
  editMessageText(text, other, signal) {
    let _a, _b, _c, _d, _e;
    const inlineId = this.inlineMessageId;
    return inlineId !== undefined
      ? this.api.editMessageTextInline(inlineId, text, { business_connection_id: this.businessConnectionId, ...other }, signal)
      : this.api.editMessageText(orThrow(this.chatId, "editMessageText"), orThrow((_d = (_b = (_a = this.msg) === null || _a === void 0 ? void 0 : _a.message_id) !== null && _b !== void 0 ? _b : (_c = this.messageReaction) === null || _c === void 0 ? void 0 : _c.message_id) !== null && _d !== void 0 ? _d : (_e = this.messageReactionCount) === null || _e === void 0 ? void 0 : _e.message_id, "editMessageText"), text, { business_connection_id: this.businessConnectionId, ...other }, signal);
  }
  /**
   * Context-aware alias for `api.deleteMessage`. Use this method to delete a message, including service messages, with the following limitations:
   * - A message can only be deleted if it was sent less than 48 hours ago.
   * - A dice message in a private chat can only be deleted if it was sent more than 24 hours ago.
   * - Bots can delete outgoing messages in private chats, groups, and supergroups.
   * - Bots can delete incoming messages in private chats.
   * - Bots granted can_post_messages permissions can delete outgoing messages in channels.
   * - If the bot is an administrator of a group, it can delete any message there.
   * - If the bot has can_delete_messages administrator right in a supergroup or a channel, it can delete any message there.
   * - If the bot has can_manage_direct_messages administrator right in a channel, it can delete any message in the corresponding direct messages chat.
   * Returns True on success.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#deletemessage
   */
  deleteMessage(signal) {
    let _a, _b, _c, _d, _e;
    return this.api.deleteMessage(orThrow(this.chatId, "deleteMessage"), orThrow((_d = (_b = (_a = this.msg) === null || _a === void 0 ? void 0 : _a.message_id) !== null && _b !== void 0 ? _b : (_c = this.messageReaction) === null || _c === void 0 ? void 0 : _c.message_id) !== null && _d !== void 0 ? _d : (_e = this.messageReactionCount) === null || _e === void 0 ? void 0 : _e.message_id, "deleteMessage"), signal);
  }
}

// PROBING SHORTCUTS
/**
 * `Context.has` is an object that contains a number of useful functions for
 * probing context objects. Each of these functions can generate a predicate
 * function, to which you can pass context objects in order to check if a
 * condition holds for the respective context object.
 *
 * For example, you can call `Context.has.filterQuery(":text")` to generate
 * a predicate function that tests context objects for containing text:
 * ```ts
 * const hasText = Context.has.filterQuery(":text");
 *
 * if (hasText(ctx0)) {} // `ctx0` matches the filter query `:text`
 * if (hasText(ctx1)) {} // `ctx1` matches the filter query `:text`
 * if (hasText(ctx2)) {} // `ctx2` matches the filter query `:text`
 * ```
 * These predicate functions are used internally by the has-methods that are
 * installed on every context object. This means that calling
 * `ctx.has(":text")` is equivalent to
 * `Context.has.filterQuery(":text")(ctx)`.
 */
Context.has = checker;
// === Util functions
function orThrow(value, method) {
  if (value === undefined) {
    throw new Error(`Missing information for API call to ${method}`);
  }
  return value;
}
function triggerFn(trigger) {
  return toArray(trigger).map((t) => typeof t === "string"
    ? (txt) => (txt === t ? t : null)
    : (txt) => txt.match(t));
}
function match(ctx, content, triggers) {
  for (const t of triggers) {
    const res = t(content);
    if (res) {
      ctx.match = res;
      return true;
    }
  }
  return false;
}
function toArray(e) {
  return Array.isArray(e) ? e : [e];
}

export { Context };
