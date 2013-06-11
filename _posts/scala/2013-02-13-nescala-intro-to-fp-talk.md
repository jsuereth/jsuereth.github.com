---
layout: post
title: Functional Programming Patterns for the Asynchronous Web
category: scala
---

NEScala happened this year, and it was amazing!   Not only was I able to give a [talk](http://nescala.org/#t-12229286), we were also able to record a [scalawags podcast](http://scalawags.tv/scalawags-live-at-ne-scala).


For those who missed the talk, it was about how to script together a bunch of asynchronous APIs into a new asynchronous APIs.  SO, generically, we have:

{% highlight scala %}
trait AsynchSubService {
  def getData: Future[Data]
}
trait AsynchSubService2 {
  def getData: Future[Data2]
}
{% endhighlight %}

What you want to do is create a new service that can call both asynchronously and non-blocking so that we don't suck up too many threads waiting for IO (or network response).

{% highlight scala %}
trait UberAsynchService {
  def getData: Future[(Data, Data2)]
}
{% endhighlight %}

SO, how do I accomplish this across a variety of goals?   The example application is one that checks github statistics to see which projects are more likely to accept pull requests from non-committers.

Here's the [example application](https://github.com/jsuereth/intro-to-fp).   It implements the same github statistics service in two ways:

* Directly using [futures](https://github.com/jsuereth/intro-to-fp/blob/intro-to-fp/src/main/scala/futures/service.scala)
* Using external [abstractions](https://github.com/jsuereth/intro-to-fp/blob/intro-to-fp/src/main/scala/generic/service.scala).


You'll notice that the code to implement the Future-only version is almost exactly the same as the "generic" version.  There's a bit of difference in supporting code, but most of that is just an implementation of [scalaz](https://github.com/scalaz/scalaz).

What *is* different is the testing strategies.   The future-based code [has to use "Await" for a result](https://github.com/jsuereth/intro-to-fp/blob/intro-to-fp/src/test/java/futures/ServiceSpec.scala#L30), which in my experience usually leads to flaky tests in some manner or other, while the abstracted service can implement [single-threaded tests](https://github.com/jsuereth/intro-to-fp/blob/intro-to-fp/src/test/java/generic/ServiceSpec.scala#L12).

SO, the gain of all that abstraction is the ability to substitute different runtime execution models into our business logic.   Regardless of whether or not you find the gain worth the cost, the underlying patterns of joining and sequencing computations are useful for anyone delving into Scala's `Future` library.

Here's a [copy of the slides](https://docs.google.com/presentation/d/1EgWaM4Cey1VJE_AfRwS64dKMRffBbpHfMtCm57nc714/pub?start=false&loop=false&delayms=3000), and I beleive a video will be posted shortly.

