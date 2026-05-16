package com.lms.auth.web;

import com.lms.auth.microsoft.MicrosoftAuthException;
import com.lms.auth.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(AuthService.NotFoundException.class)
    public ProblemDetail nf(AuthService.NotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }
    @ExceptionHandler(AuthService.ConflictException.class)
    public ProblemDetail conflict(AuthService.ConflictException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }
    @ExceptionHandler(AuthService.UnauthorizedException.class)
    public ProblemDetail unauth(AuthService.UnauthorizedException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }
    @ExceptionHandler(MicrosoftAuthException.class)
    public ProblemDetail msAuth(MicrosoftAuthException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail invalid(MethodArgumentNotValidException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                ex.getBindingResult().getFieldErrors().stream()
                        .map(f -> f.getField()+": "+f.getDefaultMessage())
                        .collect(Collectors.joining("; ")));
    }
}
