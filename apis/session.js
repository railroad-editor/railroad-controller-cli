const Amplify = require("aws-amplify");
const moment = require("moment");


const fetchSessions = async (userId) => {
  return await Amplify.API.get('Layout', `/users/${userId}/sessions`, {headers: {}})
}

const fetchSession = async (userId, layoutId) => {
  return await Amplify.API.get('Layout', `/users/${userId}/sessions/${layoutId}`, {headers: {}})
}

const createSession = async (userId, layoutId, peerId) => {
  return await Amplify.API.put('Layout', `/users/${userId}/sessions/${layoutId}`, {
    headers: {},
    body: {
      peerId,
    }
  })
}

const deleteSession =  async (userId, layoutId) => {
  return await Amplify.API.del('Layout', `/users/${userId}/sessions/${layoutId}`, {headers: {}})
}


module.exports = {
  fetchSessions,
  fetchSession,
  createSession,
  deleteSession,
}
