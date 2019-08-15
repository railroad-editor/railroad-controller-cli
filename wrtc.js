const WebRTC = require('wrtc')

// define global variables
global.RTCPeerConnection = WebRTC.RTCPeerConnection
global.RTCIceCandidate = WebRTC.RTCIceCandidate;
global.RTCSessionDescription = WebRTC.RTCSessionDescription;
global.RTCDataChannel = WebRTC.RTCDataChannel;
global.MediaStream = {}

