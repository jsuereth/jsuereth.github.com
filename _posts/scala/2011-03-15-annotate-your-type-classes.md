---
layout: post
title: Annotate your type classes
category: scala
---

This is a real quick post saying that as of 2.8.1, everyone should be annotating their type class traits for better error messages. Obviously, those of us who are supporting 2.8.0 or earlier are left out.


Here's an example REPL session:

    Welcome to Scala version 2.9.0.r24384-b20110305105029 (OpenJDK 64-Bit Server VM, Java 1.6.0_20).
    Type in expressions to have them evaluated.
    Type :help for more information.
    
    scala> import annotation.implicitNotFound
    import annotation.implicitNotFound
    
    scala> @implicitNotFound(msg = "Cannot find Serializable type class for ${T}") trait Serializable[T]
    defined trait Serializable
    
    scala> def foo[X : Serializable](x : X) = x
    foo: [X](x: X)(implicit evidence$1: Serializable[X])X
    
    scala> foo(5)
    :11: error: Cannot find Serializable type class for Int
           foo(5)
              ^

The annotation has very little documentation, but apparently supports `${TypeName}` templates to inject the names of types the compiler is looking for. I believe you can also use this implicit on types with no type parameters.

Happy hacking everyone!
