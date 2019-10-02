'use strict';

// import dependencies, setup http server
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const templates = require('./helpers/responseTemplates');

const app = express().use(bodyParser.json()); // creates express http server

// set page access token
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// set server port and log success message
const port = process.env.PORT || 1337;
app.listen(port, () => console.log(`success! listening on port ${port}`))


/**
 * This creates a /webhook endpoint that accepts POST requests, 
 * checks the request is a webhook event, then parses the message. 
 * 
 * This endpoint is where the Messenger Platform will send all webhook events
 */

// create endpoint for the webhook
app.post('/webhook', (req, res) => {

    let body = req.body;
    
    // check that this request is from a page subscription
    if (body.object === 'page') {
        
        // iterate over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // gets the body of the webhook event.
            // entry.messaging is an array,
            // but will only ever contain one message
            // so we get index 0
            let webhook_event = entry.messaging[0];

            // get the sender PSID
            let sender_psid = webhook_event.sender.id;

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        })

        // return a 200 OK to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // return a 404 NOT FOUND if event is not from a page subscription
        res.sendStatus(404);
    }
});

/**
 * This code adds support for the Messenger Platform's webhook verification to the webhook. 
 * This is required to ensure the webhook is authentic and working.
 */

// adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
    // Your VERIFY token.
    // You create a verify token. 
    // This is a random string of your choosing, hardcoded into your webhook
    let VERIFY_TOKEN = 'prowetestingtoken'

    // parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // check if a token and mode is in the query string of the request
    if (mode && token) {

        //check if mode and token sent are correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // response with the vhallenge token from the request
            res.status(200).send(challenge);
        } else {
            // respond with 403 FORBIDDEN if verify tokens don't match
            res.sendStatus(403);
        }

    }
})


/**
 * functions that will handle the incoming webhook event types we want to support.
 * 
 * Glossary:
 *      `psid` - Page-scoped ID
 */

// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;
    
    // Check if the message contains text
    if (received_message.text) {
        
        if (received_message.text.toLowerCase() === 'start the form') {
            startForm(sender_psid);
        } else if ((received_message.nlp && received_message.nlp.entities && received_message.nlp.entities.location) 
                && received_message.nlp.entities.location[0].confidence > 0.9) {
            response = { 'text': `you sent this address: ${received_message.nlp.entities.location[0].value}` }
        } else {
            // Create the payload for a basic text message
            response = {
                'text': `You sent this message: ${received_message.text}.  Say 'start the form' to test the form!`
            }
        }
    } else {
        response = {text: 'I am not sure how to do that'}
    }

    callSendAPI(sender_psid, response);
}

// handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;

    // get the payload for the postback
    let payload = JSON.parse(received_postback.payload);

    // set the response based on the postback payload
    if (payload.form_data.form_started) {
        response = getQuestion(payload);
    } else {
        response = { text: 'Okay we will not start the form' }
    }

    // send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// sends response messages viw the Send API
function callSendAPI(sender_psid, response) {
    // construct the message body
    let request_body = {
        'recipient': {
            'id': sender_psid
        },
        'message': response
    }

    // sent the http request to the messenger platform
    request({
        'uri': 'https://graph.facebook.com/v2.6/me/messages',
        'qs': {
            'access_token': process.env.PAGE_ACCESS_TOKEN
        },
        'method': 'POST',
        'json': request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!');
        } else {
            console.error('Unable to send message:', err);
        }
    })
}

function startForm(sender_psid) {

    // Its polite to say hi
    const intro = [
        {text: 'Welcome to the demo!'},
        {text: 'Thanks for reaching out.'}
    ]
    // Send our intro messages
    intro.forEach(item => {
        callSendAPI(sender_psid, item);
    })

    // start storing forms
    const formStore = {
        question_number: 0,
        form_data: {}
    }

    // build the response template
    const response = templates.buildQuestionResponseTemplate(0, formStore)

    // send the response
    callSendAPI(sender_psid, response)
}

function getQuestion(payload) {
    return templates.buildQuestionResponseTemplate(payload.question_number, payload)
}
