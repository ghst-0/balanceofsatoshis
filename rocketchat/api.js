import { createRawApi } from './client.js';

/**
 * This class provides access to the full Telegram Bot API. All methods of the
 * API have an equivalent on this class, with the most important parameters
 * pulled up into the function signature, and the other parameters captured by
 * an object.
 *
 * In addition, this class has a property `raw` that provides raw access to the
 * complete Telegram API, with the method signatures 1:1 represented as
 * documented on the website (https://core.telegram.org/bots/api).
 *
 * Every method takes an optional `AbortSignal` object that allows you to cancel
 * the request if desired.
 *
 * In advanced use cases, this class allows to install transformers that can
 * modify the method and payload on the fly before sending it to the Telegram
 * servers. Confer the `config` property for this.
 */
class Api {
  /**
   * Constructs a new instance of `Api`. It is independent from all other
   * instances of this class. For example, this lets you install a custom set
   * of transformers.
   *
   * @param token Bot API token obtained from [@BotFather](https://t.me/BotFather)
   * @param {{}} options Optional API client options for the underlying client instance
   * @param webhookReplyEnvelope Optional envelope to handle webhook replies
   */
  constructor(token, options, webhookReplyEnvelope) {
    this.token = token;
    this.options = options;
    const { raw, use, installedTransformers } = (0, createRawApi)(token, options, webhookReplyEnvelope);
    this.raw = raw;
    this.config = {
      use,
      installedTransformers: () => installedTransformers.slice(),
    };
  }
  /**
   * Use this method to get current webhook status. Requires no parameters. On success, returns a WebhookInfo object. If the bot is using getUpdates, will return an object with the url field empty.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#getwebhookinfo
   */
  getWebhookInfo(signal) {
    return this.raw.getWebhookInfo(signal);
  }
  /**
   * A simple method for testing your bot's authentication token. Requires no parameters. Returns basic information about the bot in form of a User object.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#getme
   */
  getMe(signal) {
    return this.raw.getMe(signal);
  }
  /**
   * Use this method to log out from the cloud Bot API server before launching the bot locally. You must log out the bot before running it locally, otherwise there is no guarantee that the bot will receive updates. After a successful call, you can immediately log in on a local server, but will not be able to log in back to the cloud Bot API server for 10 minutes. Returns True on success. Requires no parameters.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#logout
   */
  logOut(signal) {
    return this.raw.logOut(signal);
  }
  /**
   * Use this method to send text messages. On success, the sent Message is returned.
   *
   * @param chat_id Unique identifier for the target chat or username of the target channel (in the format @channelusername)
   * @param text Text of the message to be sent, 1-4096 characters after entities parsing
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#sendmessage
   */
  sendMessage(chat_id, text, other, signal) {
    return this.raw.sendMessage({ chat_id, text, ...other }, signal);
  }
  /**
   * Use this method to send general files. On success, the sent Message is returned. Bots can currently send files of any type of up to 50 MB in size, this limit may be changed in the future.
   *
   * @param chat_id Unique identifier for the target chat or username of the target channel (in the format @channelusername)
   * @param document File to send. Pass a file_id as String to send a file that exists on the Telegram servers (recommended), pass an HTTP URL as a String for Telegram to get a file from the Internet, or upload a new one using multipart/form-data.
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#senddocument
   */
  sendDocument(chat_id, document, other, signal) {
    return this.raw.sendDocument({ chat_id, document, ...other }, signal);
  }
  /**
   * Use this method when you need to tell the user that something is happening on the bot's side. The status is set for 5 seconds or less (when a message arrives from your bot, Telegram clients clear its typing status). Returns True on success.
   *
   * Example: The ImageBot needs some time to process a request and upload the image. Instead of sending a text message along the lines of “Retrieving image, please wait…”, the bot may use sendChatAction with action = upload_photo. The user will see a “sending photo” status for the bot.
   *
   * We only recommend using this method when a response from the bot will take a noticeable amount of time to arrive.
   *
   * @param chat_id Unique identifier for the target chat or username of the target supergroup (in the format @supergroupusername). Channel chats and channel direct messages chats aren't supported.
   * @param action Type of action to broadcast. Choose one, depending on what the user is about to receive: typing for text messages, upload_photo for photos, record_video or upload_video for videos, record_voice or upload_voice for voice notes, upload_document for general files, choose_sticker for stickers, find_location for location data, record_video_note or upload_video_note for video notes.
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#sendchataction
   */
  sendChatAction(chat_id, action, other, signal) {
    return this.raw.sendChatAction({ chat_id, action, ...other }, signal);
  }
  /**
   * Use this method to get basic info about a file and prepare it for downloading. For the moment, bots can download files of up to 20MB in size. On success, a File object is returned. The file can then be downloaded via the link `https://api.telegram.org/file/bot<token>/<file_path>`, where `<file_path>` is taken from the response. It is guaranteed that the link will be valid for at least 1 hour. When the link expires, a new one can be requested by calling getFile again.
   *
   * Note: This function may not preserve the original file name and MIME type. You should save the file's MIME type and name (if available) when the File object is received.
   *
   * @param file_id File identifier to get info about
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#getfile
   */
  getFile(file_id, signal) {
    return this.raw.getFile({ file_id }, signal);
  }

