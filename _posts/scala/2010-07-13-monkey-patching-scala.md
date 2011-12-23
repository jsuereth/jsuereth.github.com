---
title: Monkey Patching, Duck Typing and Type Classes
layout: post
---

Somewhat recently, there have been a bunch of articles written about Scala and how you can create something that looks like Haskell's type class feature. I'm not going to duplicate these posts, but I am going to go beyond just the mechanics of creating a type class and discuss how to utilise some of Scala's advanced features with type classes to create some pretty robust code. A lot of the post borrows ideas from my upcoming book, Scala In Depth. The examples come from the Scala ARM library.

First off, let's assume you haven't read anything at all about Scala's type classes, but you do have a Ruby background. In Ruby, you really loved duck typing. It's the best. I can just use methods and pass objects around and things work. If a class doesn't have a method I need, I can either rely on some method missing magic, or just monkey patch it. To those who don't know Ruby, monkey patching is the ability to add a method to an existing class on the fly.

What if I told you that in Scala, for a small penalty, you could create methods that are flexible, like duck typed methods, and 100% compile-time type safe. Not only that, you're also able to monkey-patch types as needed. Don't believe me? Let's look at some of the fun in the Scala ARM library.

The motivation behind the ARM library is to create a flexible, robust (from exceptions) and simple-to-use automated-resource-management library that can greatly simplify things like JDBC or I/O in Scala. The standard introduction to ARM in Scala is the withResource method outlined below.

{% highlight scala %}
def withResource[A <: { def close() }, B](resource : => A)(f : A => B) = {
  val r = resource
  try {
    f(r)
  } finally {
    r.close()
  }
}
{% endhighlight %}

The with resource method takes a by-name argument that returns an opened resource, and a function that manipulates the resource. We ensure that the close method on the resource is called after the manipulation function f. We've declared the type of the resource using structural typing. This means the compiler will accept anything that defines a close method. We can then utilize withResource as follows:

{% highlight scala %}
withResource(new FileInputStream(new File("myFile.txt"))) { stream =>
  // Code using stream and returning something
}
{% endhighlight %}

So, this code is already giving us a form of duck-typing (called structural typing in Scala). What about monkey patching? This is where using the type class pattern can help. Also note, that I prefer calling the type class pattern from haskell the "type trait" pattern in Scala. This could be confusing, as C++ has a type trait pattern as well, however the fact that I use traits to define type classes is just as confusing. In any case, please think of type traits and type classes, for the rest of this blog article as the same thing: A manifestation of type classes in Scala.

Let's modify the withResource method to use a type class instead of a structural type.

{% highlight scala %}
trait Resource[R] {
  def close(r : R) : Unit
}
{% endhighlight %}

Here is our Resource type class. It defines a single method close. We can now modify our withResource method to utilise this:

{% highlight scala %}
def withResource[A : Resource, B](resource : => A)(f : A => B) = {
  val r = resource
  try {
    f(r)
  } finally {
    implicitly[Resource[A]].close(r)
  }
}
{% endhighlight %}

Notice two things here. First, we use the context-bounds constraint on the resource type parameter (A : Context). This means that we have to look up our implicit type trait using the implicitly method. We could, instead, give our method a well-defined implicit. For now, we'll use the context-bound syntax as it's quickly starting to denote type traits in Scala.

If we attempt to call this method as things stnad, we'll get an implicit lookup error:

    scala> withResource(new java.io.StringReader("HAI")) { input => () }
    :9: error: could not find implicit value for evidence parameter of type Resource[java.io.StringReader]
           withResource(new java.io.StringReader("HAI")) { input => () }
                                                     ^

Now let's think through what we've done. Any type can be used in the withResource method as long as an implicit is available for the given type in the implicit lookup resolution. The simplest way to create an implicit for usage is to provide one directly. This is easy to do in the REPL:

    scala> implicit object stringResourceTrait extends Resource[java.io.StringReader] {
      override def close(r : java.io.StringReader) = r.close()
    }
    defined module stringResourceTrait
    
    scala> withResource(new java.io.StringReader("HAI")) { input => () }

