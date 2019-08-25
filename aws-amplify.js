global.window = global.window || {}
const LocalStorage = require('node-localstorage').LocalStorage;
global.window.localStorage = new LocalStorage('./.localStorage');
global.window.addEventListener = function() {}

const AWS = require('aws-sdk')
const Amplify = require("aws-amplify");

// prevent to load local AWS credentials
AWS.config.credentials = null


module.exports = Amplify

