---
layout: post
title: Iteratees
category: scala
---

There's been a lot of hype about Iteratees in the past, as well as several good [articles](http://apocalisp.wordpress.com/2010/10/17/scalaz-tutorial-enumeration-based-io-with-iteratees/).  I've been playing around with them in my spare time, and they have some really neat properties.  Before getting into those, let's cover the basics.


Iteratees are an immutable implementation of a Consumer/Producer pattern.  A Consumer takes input and produces an output. A Consumer can have one of three states:

* Processing
* Finished
* Encountered an Error

Let's look at a possible implementation.

{% highlight scala %}
sealed trait ConsumerState[I,A]
case class Processing[I,A](f: I => Consumer[I,A]) extends ConsumerState[I,A]
case class Done[I,A](result: A) extends ConsumerState[I,A]
case class Error[I,A](t: Throwable) extends ConsumerState[I,A]
{% endhighlight %}

The Processing state contains a function that takes input from a Producer, and returns the next consumer.  Remember that these are immutable, so any state change must return a new object.  The Done state contains the result of a given consumer, and the FatalError state holds a single java error representing what failed.  The actual consumer class will look like the following:

{% highlight scala %}
trait Consumer[I,O] {
  def fold[A](f: ConsumerState[I,O] => Context[A]): Context[A]
}
{% endhighlight %}

The `fold` method is the only necessary method for a consumer.  The fold method takes a function that operates on any consumer state and returns a value in the iteratee `Context`.   The `Context` is the mechanism that is evaluating an iteratee.   This is what lets asynchronous iteratees return values in a `Future` and operate on different threads.
h
*Note: `Consumer`s are called `Iteratee`s in Haskell/Scalaz iteratee libraries.*

Next is the Producer interface.  A Producer should generate input values to feed into a Consumer.   The producer 'drives' the Consumer to some final state, which is returned.   Let's look at the interface:

