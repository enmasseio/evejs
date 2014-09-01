/**
 * This example demonstrates how to extend an agent with babble.
 * Babble provides dynamic communication flows between message based agents.
 *
 * https://github.com/enmasseio/babble
 */
var BabbleAgent = require('./agents/BabbleAgent');

// create two agents
var emma = new BabbleAgent('emma', {age: 27});
var jack = new BabbleAgent('jack', {age: 25});

// let jack have a conversation with emma
jack.talk('emma');
