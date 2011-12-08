---
layout: post
title: Scala Fresh is Alive
category: scala
---


It seems a lot of posts I've meant to write for a *long* time have been able to be used optimally in response to other blogs. 

Todays post is brought to you by [David Pollak's fragility post](http://t.co/qjBQJomR),

So let's talk about the problem of "Binary Compatibility(TM)" in Scala.

-------------------------------

First off, David raises a big issue in Scala.  One that most of us have seen.  Scala's new language features necessarily break binary compatibility of the bytecode.  Adding things like Specialization change Scala's standard library enough that you cannot use code compiled against older versions with the new version.   This is a two-edged sword.
The Scala experience should be as smooth as possible for all customers.
Things like java.util.Date shouldn't survive endlessly our standard library.
This requires a careful balance between breaking binary compatibility and advancing the language.   So far, I'm pretty happy with the way this has been done, but would like to see things stabilize in the future.  Let's take a look at what's happened:


### Scala's new binary compatible releases
Scala 2.9.1 is binary compatible with Scala 2.9.0.   If you compile code against Scala 2.9.0, you can use it with the standard library from Scala 2.9.1.   This will hold for *all* 2.9.x releases.   In Scala, binary compatibility will be at the bug-fix release.  All 2.10.x releases will be binary compatible with previous 2.10 releases.  This means that as long as your dependencies are compiling for a given Scala minor version, then you can continue to enjoy binary compatibility of libraries.

This was made possible by the freely available [Migration Manager tool](http://downloads.typesafe.com/migration-manager/0.1/migration-manager-0.1.jar).  A lot of us at typesafe use the publicly available version when developing to ensure binary compatibility of libraries.

Note:  This was *not* true for a lot of David Pollak's Scala experience, and is the result of many of us petitioning for better binary compatibility.  It's my opinion that this guarantee solves 50-80% of the problem.


### What happened to Scala fresh?
I've begun work on what can only be called "Scala Fresh 2.0".  That is, a place where community libraries will be built and deployed against the latest version of Scala.

This can serve two purposes: 
* Ensure that future versions of Scala do not break community libraries
* Ensure that the core libraries of Scala are available for every major version of Scala.

You can find the project publicly available [here](https://github.com/jsuereth/scala-cel).  All of the work is public and will be migrate to the "scala" user on github once complete and ready for more contributions.  Feel free to contribute or offer suggestions.

People may not realize but Scala Fresh failed because *I* failed Scala Fresh.   I had very little time between a more than full time commitment at Google, [writing commitments](http://www.manning.com/suereth), and kids.  This should not be an issue in the future, thanks to Typesafe taking binary compatibility seriously.  I now have a [prototype build](https://github.com/jsuereth/scala-cel/blob/master/project/Build.scala) that you can migrate your projects into.

My coworker likens this idea to linux distribution repositories.  I think it's a decent way to think of it.  I, and others, are working hard to ensure the ecosystem for every major Scala release is easy to use and stable.   Migrating major Scala versions should be as difficult as finding deprecation warnings and removing them.

### SBT cross releasing
Mark Harrah, recognized that Scala remains generally *source* compatible between major releases (2.8 to 2.9).   A *long* time ago, Mark met me at a Panera in Anne Arundel, MD to discuss a mechanism of cross deploying libraries so that they were available for every release of Scala.   This was well before the 2.9.x binary compatibility days and is still in heavy use within the community.   It's been pretty widely adopted, but can only go so far.   It's a good stop-gap solution that we, the community, can improve on. 

Binary compatibility is a community effort.  I know Typesafe is doing what it can with its resources, and I'm personally tackling as much as I can (probably trying to juggle too many balls).  However, if you want to help, please email me!

The JVM is amazing, don't doubt its powers
Finally, I want to clarify a confusion that a lot of people have about binary compatibility.  That is, that traits are *HUGE ISSUES FOR BINARY COMPATIBILITY ZOMG!!!*.   In actuality, traits are only slightly more dangerous than interfaces + implementation pairs.

In the code below, the method colored in red was added in a bug-fix release.   It is *binary compatible* with the previous version.

<pre>
trait Foo {
  def foo = "foo"
  <span class="red">*def bar = "NEW BAR IS NEW BAR!"*</span>
}
</pre>

That's right, adding methods, even with implementation, does *NOT* break linkage.  Think about it.  How did Java support JDBC 4.0 interfaces running JDBC 3.0 drivers?   The trick is that trait-linkage errors happen at *runtime* when *calling* a method that has no linked implementation.  This is the kind of magic that Java can get away with to ensure binary compatibility and it's just as useful in Scala.

Now, there is an issue where you can break binary compatibility.   Again, red italics will denote new code

<pre>
trait Bar {
  def foo = {
     <span class="red">*bar +*</span> " foo"
  }
  <span class="red">*def bar = "NEW BAR IS NEW BAR!"*</span>
}
</pre>

NOW, the implementation of a previous method calls a new method.   While this new method has an implementation in the trait, compiled code against the trait does not.   This is akin to the following Java scenario:

<pre>
interface Foo {
  public String foo();
  <span class="red">*public String bar();*</span>
}
abstract public class AbstractFoo implements Foo {
  @Override public String foo() { return <span class="red">*bar() + "*</span> foo" }
}
</pre>

The abstract method implements one of the trait's methods, but not the new one.  However, the implementation is modified to call the new method. 

Scala's collections underwent a minor change in 2.10 to improve both class file size *and* unintentionally binary compatibility.   That is, the collections now follow this pattern:

{% highlight scala %}
trait Traversable[A] //....
abstract class AbstractTraversable[A] extends Traversable[A] {}
class Vector[A] extends AbstractTraversable[A] with Traversale[A] //...
{% endhighlight %}

In this scenario, if your collection extends an Abstract collection (rather than its own parent class), you can remain binary compatble *and allow* new methods to be added to a trait *and be called* be the implementation.   Vector is now "binary resilient" to changes in the Traversable trait.  There are no guarantees that a trait is not used directly, so we can't take advantage of this when fixing bugs in collections in the Scala library.   It's still a nice trick to use.

You *do* lose some flexibility doing this.   Specifically, you can't have multiple class parents unless they're linear (like Java). 

So, my point is that Binary Compatibility is a community issue.  The JVM and Scala do what they can. I hope to see the compiler do more in the future.   The Migration Manager tool from Typesafe can detect a lot of binary compatibility issues and has been crucial to ensuring 2.9.x Scala releases are binary compatible.

I'm trying to organize projects to help ensure *all* libraries for Scala can be released against all the major versions and remain binary compatible.  The story is changing, and has done so rapidly over the past two years. 

I'd love to see Lift, and others start adopting binary compatibility standards for there releases as well.   This is not just a scala-the-library or scala-the-langauge issue.   Libraries matter, just as they do in Java.

So while David's post highlights an issue, my response is:

Help us (the Scala community) out!  We're going there, we're doing that. 


