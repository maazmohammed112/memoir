const Alexa = require('ask-sdk-core');
const https = require('https');

const MEMOIR_BRIDGE_ENDPOINT = process.env.MEMOIR_BRIDGE_ENDPOINT || 'https://memoir-vert.vercel.app/api/alexa';
const MEMOIR_BRIDGE_SECRET = process.env.MEMOIR_BRIDGE_SECRET || 'memoir_alexa_bridge_7a12fbe9af27ba93563ba990f8cc51ce67b1928561f82b47';
const ALEXA_SKILL_ID = process.env.ALEXA_SKILL_ID || 'amzn1.ask.skill.15b9ce2d-0853-43b1-bc21-d7516bade2cc';

async function callMemoirBridge(payload) {
  const data = JSON.stringify({
    skillId: ALEXA_SKILL_ID,
    bridgeSecret: MEMOIR_BRIDGE_SECRET,
    ...payload,
  });

  let url;
  try {
    url = new URL(MEMOIR_BRIDGE_ENDPOINT);
  } catch (err) {
    return { speak: 'The Memoir bridge URL is not configured correctly.' };
  }

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'x-alexa-bridge-secret': MEMOIR_BRIDGE_SECRET,
      'x-alexa-user-id': payload.userId || '',
    },
    timeout: 7000,
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 404) {
          resolve({
            speak: 'The Memoir Alexa endpoint was not found on your server. Please make sure api/alexa.js is deployed to Vercel.',
          });
          return;
        }
        if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({
            speak: 'Access to Memoir was not authorized. Please check your Alexa bridge secret.',
          });
          return;
        }
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch {
          resolve({ speak: 'Memoir server responded with unexpected data.' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Alexa Bridge] Network error:', err);
      resolve({ speak: 'I could not connect to your Memoir server. Please check your internet and server status.' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ speak: 'Memoir took too long to respond. Please try again in a moment.' });
    });

    req.write(data);
    req.end();
  });
}

function getUserId(handlerInput) {
  return handlerInput.requestEnvelope?.session?.user?.userId ||
         handlerInput.requestEnvelope?.context?.System?.user?.userId || '';
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const result = await callMemoirBridge({ intent: 'LaunchRequest', userId });
    const speakOutput = result.speak || 'Welcome to Rhino Memoir. You can ask for upcoming birthdays, today\'s reminders, safe notes, or to add a reminder.';
    const reprompt = result.reprompt || 'What would you like me to look up in Memoir?';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(reprompt)
      .getResponse();
  },
};

const UpcomingBirthdaysIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'UpcomingBirthdaysIntent';
  },
  async handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const result = await callMemoirBridge({ intent: 'UpcomingBirthdaysIntent', userId });
    const speakOutput = result.speak || 'I could not find any upcoming birthdays.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('Can I help you with anything else in Memoir?')
      .getResponse();
  },
};

const UpcomingRemindersIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'UpcomingRemindersIntent';
  },
  async handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const result = await callMemoirBridge({ intent: 'UpcomingRemindersIntent', userId });
    const speakOutput = result.speak || 'You have no active reminders.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('Can I help you with anything else in Memoir?')
      .getResponse();
  },
};

const AddReminderIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddReminderIntent';
  },
  async handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const title = Alexa.getSlot(handlerInput.requestEnvelope, 'ReminderTitle')?.value || '';
    const dueAt = Alexa.getSlot(handlerInput.requestEnvelope, 'DueAt')?.value || '';

    const result = await callMemoirBridge({
      intent: 'AddReminderIntent',
      title,
      dueAt,
      userId,
    });

    const speakOutput = result.speak || `Added a reminder for ${title}.`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SnoozeReminderIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'SnoozeReminderIntent';
  },
  async handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const title = Alexa.getSlot(handlerInput.requestEnvelope, 'ReminderTitle')?.value || '';

    const result = await callMemoirBridge({
      intent: 'SnoozeReminderIntent',
      title,
      userId,
    });

    const speakOutput = result.speak || 'Snoozed your reminder for 30 minutes.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const CompleteReminderIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CompleteReminderIntent';
  },
  async handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const title = Alexa.getSlot(handlerInput.requestEnvelope, 'ReminderTitle')?.value || '';

    const result = await callMemoirBridge({
      intent: 'CompleteReminderIntent',
      title,
      userId,
    });

    const speakOutput = result.speak || 'Marked your reminder as completed.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const AskSafeInfoIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskSafeInfoIntent';
  },
  async handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const query = Alexa.getSlot(handlerInput.requestEnvelope, 'Query')?.value || '';

    const result = await callMemoirBridge({
      intent: 'AskSafeInfoIntent',
      query,
      userId,
    });

    const speakOutput = result.speak || `I couldn't find information about ${query}.`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('Can I help you with anything else?')
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'You can ask Rhino Memoir for upcoming birthdays, today\'s reminders, to add or snooze a reminder, or to look up safe notes. What would you like to do?';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
       Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye from Memoir!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'Sorry, I couldn\'t understand that request. You can ask for birthdays, reminders, or safe notes.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('What would you like me to look up in Memoir?')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`[Alexa] Error handled: ${error.message}`, error);
    const speakOutput = 'Sorry, I had trouble processing your request in Memoir. Please try again.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    UpcomingBirthdaysIntentHandler,
    UpcomingRemindersIntentHandler,
    AddReminderIntentHandler,
    SnoozeReminderIntentHandler,
    CompleteReminderIntentHandler,
    AskSafeInfoIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
