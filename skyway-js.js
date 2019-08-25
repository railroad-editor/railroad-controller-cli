global.window = global.window || {}
global.fetch = require('node-fetch')
require('./xhr2')
require('./wrtc')
const Peer = require('skyway-js');

module.exports = Peer
