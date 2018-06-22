window = {}
var LocalStorage = require('node-localstorage').LocalStorage;
window.localStorage = new LocalStorage('./.localStorage');
window.addEventListener = function() {}

var Amplify = require("aws-amplify");
var aws_exports = require('./aws-exports');

const API_ENDPOINTS = {
  beta: "https://foo866bgvk.execute-api.ap-northeast-1.amazonaws.com/beta",
  prod: "https://foo866bgvk.execute-api.ap-northeast-1.amazonaws.com/prod",
}

aws_exports.aws_cloud_logic_custom[0].endpoint = API_ENDPOINTS['beta']
Amplify.default.configure(aws_exports)

module.exports = Amplify

