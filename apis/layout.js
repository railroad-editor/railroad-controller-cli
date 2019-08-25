const API = require("aws-amplify").API;

const fetchLayoutList = async (userId) => {
  const result = await API.get('layout', `/users/${userId}/layouts`, {headers: {}})
  return result.layouts.map(layout => layout.meta)
}

const fetchLayoutData = async (userId, layoutId) => {
  return await API.get('layout', `/users/${userId}/layouts/${layoutId}`, {headers: {}})
}

module.exports = {
  fetchLayoutList,
  fetchLayoutData,
}