  /**
   * Use this method to get custom emoji stickers, which can be used as a forum topic icon by any user. Requires no parameters. Returns an Array of Sticker objects.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#getforumtopiciconstickers
   */
  getForumTopicIconStickers(signal) {
    return this.raw.getForumTopicIconStickers(signal);
  }
  /**
   * Use this method to send answers to callback queries sent from inline keyboards. The answer will be displayed to the user as a notification at the top of the chat screen or as an alert. On success, True is returned.
   *
   * Alternatively, the user can be redirected to the specified Game URL. For this option to work, you must first create a game for your bot via @BotFather and accept the terms. Otherwise, you may use links like t.me/your_bot?start=XXXX that open your bot with a parameter.
   *
   * @param callback_query_id Unique identifier for the query to be answered
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#answercallbackquery
   */
  answerCallbackQuery(callback_query_id, other, signal) {
    return this.raw.answerCallbackQuery({ callback_query_id, ...other }, signal);
  }
  /**
   * Use this method to change the list of the bot's commands. See https://core.telegram.org/bots/features#commands for more details about bot commands. Returns True on success.
   *
   * @param commands A list of bot commands to be set as the list of the bot's commands. At most 100 commands can be specified.
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#setmycommands
   */
  setMyCommands(commands, other, signal) {
    return this.raw.setMyCommands({ commands, ...other }, signal);
  }
  /**
   * Removes the profile photo of the bot. Requires no parameters. Returns True on success.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#removemyprofilephoto
   */
  removeMyProfilePhoto(signal) {
    return this.raw.removeMyProfilePhoto(signal);
  }
  /**
   * A method to get the current Telegram Stars balance of the bot. Requires no parameters. On success, returns a StarAmount object.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#getmystarbalance
   */
  getMyStarBalance(signal) {
    return this.raw.getMyStarBalance(signal);
  }
  /**
   * Use this method to edit text and game messages. On success, if the edited message is not an inline message, the edited Message is returned, otherwise True is returned. Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours from the time they were sent.
   *
   * @param chat_id Unique identifier for the target chat or username of the target channel (in the format @channelusername)
   * @param message_id Identifier of the message to edit
   * @param text New text of the message, 1-4096 characters after entities parsing
   * @param other Optional remaining parameters, confer the official reference below
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#editmessagetext
   */
  editMessageText(chat_id, message_id, text, other, signal) {
    return this.raw.editMessageText({ chat_id, message_id, text, ...other }, signal);
  }
  /**
   * Use this method to delete a message, including service messages, with the following limitations:
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
   * @param chat_id Unique identifier for the target chat or username of the target channel (in the format @channelusername)
   * @param message_id Identifier of the message to delete
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#deletemessage
   */
  deleteMessage(chat_id, message_id, signal) {
    return this.raw.deleteMessage({ chat_id, message_id }, signal);
  }
  /**
   * Returns the list of gifts that can be sent by the bot to users and channel chats. Requires no parameters. Returns a Gifts object.
   *
   * @param signal Optional `AbortSignal` to cancel the request
   *
   * **Official reference:** https://core.telegram.org/bots/api#getavailablegifts
   */
  getAvailableGifts(signal) {
    return this.raw.getAvailableGifts(signal);
  }
}
export { Api };
