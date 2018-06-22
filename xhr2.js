XMLHttpRequest = require('xhr2');
XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
  var loweredName;
  if (this.readyState !== XMLHttpRequest.OPENED) {
    throw new InvalidStateError("XHR readyState must be OPENED");
  }
  loweredName = name.toLowerCase();
  value = value.toString();
  if (loweredName in this._loweredHeaders) {
    name = this._loweredHeaders[loweredName];
    this._headers[name] = this._headers[name] + ', ' + value;
  } else {
    this._loweredHeaders[loweredName] = name;
    this._headers[name] = value;
  }
  return void 0;
};