You can see that we've satisfied the type system for the particular type java.io.StringReader. Our old method was duck typed to use anything that had a close method. We can actually get this same functionality with type traits as well. Let's provide a default type trait in the Resource Companion object. To do so, let's create a resource.scala file that looks like the following:

{% highlight scala %}
trait Resource[R] {
  def close(r : R) : Unit
}
object Resource {
  implicit def genericResourceTrait[A <: { def close() : Unit }] = new Resource[A] {
    override def close(r : A) = r.close()
  }
}
{% endhighlight %}

What we've done is provide a method "genericResourceTrait" that is available on *every implicit search* for any Resource[_] type. We've now gotten back to our previous functionality, and we can take this a bit farther. What if we wanted to provide a specific implementation for a type? In the case of resources, Java provides a java.io.Closeable interface that most IO classes implement. Creating a type trait implementation for this will give us the benefit of not needing to use reflection when we know a specific type. Let's take our first crack at it.

{% highlight scala %}
trait Resource[R] {
  def close(r : R) : Unit
}
object Resource {
  implicit def genericResourceTrait[A <: { def close() : Unit }] = new Resource[A] {
    override def close(r : A) = r.close()
    override def toString = "Resource[{def close() : Unit }]"
  }
  implicit def jioResourceTrait[A <: java.io.Closeable] = new Resource[A] {
    override def close(r : A) = r.close()
    override def toString = "Resource[java.io.Closeable]"
  }
}
{% endhighlight %}

We now have a duck typed, reflection based implementation and an implementation for the java.io.Closeable interface. We can prove that this works via the REPL by creating a mechanism of checking what type trait is used:

    scala> def showTypeTraitUsed[A : Resource](a : A) = println(implicitly[Resource])
    showTypeTraitUsed: [A](a: A)(implicit evidence$1: Resource[A])Unit
    
    scala> showTypeTraitUsed(new java.io.StringReader("HAI"))
    Resource[java.io.Closeable]

    scala> showTypeTraitUsed(new { def close() : Unit = () })
    Resource[{def close() : Unit }]


We see that when passed a java.io.StringReader, something that subclasses java.io.Closeable, it uses the type trait defined for closeables. When we pass an anonymous object that has a close method, it uses the structural-typed type trait instead. What about monkey patching? Well, using type traits, you can achieve a form of monkey patching. Let's pretend an integer is a resource. All we have to do is create a new type trait implementation for it. Let's make that happen:


    scala> implicit object intAsResource extends Resource[Int] {
         | override def close(r : Int) = println("closing: " + r)
         | }
    defined module intAsResource
    
    scala> withResource(5)(println)
    5
    closing: 5


We define our close method to print out a string, so we can make sure it happens. Finally, we can use an integer in our withResource method as if it were a resource, hence monkey-patching a close method onto it. In fact, we could also use this mechanism to change the implementation of the Resource type trait in a particular context. The key to this, as described in my book, is to ensure that you place your default implicitly available type trait implementation into the correct scope, such that
* They can be overridden
* They do not conflict

We can also use certain Scala tricks like having method return types be based on implicits available within scope. Combining these all, you can create some rather interesting libraries, such as what is available in scala arm's typeclass-fix branch. This branch contains a rather interesting flatMap that can detect if you are mapping to a Traversable type, and return a Traversable. It will also detect if you are flatMapping to another Resource and return a new ManagedResource that will open/close that nested resource. Finally, it also supports the standard flatMap implementation. Working with type classes in Scala adds a bit of overhead in amount of code, and some time to toy with the type system but can provide great flexibility in design. I'm working on a library for interactive with Nexus, using webDAV protocol. Using a "FileLike" type trait has been helpful in the design, especially since certain methods can be optimised in particular algorithms where we know both types. It's also useful because I've adapter several different WebDAV-enabled libraries to the API before finally deciding on the library I disliked the least. So in recap, let's look at why the typeclass pattern is so powerful in Scala:

* Can provide implementations for many differing types, in hierarchical fashion
* Can provide new type trait implementation from any scope
* Allows at-usage-site overriding of implementation details

