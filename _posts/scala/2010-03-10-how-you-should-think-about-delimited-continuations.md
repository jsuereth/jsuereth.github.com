---
layout: post
title: How you should think about Delimited Continuations
category: scala
---

Scala 2.8.x is going to have a new delimited continuations plugins.   Delimited continuations are interesting animals, and I've seen some decent articles about them.   I'm going to portray here how you should think about delimited continuations in a way that will help you know how to make use of them in your coding.

Let's take a look at the [wikipedia definition delimited continuations](http://en.wikipedia.org/wiki/Delimited_continuation):

<blockquote>
a <b>composable continuation</b>, <b>delimited continuation</b> or <b>partial continuation</b>, is a "slice" of a <a href="http://en.wikipedia.org/wiki/Continuation" title="Continuation">continuation</a> <a class="mw-redirect" href="http://en.wikipedia.org/wiki/Stack_frame" title="Stack frame">frame</a> that has been <a href="http://en.wikipedia.org/wiki/Reification_%28computer_science%29" title="Reification (computer science)">reified</a> into a <a class="mw-redirect" href="http://en.wikipedia.org/wiki/Function_%28computer_science%29" title="Function (computer science)">function</a>.</blockquote>

This is basically saying that a delimited continuation is marking a particular section of a program in such a way the compiler can "reify" it into a Function (or Closure if you will).  In fact, the compiler can use similar semantics to how a closure is made, the difference here is in how you make arguments to functions.   Let's take a look at a simple Scala delimited continuation example and try to de-mystify:


    import scala.continuations.ContextControl._
    object SimpleCont {
      def main(args : Array[String]) : Unit = {
        val result = reset {
           1 + shift { k => k(k(5)) } + 1
        }
        Console.println(result)
      }
    }


This simple example prints 9 to the screen.   So what is happening?   Well, let's look at the definition: A "slice" of a continuation frame that has been reified into a function....

Well, we know reify essentially means  to make it a first-class citizen (or first-class-function).   So what is our "slice of continuation frame"?   It's everything inside the reset block.   This is where the "delimited" portion comes in.  We're using reset to as an outer-bounds for the compiler to capture code and reify it into a function.   In doing so, the compiler essentially takes all shift keywords and turns them into arguments for the reified function.   Let's look at what our reified function is equivalent to in the above example:


<pre>reset {
       1 + <span style="color: #117711; font-weight: bold;">shift { k => k(k(5)) }</span> + 1                   
  }
  val reifiedFunction = { shiftVal1 : Int => 
       1 + <span style="color: #117711; font-weight: bold;">shiftVal1</span> + 1
  }
</pre>

Notice how the entire `shift {..}` expression is converted into an argument of the reified function.  That's where the continuation comes in.  All code inside the reset, minus the shift expressions, is turned into continuations... Something that could be called later and/or multiple times.   For the real magic, let's take a look at this shift operation.

The shift command takes  a function as an argument.  This function takes another function as its only parameter (higher-order) and that function *is* the reified continuation.   So... strangely enough, the shift expressions are turned into arguments on functions *passed into the functions defined in the shift expression*.  Yes, this blew my mind at first, but becomes very interesting and handy.  Not only that, it's a true inversion of control.

In this simple example, the portion of code defined in shift *becomes* the main execution path, and calls the reified continuation.  Let's look at the translated code side-by-side<br />


