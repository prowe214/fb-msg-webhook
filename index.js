'use strict';

// import dependencies, setup http server
const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json()); // creates express http server

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
            // gets the message.  
            // entry.messaging is an array,
            // but will only ever contain one message
            // so we get index 0
            let webhook_event = entry.messaging[0];
            console.log('event: ', webhook_event);
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
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // respond with 403 FORBIDDEN if verify tokens don't match
            res.sendStatus(403);
        }

    }
})
