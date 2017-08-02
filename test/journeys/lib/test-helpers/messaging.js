import {clearEventLog, getEventLog} from '../../lib/events';
import {assert} from 'chai';
import request from 'superagent';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const uploadDir = path.join(__dirname, `assets`);
const downloadDir = path.join(os.homedir(), `Downloads`);

export const elements = {
  inputFile: `.ciscospark-file-input`,
  downloadButtonContainer: `(//div[starts-with(@class,"ciscospark-activity-content")])[last()]`,
  downloadFileButton: `(//div[@title="Download this file"]/parent::button)[last()]`,
  shareButton: `button[aria-label="Share"]`,
  systemMessage: `.ciscospark-system-message`,
  lastActivityText: `.ciscospark-activity-item-container:last-child .ciscospark-activity-text`
};

/* eslint no-sync: "off" */
export function sendFileTest(browserLocal, browserRemote, mccoy, fileName) {
  clearEventLog(browserRemote);
  const filePath = path.join(uploadDir, fileName);
  const fileSize = fs.statSync(filePath).size;
  const downloadedFile = path.join(downloadDir, fileName);
  const fileTitle = `//div[text()="${fileName}"]`;
  if (fs.existsSync(downloadedFile)) {
    fs.unlinkSync(downloadedFile);
  }
  browserLocal.chooseFile(elements.inputFile, filePath);
  browserLocal.click(elements.shareButton);
  browserRemote.waitForExist(fileTitle, 30000);
  browserRemote.moveToObject(elements.downloadButtonContainer);
  browserRemote.waitForVisible(elements.downloadFileButton);
  const events = getEventLog(browserRemote);
  const newMessage = events.find((event) => event.eventName === `messages:created`);
  const fileUrl = newMessage.detail.data.files[0].url;
  let downloadedFileSize;
  request.get(fileUrl)
      .set(`Authorization`, `Bearer ${mccoy.token.access_token}`)
      .end((error, response) => {
        downloadedFileSize = response.header[`content-length`];
      });
  browser.pause(8000);
  assert.equal(fileSize, downloadedFileSize);
  browser.pause(2000);
  browserRemote.moveToObject(elements.downloadFileButton);
  browserRemote.waitForVisible(elements.downloadFileButton);
  browserRemote.click(elements.downloadFileButton);
  browser.pause(2000);
}

/**
 * Sends message to user from specified browser
 * @param {Object} browser
 * @param {Object} user
 * @param {string} message
 * @returns {void}
 */
export function sendMessage(browser, user, message) {
  browser.waitForVisible(`[placeholder="Send a message to ${user.displayName}"]`);
  browser.waitForVisible(elements.systemMessage);
  assert.match(browser.getText(elements.systemMessage), /created this conversation/);
  browser.setValue(`[placeholder="Send a message to ${user.displayName}"]`, message);
  browser.keys([`Enter`, `NULL`]);
}

/**
 * Verifies message recieved from user in specified browser
 * @param {Object} browser
 * @param {Object} user
 * @param {string} message
 * @returns {void}
 */
export function verifyMessageReceipt(browser, user, message) {
  browser.waitForVisible(`[placeholder="Send a message to ${user.displayName}"]`);
  browser.waitForExist(elements.lastActivityText, 15000);
  browser.waitUntil(() => browser.getText(elements.lastActivityText) === message);
}