<div style="width: 700px;">
<div style="float: left; width: 50%;">
<pre>object SimpleCont {
  def main(args : Array[String]) : Unit = {
    val result = reset {
       1 + <span style="color: #117711; font-weight: bold;">shift { <span style="color: #771111; font-weight: bold;">k =&gt; k(k(5))</span> }</span> + 1                   
    }
    Console.println(result)
  }
}
</pre>
</div>
<div style="float: right; width: 50%;">
<pre>object SimpleCont {

  def main(args : Array[String]) : Unit = {   
     // Reified function
     val <span style="color: #771111; font-weight: bold;">k</span> = { shiftVal1 : Int =&gt;
       1 + <span style="color: #117711; font-weight: bold;">(shiftVal1)</span> + 1
     }
     val result = <span style="color: #771111; font-weight: bold;">k(k(5))</span>
     Console.println(result)
  }
</pre>
</div>
</div>


As you can see, we've completely reversed the shifts and the resets.  Let's try to understand an example which involves two variables.  The Continuations paper includes an example that takes the cartesian product of two lists (i.e.  List(A,B) and List(C,D) =&gt; List((A,C), (A,D),(B,C),(B,D)) ).   First the example code straight from [the delimited continuations paper](http://lamp.epfl.ch/~rompf/continuations-icfp09.pdf) (with a few modifications for simplicity):

<pre>implicit def reflectiveList[A](xs:List[A]) = new {
      def reflect[B]() : A @cps[List[B], List[B]] = shift { k:(A =&gt; List[B]) =&gt;
        xs.flatMap(k)
      }
    }
    
    reset {
      val left = List("x","y","z")
      val right = List(4,5,6)
      List((left.reflect[(String,Int)], right.reflect[(String,Int)]))
    }
  }
// result: cartesian product
</pre>

Let's decompose this one a bit.   The implicit reflective stuff is used to enabled the reflective method on lists.  We'll analyze reflective soon, but for now, notice that it calls shift.   This means that calls to reflective are equivalent to calls to shift.  Let's try to figure out what the reified continuation is by first "inlining" all the code:

<div style="width: 600px;">
<div style="float: left; width: 50%;">
<pre>reset {
  val left = List("x","y","z")
  val right = List(4,5,6)
  List(Tuple2(
      <span style="color: #117711; font-weight: bold;">left.reflect[Any],</span>


      <span style="color: #111199; font-weight: bold;">right.reflect[Any]</span>


  ))
}
</pre>
</div>
<div style="float: right; width: 50%;">
<pre>reset {
  val left = List("x","y","z")
  val right = List(4,5,6)
  List(Tuple2(
        <span style="color: #117711; font-weight: bold;">shift { k:(A =&gt; C[B]) =&gt;
          left.flatMap(k)
        },</span>
        <span style="color: #111199; font-weight: bold;">shift { k:(A =&gt; C[B]) =&gt;
          right.flatMap(k)
        }</span>
  ))
}
</pre>
</div>
</div>

First of all, Notice the new type signatures on the shift expressions (without the generics).  We'll discuss these more in depth later, but if hand-reify the continuation, we need to make sure we match the signatures expected from the shift expressions.  Let's take our first crack at it:


<pre>val reified : = { (shift1, shift2) =&gt;
  List(Tuple2(
        <span style="color: #117711; font-weight: bold;">shift1</span>,
        <span style="color: #111199; font-weight: bold;">shift2</span> 
  ))
}
</pre>

Well, that seems simple enough...  except we're not creating the lists in the reified function!   Ah... remember, we're only reifying the continuation piece.  We can directly execute the portion of the code that are directly executable.  Let's try to completely unwind the code and translate it:

<pre>
// Original Code
reset {
      val left = List("x","y","z")
      val right = List(4,5,6)
      <span style="color: #660000; font-weight: bold;">List((<span style="color: #117711; font-weight: bold;">left.reflect[(String,Int)]</span>, <span style="color: #111199; font-weight: bold;">right.reflect[(String,Int)]</span>))</span>
    }
<span style="color: #660000; font-weight: bold;">val reified : (String, Int) =&gt; List[Any] = { (shift1, shift2) =&gt;
  List(Tuple2(
        <span style="color: #117711; font-weight: bold;">shift1,</span>
        <span style="color: #111199; font-weight: bold;">shift2</span>
  ))
}</span>

//Original reset was here...
val left = List("x","y","z")
val right = List(4,5,6)
<span style="color: #117711; font-weight: bold;">left.flatMap( l =&gt; <span style="color: #111199; font-weight: bold;">right.flatMap(r =&gt; reified(l,r)</span>)</span>
</pre>

Well that's interesting....   This is the effect of apply delimited continuations and should help you begin to reason about them and how they operate, however the actual truth of the matter is, your code is transformed differently.  Let's take a look at what is really happening, just so we can dig deeper if needed.   Technically, there are two reified continuation (for the two shifts) so let's make our hand-reified code do the same:

<pre>
//Original reset was here...
val left = List("x","y","z")
val right = List(4,5,6)
val reified1 : (String =&gt; List[Any]) = { shift1 =&gt;
  val reified2 : (Int =&gt; Any) = { shift2 =&gt;
        Tuple2(shift1,shift2)     
  }
  right.flatMap(reified2)
}

left.flatMap(reified1)
</pre>

So this is where it gets strange.   We create a function "refiied1" which is passed to the first shift expression (left.flatMap).   This contains the outer continuation.   We then have a second call to shift.  This means there is a second continuation generated inside the first continuation.   The second function is responsible for generating the tuples.   This is based to the second shift expression "right.flatMap".  As you can see, every time you use the shift function, you're causing the compiler to generate a new continuation to defer the next set of processing.   You can also see how in "pure" form, this has a very nested structure, whereas the original code was very "flat".  Also, because work is automatically defered into continuation functions, you can use this style for concise and performant asynchronous work.


Let's take a mini-dive into a continuations for automated resource management.  First, let's make our sample file:


    HAI!
    
    O
    MY!


Now, let's right a continuation-based program to read each line and give us the size of it.  I'm purposely making the code slightly confusing here to demonstrate the inversions.   Well, let's start off with a mechanism of "reflecting" or "inverting" a resource for delimited continuations.<br />

{% highlight scala %}
trait Resource[+R] {
      def flatMap[U](f : R => U) : U
      def reflect[B]() : R @cps[B,B] = shift { k : (R => B) => flatMap(k) }
}

def resource[R &lt;: Closeable](acquire : =&gt; R) = new Resource[R] {
      override def flatMap[U](f : R =&gt; U) : U = {
        val x = acquire
        try {
          f(x)
        } finally {
          System.out.println("Closing Resource!")
          x.close()
        }
      }
}
{% endhighlight %}

We define a simple Resource trait that gives us a flatMap (some may call this "using") and a reflect (or inverse) method.   This will let us "flatten" resource usage inside a reset block.   The next component is the implementation of resource for any java.io.Closeable implementation.   This will take a function to acquire a resource and implement the flatMap method correctly.   This should look *very* similar to the reflect method defined on lists...  One might even say this method works to flatten any monad ;)

Now, let's get really dirty and define an inversion on java.io.InputStream to deal with lines:

{% highlight scala %}
def reflect[A <: InputStream](input : A) = new {
      def each_line[B] : String @cps[B,List[B]] = shift { 
          k : (String =&gt; B) =&gt;
        val b = new BufferedReader(new InputStreamReader(input))
        var line = b.readLine
        var list = ListBuffer[B]()
        while(line != null) {
          list += (k(line))
          line = b.readLine
        }
        list.toList
      }
    }
{% endhighlight %}

We've defined our reflect method to work on every line within the file.  It builds up a list and returns it as the final result.  You'll notice the shift call takes a function requiring a String and returning a "B".   The fun type-system issue we have to deal with here is you need to know the result of the reified continuation in the return value for each_line.   We'll get to that more in a moment, but for now make note of this.

Alright, now let's define our simple function to manipulate every line in a file:

{% highlight scala %}
reset {
      val input = resource(new FileInputStream("test.txt")).reflect[Any] //We cheat on the return value here!
      val line = reflect(input).each_line[Int] //We need to know the continuation returns an Int Here!!!
      System.out.println(line)
      line.size
}
{% endhighlight %}

Wow... so really all we're doing is grabing our input, inverting to the "each_line" call and calling line.size after printing the line to the console.

So what's the output look like?

    scala> Main.resourceTest()
    HAI!

    O
    MY!

    Closing Resource!
    res0: Any = List(4, 0, 1, 3, 0)

This is great!   It's doing what we wanted.   Notice how we've "flattened" the code substantially compared with other methods.  Contrast the above with the following:

{% highlight scala %}
val input = new scala.io.magic.File("test.txt")
for { 
  stream <- file.managedInput
  line <- input.lines
} yield line.size
{% endhighlight %}

You'll notice a few similarities (in my made up library).   For-expressions are another area in scala where you're reifing portions of the code into closures and passing them to flatMap blocks.  However, delimited continuations open the doors to way more than flatMap.   Let's go back to that typing issue though.

If you remember, I was returning Any because I was being lazy with my type annotations when reflecting the input stream.   Let's use the correct annotation:

{% highlight scala %}
reset {
      val input = resource(new FileInputStream("test.txt")).reflect[List[Int]]
      val line = invert(input).each_line[Int] //We need to know the continuation returns an Int Here!!!
      System.out.println(line)
      line.size
}
{% endhighlight %}

So... what do these type annotations mean?   In the case of the resource's reflect method, the type annotation is the ultimate result from the reset call (i.e. the result of the reified continuation) because of how we defined flatMap on Resource.   The type annotation for each_line describes the type the resulting List of processed lines should contain... i.e. the result of the last portion of the continuation.  If we were to hand-code this reset piece we'd have:


{% highlight scala %}
val rcont1 : (FileInputStream => List[Int]) = { 
  inputStream =>
     val rcont2 : (String => Int) = { line =>
        System.out.println(line)
        line.size
     }
     val b = new BufferedReader(new InputStreamReader(inputStream))
     var line = b.readLine
     var list = ListBuffer[B]()
     while(line != null) {
        list += (rcont2(line))
        line = b.readLine
      }
      list.toList
  }
  resource(new FileInputStream("test.txt")).flatMap(rcont1)
{% endhighlight %}

So... delimited continuations certainly use far less code here.  The understanding of what's going on under-the-covers perhaps needs some good terminology/consistent paradigms to be useful in library-form (i.e. if I make each_line or reflective part of a standard library).   Also, it's my opinion that the type-inference barrier for the @cps annotation should be looked into.  Perhaps we can invent creative ways to infer the types in an inverted fashion when using delimited continuations.  In the meantime, the compiler will complain until you figure out the correct types, so it could be worse ;)

I plan to post a bit more about delimited continuations after I have some useful I/O related tools built up around them.   Let me know if you find this post helpful.  I'd also like to clarify that my "hand-reification" is not really how scala does reification, but close enough for understanding the concepts.

Also, there's some interesting continuation-based actors code in the paper that I'm going to try to dig into here when I have the time!
