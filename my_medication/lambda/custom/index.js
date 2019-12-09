/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const dbHelper = require('./helpers/dbHelper');
const GENERAL_REPROMPT = "What would you like to do?";
const dynamoDBTableName = "prescriptions";

const APP_NAME = "My Medication";
const messages = {
  NOTIFY_MISSING_PERMISSIONS: 'Please enable profile permissions in the Amazon Alexa app.',
  ERROR: 'Looks like something went wrong.'
};

const FULL_NAME_PERMISSION = "alexa::profile:name:read";
const EMAIL_PERMISSION = "alexa::profile:email:read";
const MOBILE_PERMISSION = "alexa::profile:mobile_number:read";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const {serviceClientFactory } = handlerInput;
   
    try{
     
      //const upsServiceClient = serviceClientFactory.getUpsServiceClient();
      //const profileName = await upsServiceClient.getProfileGivenName();
      const speechText = 'Hello! How can I help you with your medication?';
  
      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard(APP_NAME, speechText)
        .reprompt(GENERAL_REPROMPT)
        .getResponse();

    } catch (error) {
      console.log(JSON.stringify(error));
      if (error.statusCode == 403) {
        return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard([EMAIL_PERMISSION])
        .getResponse();
      }
      console.log(JSON.stringify(error));
      const response = responseBuilder.speak(messages.ERROR).getResponse();
      return response;
    }

  },
};

const GetPrecriptionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetPrecriptionIntent';
  },
  async handle(handlerInput) {
    const {requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
    try {
      const upsServiceClient = serviceClientFactory.getUpsServiceClient();
      const profileEmail = await upsServiceClient.getProfileEmail();
      const ReminderManagementServiceClient = serviceClientFactory.getReminderManagementServiceClient();
      if (!profileEmail) {
       const noEmailResponse = `It looks like you don\'t have an email set. You can set your email from the companion app.`
        return responseBuilder
                      .speak(noEmailResponse)
                      .withSimpleCard(APP_NAME, noEmailResponse)
                      .reprompt(GENERAL_REPROMPT)
                      .getResponse();
      }

      const consentToken = requestEnvelope.context.System.user.permissions
      && requestEnvelope.context.System.user.permissions.consentToken;
      if (!consentToken) {
        return responseBuilder
          .speak('Please enable Reminder permissions in the Amazon Alexa app.')
          .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
          .getResponse();
      }

     
      return  dbHelper.getTablet(profileEmail)
        .then(async (data) => {
          
            var speechText = "";
  
            if (data.length == 0) {
              speechText = "You do not have any medication yet"
            } else {
             
              data.forEach(function(prescription){
   
                speechText += prescription.docName + ' has recommended ' +  prescription.tabletName + " ";

                if(prescription.morningTabCnt > 0) {
                  speechText += prescription.morningTabCnt + " in the morning "
                }
                
                if(prescription.middayTabCnt > 0) {
                  speechText += prescription.middayTabCnt + " at mid day "
                }
                
                if(prescription.eveTabCnt > 0) {
                  speechText += prescription.eveTabCnt + " in the evening "
                }
                
                if(prescription.bedtimeTabCnt > 0) {
                  speechText += prescription.bedtimeTabCnt + " at bed time "
                }                

              });

              return responseBuilder                
                  .speak(speechText)
                  .withSimpleCard(APP_NAME, speechText)
                  .reprompt(GENERAL_REPROMPT)
                  .getResponse();
            }

        })
        .catch((err) => {
          const speechText = "we cannot get your prescription right now. Try again!"
          return responseBuilder
            .speak(speechText)
            .withSimpleCard(APP_NAME, speechText)
            .getResponse();
        })




    } catch (error) {
      console.log(JSON.stringify(error));
      if (error.statusCode == 403) {
        return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard([EMAIL_PERMISSION])
        .getResponse();
      }
      console.log(JSON.stringify(error));
      const response = responseBuilder.speak(messages.ERROR).getResponse();
      return response;
    }

  }
}


const CreateReminderHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'CreateReminderIntent';
  },
  async handle(handlerInput) {
    const {requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
    try {
      const upsServiceClient = serviceClientFactory.getUpsServiceClient();
      const profileEmail = await upsServiceClient.getProfileEmail();
      const ReminderManagementServiceClient = serviceClientFactory.getReminderManagementServiceClient();
      if (!profileEmail) {
       const noEmailResponse = `It looks like you don\'t have an email set. You can set your email from the companion app.`
        return responseBuilder
                      .speak(noEmailResponse)
                      .withSimpleCard(APP_NAME, noEmailResponse)
                      .reprompt(GENERAL_REPROMPT)
                      .getResponse();
      }

      const consentToken = requestEnvelope.context.System.user.permissions
      && requestEnvelope.context.System.user.permissions.consentToken;
      if (!consentToken) {
        return responseBuilder
          .speak('Please enable Reminder permissions in the Amazon Alexa app.')
          .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
          .getResponse();
      }
     
      return  dbHelper.getTablet(profileEmail)
        .then(async (data) => {
          
            var speechText = "";
  
            if (data.length == 0) {
              speechText = "You do not have any medication yet"
            } else {

              data.forEach(function(prescription){
   
                speechText += prescription.docName + ' has recommended ' +  prescription.tabletName + " ";           

              });

              try {

                const reminderPayload = {
                  "trigger": {
                    "type": "SCHEDULED_RELATIVE",
                    "offsetInSeconds": "30",
                    "timeZoneId": "America/Los_Angeles"
                  },
                  "alertInfo": {
                    "spokenInfo": {
                      "content": [{
                        "locale": "en-US",
                        "text": speechText
                      }]
                    }
                  },
                  "pushNotification": {
                    "status": "ENABLED"
                  }
                };
          
                try{
                  await ReminderManagementServiceClient.createReminder(reminderPayload);

                  return responseBuilder
                  .speak("Reminders created for your prescriptions!")
                  .reprompt(GENERAL_REPROMPT)
                  .getResponse();

                } catch(error){
                  console.error(error);
                  return responseBuilder
                    .speak('reminder creation failed!')
                    .getResponse();
                }      
         
              } catch (error) {
                console.error(error);
                return responseBuilder
                  .speak('Uh Oh. Looks like something went wrong.')
                  .getResponse();
              }

            }

        })
        .catch((err) => {
          const speechText = "we cannot get your prescription right now. Try again!"
          return responseBuilder
            .speak(speechText)
            .getResponse();
        })




    } catch (error) {
      console.log(JSON.stringify(error));
      if (error.statusCode == 403) {
        return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard([EMAIL_PERMISSION])
        .getResponse();
      }
      console.log(JSON.stringify(error));
      const response = responseBuilder.speak(messages.ERROR).getResponse();
      return response;
    }

  }
}


const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can introduce yourself by telling me your name';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    GetPrecriptionHandler,
    CreateReminderHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName(dynamoDBTableName)
  .withAutoCreateTable(true)
  .lambda();
