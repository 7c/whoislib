class whoisError extends Error {
    constructor (message,code) {
        super(message)
    
        // assign the error class name in your custom error (as a shortcut)
        this.name = this.constructor.name
        this.code = code
        this.whoisError = true
    
        // capturing the stack trace keeps the reference to your error class
        Error.captureStackTrace(this, this.constructor);
    
      }
}

module.exports = whoisError
