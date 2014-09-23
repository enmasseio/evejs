var eve = require('../../index');

// configure eve to use a deterministic random function
eve.system.init({
  random: {
    deterministic: true,  // false by default
    seed: 'my seed'       // optional, 'random seed' by default.
  }
});

// the random function will now always return the same sequence of random values
console.log(eve.system.random()); // 0.6679106145469952
console.log(eve.system.random()); // 0.2835968192967816
console.log(eve.system.random()); // 0.00871733037746353
