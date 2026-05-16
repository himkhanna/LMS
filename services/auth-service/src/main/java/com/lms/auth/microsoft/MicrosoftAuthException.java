package com.lms.auth.microsoft;

public class MicrosoftAuthException extends RuntimeException {
    public MicrosoftAuthException(String message) { super(message); }
    public MicrosoftAuthException(String message, Throwable cause) { super(message, cause); }
}
