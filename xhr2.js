const XMLHttpRequest = require('xhr2');

// This method can set request headers such as 'Origin', which are forbidden in the original method.
XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
  var loweredName;
  if (this.readyState !== XMLHttpRequest.OPENED) {
    throw new XMLHttpRequest.InvalidStateError("XHR readyState must be OPENED");
  }
  loweredName = name.toLowerCase();
  value = value.toString();
  if (loweredName in this._loweredHeaders) {
    // Combine value with the existing header value.
    name = this._loweredHeaders[loweredName];
    this._headers[name] = this._headers[name] + ', ' + value;
  } else {
    // New header.
    this._loweredHeaders[loweredName] = name;
    this._headers[name] = value;
  }
  return void 0;
};

// define global variable
global.XMLHttpRequest = XMLHttpRequest

