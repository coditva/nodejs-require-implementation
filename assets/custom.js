console.log('custom module', module);

const custom2 = require('./assets/custom2.js');

module.exports = {
  name: 'custom',
  add: (a, b) => a + b,
  subtract: custom2.subtract,
};
