---
layout: post
title: Macro vs. Micro Optimisation
category: scala
---

So there's recently been a bit of hype about another Colebourne article: [http://blog.joda.org/2011/11/real-life-scala-feedback-from-yammer.html](http://blog.joda.org/2011/11/real-life-scala-feedback-from-yammer.html)

I'd like to respond to a few points he makes.

### First ###
You should evaluate Scala and pay attention to its benefits and flaws before adopting it.  Yes, there are flaws to Scala.   Working at typesafe makes you more aware of some of them.  We're actively working to reduce/minimize/get rid of these.   In my opinion, the negatives of using Scala are peanuts compared to the postives of choosing Scala over Java.  I think everyone should make up their own mind about this.   Not everyone is going to choose Scala.  I feel bad for those who don't, but I make no effort to convince you further than showing you the 40+ Open source Scala projects I have on github.  It's a language with a lot to like and a bit to dislike.

Now, to the meat of what I want to say.   Don't get lost in micro optimization when discussing programming.

The blog article discusses writing high-performance code in the critical path that has crazy performance needs.   This is not your every day development.   Scala loses a lot of benefits in this world, because features like closures have overhead on the JVM.  Hopefully when Java adopts closures, this overhead can be alleviated, but it is there right now.   The set of rules from the email is known to a lot of us Scala devs when writing a performance intensive section of code.

I'll reiterate a few to agree with:

1. Avoid closure overhead.   If you can't get the JVM to optimize away and need to allocate a closure constantly in a tight loop, this can slow down a critical section.  This is correlated with: __Don't use a for loop.  For expressions (and loops) in Scala are implemented as closures.   There are some efforts underway to *inline* these closures as an optimization.  This performance hit isn't a permanent one.   As the compiler matures, you'll see a lot of optimization work happen.__
2. Use `private[this]` to avoid an additional method.   Scala generated methods and fields for val/var members.   Using `private[this]` informs the compiler that it can optimize away the method.   Again, while hotspot can optimize this away if you're in a very critical section, it may be a good idea to optimize.   In fact, the whole promotion to fields and methods aspect of Scala classes deserves attention from anyone writing performance critical code.   The rules are also there in Java, it's just that you probably have people that already know them.
3. Avoid invokevirtual calls.  (Coda lists this as avoid Scala's collections).  The true issue here is that invoke-virtual can make a difference in performance critical sections of code.  Again, this is one I think we can improve with a few final declarations and maybe an annotation or two.



Here's the big *missing* point in all that feedback.   This is for performance critical sections of code, not for general purpose applications.   I think when it comes to performance bottlenecks, you need to pull out the stops and optimize the heck out of your apps.   Look at the Akka framework from typesafe. Akka uses a lot of "dirty" scala code to achieve high non-blocking concurrent performance.  It's one of the most amazing libraries, and the code is pretty low level.   It also supports a very high level of abstraction when writing your application.   It uses PartialFunctions (which are sort of a combination of pattern matching and closures) and traits, both of which have some overhead.   However the resulting *application* is fast.  Why?   The inner loops are fast and optimized and the application *architecture* can be optimised.  In a high level language, you can take advantages of designs that you would *never* execute in a lower-level language because the code would be unmaintainable.

You see, most of us like to be able to read and understand what our code does.   Scala has some features where you can write very expressive code in a few lines.   After getting over the initial hump, this code is pretty easy to maintain.   If I were to write that same code in Java, it would look odd, confusing as hell, and no one would want to maintain it.

### I learned this lesson at Google. ###

Google has a pretty stringent C++/Java style guide.  One that is tuned for high performance servers.   The C++ style guide is public.  The style guide frowns on things like the use of 'smart' pointers that 'garbage collect' because you can't be sure that GC will happen at a critical moment in the code.

Google also has a high performance Map-Reduce library.  This thing is pretty amazing, with all sorts of crazy cool features like joining data on the *map* part of the map-reduce.  The library followed all the google coding conventions and is generally held up as a piece of awesome software, which its.

However, writing applications with the Map-Reduce library was less than idea.   I could write pretty clean code with the MR library.  My Mappers were pretty light weight and minimalistic.  Same with my reducers.   You'd then string together a series of map-reduces in this crazy guitar inspired "patch it together" configuration and the thing would be off to the races.  The downside is that the throughput of this kind of processes was *sub optimal*.

It wasn't anything inherent in the libraries.  The libraries were fast and good.  The APIs were optimised for high speed performance.  However, writing optimal *architectures* in the framework was tough.   If I wanted to do any crazy performance features, like combining map functions and reduce functions in a single map reduce run, the code got ugly *fast*.  Not only that, it was very difficult to maintain because of all the odd bookkeeping.  I have 10 outputs ordered by key, this is the one writing to that file right?  KRAP.

I spent 6 months writing applications of this nature and feeling like there had to be something better.   I started on a venture to write something, and as usual found that someone else already had.  That's when I found out about Flume and met Craig Chambers.

FlumeJava was a map reduce library that was gaining a lot of traction at Google, but I had heard a lot of complaints about its API.  Around the time I was looking at it, Flume C++ was coming into existence.  My team was one of the alpha users of the C++ variant.

The C++ API was a thing of beauty.   Like its Java cousin, it treats data a set of Parallel Distributed Collections.   You can see Daniel and my talk on the Scala equivalent here.  Converting Mappers and Reducers into this API was pretty simple.  You could even do it directly by just annotating your Mappers and Reducers with types.

My team saw a 30-40% reduction in code size for some of our map-reduce pipelines.  We had an 80% reduction in code for unit tests (which was by far the most amazing benefit).   Not only that, the Flume library optimizes the pipeline by performing all sorts of dirty map-reduce tricks for you.  In some cases we dropped a map-reduce call or two.  In the worst case, we had the same number we had started with.

What was wrong with the library?  It violated *almost every* style rule for C++ at google.  That's right, smart pointers, classes with inline member definitions the works.   I loved every second of it.  Why?  Because I was getting stuff done *faster* than before with *less* code and the pipelines ran *faster*.   It was a crazy win.

The startup time might not have been as optimal as it could be.  Flume ran an on-the-fly optimization before running your pipeline.  That was being improved all the time with neat tricks.   Things I didn't have to write to watch my app speed up, both runtime and startup time.

The key here is that the designers of Flume weren't focused on micro optimization but *macro* optimization.  The inner guts of the library used the very fast and efficient Map-Reduce library and the wrappers they had were as efficient as they could make them.   My code did not have to follow these rules, because the core loops were fast.  When it came down to it, my code used high level concepts.   Something akin to a closure and for-expressions in Scala (Note: The Scala equivalent *did* use for-expressions and closures with no noticeable performance hit).

There are times when writing Scala code requires care and optimization in the micro level.  However, don't lose the forest for the trees.  Think about the entire application architecture.  Scala will open up possibilities for writing code that you'd never dream of trying to maintain in C++ or Java.  Take Akka as a shining example.

And when you need the performance, listen to those techniques.   Viktor Klang can probably give you a *ton* more.  I know I learn more every time I talk with him.
