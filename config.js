const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.railroad-controller.json'

let EMPTY_CONFIG = {
  credential: {
    email: null,
    password: null
  },
  layout: {
    id: null,
    name: null
  }
}

const getHomeDir = () => {
  return process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"]
}

exports.saveConfig = (config) => {
  let configPath = path.join(getHomeDir(), CONFIG_FILE)
  fs.writeFileSync(configPath, JSON.stringify(config))
}

exports.loadConfig = () => {
  let configPath = path.join(getHomeDir(), CONFIG_FILE)
  try {
    fs.statSync(configPath)
  } catch (err) {
    return EMPTY_CONFIG
  }

  return JSON.parse(fs.readFileSync(configPath))
}

