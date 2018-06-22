const API = require("aws-amplify").API;

const fetchLayoutList = async (userId) => {
  const result = await API.get('Layout', `/users/${userId}/layouts`, {headers: {}})
  return result.layouts
}

const fetchLayoutData = async (userId, layoutId) => {
  return await API.get('Layout', `/users/${userId}/layouts/${layoutId}`, {headers: {}})
}

module.exports = {
  fetchLayoutList,
  fetchLayoutData,
}