{% highlight scala %}
trait Producer[I] {
  def into[O](input: Consumer[I,O): Consumer[I,O]
}
{% endhighlight %}

The `into` method takes a consumer, drives whatever data is in the Producer through the consumer, and returns the resulting consumer state.   Note that this resulting consumer could still accept more input.

*Note: `Producer`s are called `Enumerator`s in Haskell/Scalaz iteratee libraries.*

Let's define a `Producer.once` method that can take a single value and feed it into an `Consumer`.

{% highlight scala %}
object Producer {
  def once[A](value: A): Producer[A] = new Producer[A] {
    def into[O](input: Consumer[I,O]): Consumer[I,O] = input fold {
      case Processing(f) => f(value)
      case other         => Consumer(other)
    }
  }
}
{% endhighlight %}

The new producer simply folds over the consumer's state.   If it's a processing consumer, we feed the value and return the result.   If the consumer is in any other state, we return that state in a consumer.

The code has one major problem.  The fold method returns values *inside* the `Context` of the iteratee.  That is, we can't peek into an consumer, unless we know where/how it is running and *are in that context*.   This way, if the consumer is running inside a `Future`, all processing code will join with the consumer.  Let's modify the code.

{% highlight scala %}
object Producer {
  def once[A](value: A): Producer[A] = new Producer[A] {
    def into[O](input: Consumer[I,O]): Consumer[I,O] = Consumer.flatten(input fold {
      case Processing(f) => contexted(f(value))
      case other         => contexted(Consumer(other))
    })
  }
}
{% endhighlight %}

This code assumes two methods.   The `contexted` method takes any expression, and evaluates it in the iteratee context.   The signature is `def contexted[A](a: =>A): Context[A]`.  The `Consumer.flatten` method can take a `Context[Consumer[I,O]]` and flatten it out into a regular `Consumer[I,O]`.  (*Implementation is [here](https://github.com/jsuereth/scalaz/blob/scalaz-nio2/nio/src/main/scala/scalaz/nio/generic/iteratees.scala#L156)*).

## Chaining Consumers ##

The biggest reason to use Iteratees is their composability.   That is, we should be able to chain Consumers, such that one will run and then another.   We should also be able to "zip" Consumers, such that two can run against the same input.   To make this happen, we need to adapt our notion of consumer state a bit.  First, let's ensure that 'leftover' input from one Consumer can be fed to the next when chaining.

{% highlight scala %}
case class Done[I,A](result: A, remainingInput: I) extends ConsumerState[I,A]
{% endhighlight %}

Now, the completed state has an additional value of the remaining input that was not consumed by the first iteratee.  We can use this to implement our sequencing operation `andThen`.

{% highlight scala %}
trait Consumer[I,O] {
  def andThen[O2](next: O => Consumer[I, O2]): Consumer[I,O2] = Consumer flatten this.fold {
    case Done(a, remaining)  => contexted(Producer.once(remaining) into next(a))
    case Processing(k)  => contexted(Consumer(Processing(in => k(in) andThen next)))
    case Error(e) => contexted(Consumer(Error(e)))
  }
}
{% endhighlight %}

The algorithm for chaining is simple:
* If the first consumer is done, feed the remaining input into the next consumer and return the resulting state.
* If the first consumer is still processing, feed data into it, and delay creating the second consumer.
* If the first consumer is in the error state, return that error state.

The fold pattern-match above reflects exactly that.


For those, who may be curious, the above is actually the implementation for `flatMap` on `Consumer` and will let us use `Consumer`s in for expressions.  To experiment, let's implement a few Consumers, starting with `peek`.

The `peek` consumer should take in an input value, return that as its done state and also put that value back onto its `remaining` value so that the next `Consumer` in the sequence will receive it again.  Hence, we just peek at the value without really consuming it.

{% highlight scala %}
def peek[I]: Consumer[I,I] = {
  def handler(input:I) = Consumer(Done(input, input))
  Consumer(Processing(handler))
}
{% endhighlight %}

The `peek` consumer is pretty trivial.   Let's implement a `head` consumer that will actually consume the first element.

{% highlight scala %}
def head[I]: Consumer[I,I] = {
  def handler(input: I) = Consumer(Done(input, ???))
  Consumer(Processing(handler))
}
{% endhighlight %}

This looks just like `peek`, except we need some way of not placing the previous input as the remaining input.   To do this, we need a way of creating an "empty" input.   While there are several ways to do this, the simplest is by adding an additonal level of abstraction.   Let's change our definition of consumers as follows:

{% highlight scala %}
sealed trait StreamValue[+I]
case class Chunk(value: I) extends StreamValue[I]
case object EmptyChunk extends StreamValue[Nothing]
case object EOF extends StreamValue[Nothing]

case class Processing[I,O](f: StreamValue[I] => Consumer[I,O]) extends ConsumerState[I,O]
{% endhighlight %}

Now, there is a `StreamValue` trait that could be one of there things:  A valid input, an empty input or a marker that input is at its end.  The Processing state is updated to now take in a `StreamValue` and return the next consumer.

Let's reimplement `peek` and `head` now.

{% highlight scala %}
def peek[I]: Consumer[I,Option[I]] = {
  def handler(input:I) = input match {
    case Chunk(input) => Consumer(Done(Some(input), Chunk(input)))
    case EOF          => Consumer(Done(None, EmptyChunk))
    case _            => peek
  }
  Consumer(Processing(handler))
}
def head[I]: Consumer[I,Option[I]] = {
  def handler(input:I) = input match {
    case Chunk(input) => Consumer(Done(Some(input), EmptyChunk))
    case EOF          => Consumer(Done(None, EmptyChunk))
    case _            => head
  }
  Consumer(Processing(handler))
}
{% endhighlight %}


The `peek` and `head` consumers now need to return optional values, because they could receive an `EOF` input before having a chance to see the value.   The only significant difference between these two is that `head` will return an `EmptyChunk` for remaining input, whereas `peek` will return the original input.   Now that we have these consumers, we can stream them together.

{% highlight scala %}
def headTwice: Consumer[I, Boolean] = 
  for {
    p <- peek
    h <- head
  } yield p == h
{% endhighlight %}

This will run the `peek` Consumer and then feed remaining input to `head`.   The headTwice observer should *always* return true, since peek does not actually consume the value from the stream.

The ability to sequence Consumers using for-expressions is one of their strengths.  Complex protocols can be as simple as a large for-expression.

## Zipping Consumers ##

Two Consumers can also be 'zipped' or run off the same input.   This can be handy, e.g. when checksuming a file while parsing it.  Let's define a ZippedConsumer:

{% highlight scala %}
  class ZippedConsumer[I,A,B](first: Consumer[I,A], second: Consumer[I,B]) extends Consumer[I, (A,B)] {
      // Helper method to push data through both iteratees.
      private def drive(input: StreamValue[I]): Consumer[I, (A,B)] =
        new ZippedConsumer(Producer.once(input) into first, Producer.once(input) into second)
      def fold[R](f: ConsumerState[I,(A,B)] => Context[R]): Context[R] =
        first.fold { state1 =>
          second.fold { state2 =>
            (state1, state2) match {
              case (Consumer.Done(a, i), Consumer.Done(b, _)) => f(Consumer.Done(a->b, i))
              // TODO - Both cases are errors....
              case (Consumer.Error(e,k), other)               => f(Consumer.Error(e, k))
              case (other, Consumer.Error(e,k))               => f(Consumer.Error(e, k))
              case _                                          => f(Consumer.Processing(drive))
            }
          }
        }
      
    }
{% endhighlight %}

The `ZippedConsumer` implements two methods.  The first, `drive` is a private helper method.  If both underlying consumers are in a processing state, this will feed incoming data into them and return a new ZippedConsumer with the resulting new consumers.  This method is used later.
The second method, `fold` is the core method of Consumers.  This method in turn, folds over the underlying states of the two consumers and determines a new combined state.  In the event that both are completed, then the ZippedConsumer enters its completed state, returning a tuple of both results.   If either consumer is in an error state, the zipped consumer is in an error state.   If either consumer is still processing, the zipped consumer uses the `drive` method to continue processing.

The `ZippedConsumer` can be exposed via a `zip` method.   Now, given a consumer protocol consisting of `msgHdr` and `bodyProcessor` and a consumer `sha1sum`, we can construct a new Consumer which reads in a message and validates its sha1sum:

{% highlight scala %}
  val protocol: Consumer[ByteBuffer, Message] =
    for {
      hdr <- msgHdr
      (body, sha) <- bodyProcessor(hdr) zip sha1sum
      if sha == hdr.sha
    } yield Message(hdr,body)
{% endhighlight %}

*Note: the above assumes we have a valid `withFilter` or `filter` method on `Consumer`s.  This method converts the Consumer state to an error if the condition does not hold.*

There's a lot of flexibility with iteratees now that we can parallel or sequentially consume data.  Since every consumer is immutable, the sky's the limit on how you compose them.


## Stream Conversions ##

The Iteratee library is starting to look nice, but there's still another concern.  Say, we have a `Producer` of byte buffers from files.   However, in my program, I'd like to write consumers against *lines* of input.  If I have a conversion from streams of byte buffers to streams of character buffers, and another from character buffers to delineated "lines", then I should be able to chain these on a producer and use consumers of lines.

For example, here's what a line-count algorithm should look like against a file:

{% highlight scala %}
  val bytes = read_channel_bytes(fileChannel, directBuffers=true)
  val chars = bytes convert charset.decoder()
  val lines = chars convert lineDecoder
  val lineCount = lines into counter
  lineCount fold {
    case Done(count, _) => contexted(count)
    case _              => sys.error("NO result!")
  }
{% endhighlight %}

In this example, `read_channel_bytes` constructs a consumer of byte buffers from the file.   The `convert` method takes a stream conversion and returns a new Producer with transformed stream.   So, first `bytes` are converted into `chars` by a `charset.decoder()`, then `chars` are converted into `lines` by the `lines` decoder.  Finally, `lines` are fed into a `counter` Consumer, yielding a line count.

Let's first look at the count consumer, since that's the simplest:

{% highlight scala %}
  def counter[I]: Consumer[I, Long] = {
    def step(count: Long): StreamValue[I] => Consumer[I,Long] = {
      case e @ EOF      => Consumer(Done(count, e))
      case c @ Chunk(_) => Consumer(Procesing(step(count + 1)))
      case EmptyChunk   => Consumer(Processing(step(count)))
    }
    Consumer(Processing(step(0)))
  }
{% endhighlight %}

The `counter` consumer keeps track of the count in the `step` function.   This function returns the next processing step.

Now, let's look at the interface for a StreamConversion.  *Note: In Haskell/Scalaz these are called `Enumeratee`s.*

{% highlight scala %}
    trait StreamConversion[I,I2] {
      def apply[O](i: Consumer[I2,O]): Consumer[I, Consumer[I2, O]]
      def convert[O](i: Consumer[I2, O]): Consumer[I, O] =
        apply(i).join
    }
{% endhighlight %}

A StreamConversion has two methods: `apply` and `convert`.  The `convert` method, seen above, can take a `Consumer` of one type of input stream (`I`) and change it into a consumer of another type (`I2`).  The `apply` method is the only abstract method of a stream conversion.   This method constructs a Consumer that has a result of an underlying consumer.   This is essentially what a conversion is.  We construct one consumer, which adapts an incoming stream and feeds into the underlying consumer, eventually returning the result.  The `join` method, found [here](https://github.com/jsuereth/scalaz/blob/scalaz-nio2/nio/src/main/scala/scalaz/nio/generic/iteratees.scala#L72) is a convenience method in this situation.   Most of the time, we don't really care how a stream is being converted, we just want to pretend there is a new consumer.

Finally, `Producer`s can also have a `convert` method that takes a `StreamConversion` and modifes their *output*.   Let's take a look.

{% highlight scala %}
trait Producer[A] { self =>
  def into[O](c: Consumer[A, O]): Consumer[A, O]
  def convert[A2](conversion: StreamConversion[A, A2]): Producer[A2] =
    new Producer[A2] {
      override def into[O](c: Consumer[A2,O]): Consumer[A2,O] =
        Consumer flatten (self into (conversion apply c)).result
      override def toString = "ConvertedProducer("+self+" by " + conversion +")"
    }
  }
{% endhighlight %}

This `convert` method simply takes any Consumer passed in and first wraps it by the stream conversion before pushing data into it.  Since everything in this framework is immutable, it's ok to re-use the same stream conversions (decoders) over and over and over again.

For some example Stream Conversions, see the [charset decoder](https://github.com/jsuereth/scalaz/blob/scalaz-nio2/nio/src/main/scala/scalaz/nio/channels/charchannels.scala#L24), [line splitter](https://github.com/jsuereth/scalaz/blob/scalaz-nio2/nio/src/main/scala/scalaz/nio/channels/charchannels.scala#L90), [word splitter](https://github.com/jsuereth/scalaz/blob/scalaz-nio2/nio/src/main/scala/scalaz/nio/channels/charchannels.scala#L64)

## Communication channel between Producers/Consumers ##
  
So far, we've seen that iteratees are great for streaming data.   However, what if the stream support random access?   We need a way to communicate *between* `Producer`s and `Consumer`s.   So far, a `Producer` can find out a consumer's state simply by `fold`ing on it, and a Consumer receives information from the producer via the `StreamValue` hierarchy.  If we want the `Consumer` to be able to tell the `Producer` to move his input stream to a new location, we can accomplish this through some kind of channel in the `ConsumerState`.

Since a `Consumer` requesting some random-access seek, or other operation, be performed is probably in the midst of processing data, it makes sense to place a new message channel on the `Processing` state class.   Let's take a look:

{% highlight scala %}
trait ProcessingMessage
case class Processing[I,O](next: StreamValue[I] => Consumer[I,O], 
                           optMsg: Option[ProcessingMessage] = None) extends ConsumerState[I,O]
{% endhighlight %}

Now, a `Consumer` can include an optional processing message for `Producer`s.  All of the `ZippedConsumer`, `andThen` and other combinator logic has to be changed, such that the processing messages can be propogated.   However, when complete, we can create a new Consumer called "seekTo".


{% highlight scala %}
def seekTo(offset: Long): Consumer[ByteBuffer, Unit] =
      Consumer(Processing(in => Consumer.done((), in), Some(RandomAccessMsg.SeekTo(offset))))
{% endhighlight %}


This consumer will accept one input, and immediately be done, placing that input back into the stream.  It also carries the `RandomAccess.SeekTo` message (not shown before).  This message may or may not be handled by our Producer.  However, if the Producer can support the SeekTo message, it will move the stream and then continue sending input.  You can see an example implementation for file channels [here](https://github.com/jsuereth/scalaz/blob/scalaz-nio2/nio/src/main/scala/scalaz/nio/channels/filechannels.scala#L41).

This allows us to use for-expressions to send messages to the producer.  e.g., we could write the following:

{% highlight scala %}
def findData(key: Long): Consumer[ByteBuffer, Data] =
  for {
    index <- readIndex
    hdr = index get key
    _     <- seekTo(hdr.diskLocation)
    data  <- grabBlob(hdr.size) 
  } yield data
{% endhighlight %}

This consumer will first consume the index at the head of a file, and then look for the location on disk to consume the remaining data.  This is a very elegant way to nest seek commands with other 'normal' consumers.


## Example ##

Hopefully, we've shown some insight in to the design of a good iteratee library here.  I'd like to finish up with an example program from my current toy branch of Scalaz where I play with iteratees.

Here's a program with will perform the same calculations as the linux command line `wc`.  That is, it will count words, characters and lines in a file.   Note that if the file does not line up with the default encoding for a platform, this will barf error messages.

{% highlight scala %}
import scalaz.nio.std._
import scalaz.effect.IO
import scalaz.syntax.monad._
import scalaz.nio.buffers._

/** Ensures a file is closed. */
def withFile[A](file: java.io.File)(proc: java.nio.channels.FileChannel => IO[A]): IO[A] =
  for {
    stream <- IO(new java.io.FileInputStream(file))
    result <- proc(stream.getChannel) onException(IO(stream.close()))
    _      <- IO(stream.close())
  } yield result

// Mimics WC command-line
def wcLzy(file: java.io.File): IO[String] =
  withFile(file) { c =>
    val bytes: Producer[ImmutableBuffer[Byte,Read]] = 
      bytechannels.read_channel_bytes(c, directBuffers=true)
    val chars = Producer[ImmutableBuffer[Char,Read]] =
      bytes convert charsets.decoder()
    val wordCount: Consumer[ImmutableBuffer[Char, Read], Long] = 
      charchannels.words convert utils.counter
    val lineCount: Consumer[ImmutableBuffer[Char, Read], Long] = 
      charchannels.lines convert utils.counter
    val allCount: Consumer[ImmutableBuffer[Char,Read], String] = 
      lineCount zip wordCount zip utils.lengthCounter(_.remaining) map {
        case((lc, wc), cc) => "lines: %d, words %d, chars %s" format (lc,wc,cc)
      } 
    chars into allCount result
  }
def wc(file: java.io.File): String = 
  wcLzy(file).unsafePerformIO
{% endhighlight %}

In this example, the Consumers are being threaded through Scalaz's IO monad.  This is not a necessity of the library and in fact, my goal for the asynchronous bits is to use futures rather than IO to better represent the execution model.

I hope that this has simplified your view of Iteratees.  They really are an amazingly flexible, elegant system of processing inputs and producing outputs.  I'm only at the beginnings of a decent Iteratee library, and already I can see the huge power in the ability to avoid re-streaming data through combining consumers.

It's my personal opinion that Iteratees demonstrate a lot of good design principles of functional programming.

* Implementing class state in terms of a 'fold' operation  (Note: We combine 'fold' with classical OO inheritance here).
* Sequencing workflows inside a monadic context
* Combinator operators to build large things from small things
* Leveraging immutability to acccomplish the above.

One aspect that I didn't get to delve into much is "Leveraging category theory for minimal implemenations with rich APIs".  Perhaps in a blog post covering Scalaz7.

