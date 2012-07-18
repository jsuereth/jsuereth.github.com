---
layout: post
title: When you program you use calculus
category: general
---

That's right.  Every programmer has an innate understanding of calculus and algebra.   All optimisations in computer science turn out to be exercises of formal or ad-hoc algebra and calculus?   Don't believe me?   Let's look at an example.


There's an excellent blog article from Alexander Dymo detailing [performance gains for Rails active record](http://www.acunote.com/blog/2008/01/guerilla-guide-to-optimize-rails-applications.html).  In the post, Alexander simplifies the problem to the following call stack:

{% highlight ruby %}
Task#save
...
ActiveRecord::Base#create_without_callbacks
ActiveRecord::Base#attributes_with_quotes
ActiveRecord::Base#attributes
ActiveRecord::Base#clone_attributes
ActiveRecord::Base#clone_attribute_value
Kernel#clone
{% endhighlight %}

He then makes the following statement:

<blockquote>From <a href="http://cfis.savagexi.com/articles/2007/07/18/making-rails-go-vroom">Charlie's blog</a> we know that AR::Base::attributes method is evil. It clones attributes before returning them and Charlie gave a wise advice to not use it. And indeed in your application is a good idea to call, for example, task['foo'] instead of task.foo or task.attributes['foo']. But here AR::Base::create itself does the evil thing.</blockquote>

The culmination of which is rewriting this method:

{% highlight ruby %}
def attributes_with_quotes(include_primary_key = true)
    attributes.inject({}) do |quoted, (name, value)|
        if column = column_for_attribute(name)
            quoted[name] = quote_value(value, column) unless !include_primary_key && column.primary
        end
        quoted
    end
end
{% endhighlight %}

Into this method:

{% highlight ruby %}
def attributes_with_quotes(include_primary_key = true)
  result = {}
  @attributes.each_key do |name|
    if column = column_for_attribute(name)
      result[name] = quote_value(read_attribute(name), column) unless !include_primary_key && column.primary
    end
  end
  result
end
{% endhighlight %}


## What happened? ##
The author made the realization that one particular method was being called which was not needed.  He refactored the faulty code to avoid the expensive method call.  In so doing, he preserved the integrity of the program.   It was possible to achieve the same result with a different set of method calls!

This is the very act of calculus!  Don't believe me?  Let's look at a quote on the [Calculus wikipedia page](http://en.wikipedia.org/wiki/Calculus):

<blockquote>
Calculus is the study of change, in the same way that geometry is the study of shape and algebra is the study of operations and their application to solving equations.
...
More generally, calculus (plural calculi) refers to any method or system of calculation guided by the symbolic manipulation of expressions
</blockquote>


SO, algebra is the study of operations (in the above example, method calls, field updates, etc.) and calculus is the *manipulation* of those expressions.  To make things more mathy, let's do a quick conversion of method calls into arbitrary and arcane symbols.

From now own, the following table will represent different instructions:

<table>
<thead><tr><td>Expression</td><td>Meaning</td></tr></thead>
<tbody>
<tr><td>x</td><td>A "slot" for containing data</td></tr>
<tr><td>x @ y</td><td>Read the data out of slot y</td></tr>
<tr><td>x @= y</td><td>Place data referenced by y into slot x</td></tr>
<tr><td>ZOMG(x)</td><td>copy the data in slot x</td></tr>
<tr><td>x ;)</td><td>execute statement x (and smile)</td></tr>
<tr><td>(expr)</td><td>Group a set of operations</td></tr>
</tbody>
</table>

This is our set of operations.   Now we can define some rules and substitutions for them:

1. `x @ y ;) z @ y` is equivalent to `z @ y ;) x @ y`.   i.e. Reads can be re-ordered.
2. `y @= x ;) y @= x` is equivalent to `y @= x`.  i.e. Multiple assigns are redundant.
3. `ZOMG(x) @ y` is equivalent to `x @ y`.  i.e. copying returns same data.
4. `y @= x;  y @ z` is equivalent to `x @ z`  i.e. `y` beomes an alias for `x`.


NOW, let's look at the `attributes_with_quotes` in our arbitrary, poorly chosen, mathematically unsound notation!

<pre>
self @= (this object, just trust me that it does) ;)
result @= (empty array, again irrelvant to the rewrites) ;)
attributes @= ZOMG(self @ attributes) ;)    #  A simplification of calling `attributes`
result @= (attributes @ name)  ;)        # A simplification of `quote_vaue` and the `foreach` loop.
result ;)
</pre>


Now, we know that the ZOMG operation is terrible in performance, so we want to rewrite our short program using our known set of operations.   Well, rule #3 which lets us avoid copying if we aren't *writing* (`@=`) to the copied slot is ok.   Let's rearrange to try to get something that looks like that.   We can use rule #4 to substitute for the `attributes` variable:

<pre>
self @= ... ;)           # this
result @= ... ;)         # construct new empty array
result @= ( ZOMG(self @ attributes) @ name ) ;)
result  ;)
</pre>

The third statement now contains a `ZOMG(x) @ y`.   We can use rule #3 now to get:

<pre>
self @= ... ;)           # this
result @= ... ;)         # construct new empty array
result @= (self @ attributes @ name) ;)
result  ;)
</pre>

We have now avoided all `ZOMG` operations in our mini program.  We've optimised.   We used calculus and algebra to refactor formally.

# Preventing bad optimisations #

Now what if our initial proram looked like this:
<pre>
self @= (this object, just trust me that it does) ;)
result @= (empty array) ;)
attributes @= ZOMG(self @ attributes) ;)
(attributes @  y) @= z ;)
result @= attributes  ;)
result ;)
</pre>

Unfortunately, in this one, `result @= attributes` has a `@=` statement between it and `attributes @= ZOMG(...)`.   This means we cannot use rule #4 (substitution) because we don't have two statements side-by-side.   The formal rules we defined do not allow re-ordering writes (`@=`) so the above is the most optimal set of statements we can construct.   We could still use substitution to do this:

<pre>
self @= (this object, just trust me that it does) ;)
result @= (empty array) ;)
attributes @= ZOMG(self @ attributes) ;)
(attributes @  y) @= z ;)
attributes  ;)        # Substiution against result
</pre>

This would help in the event that `@=` reduction was a worth optimisation.

**Note: While I'm demonstrating problems, I just want to note that the notation, as defined, is lacking a few rules that make it sound.  There's a few obvious holes in it, but I'm not trying to invent a new notation, just demonstrate a point.**


## Pulling it together ##

We just made a horrendous symbolic notation and defined a few trivial rules and substitutions using *MATH*.  Why should you even care?

What if I mentioned that there are formal calculi that work with computation?   That mathematicians have been striving to confine programming into a well-defined notation, so that they can optimise it?   That if you have a problem that fits one of the calculi, you two could bend your program to well-known optimisations and profit?

Even recently, the [Go Language](http://golang.org/) adopted a bit of [PI calculus](http://en.wikipedia.org/wiki/%CE%A0-calculus) in the attempt to get some really awesome parallelization.  The utility of this stuff is out there, we just need to reach out to our academic friends and leverage what's useful.

Another example where this would have come in handy is with Parallel distributed collections.   When I was at Google, we had a library called [Flume](http://dl.acm.org/citation.cfm?id=1806638) where I worked on a [Scala extension](http://days2011.scala-lang.org/node/138/282).   Flume worked by staging parallel operations and feeding them into an optimisation engine.   This engine was responsible for taking "parallel operations" and reducing them into "MSCR" or map-reduce runs.   The operations consisted mostly of:

* `parallel-do`: Manipulate elements of a collection in parallel, generating a new collection.   Note: Not a 1:1 mapping of elements between them.
* `GC`: Collecting garbage, deleting intermediate distributed files.
* `parallel-join`: Associate two collections together using a Key.
* `read`: Read a distributed file or database.  Returns a conceptual "collection" for the data inside.
* `write`: Write a parallel collection into a distributed file or database.

The Java/Scala/C++ APIs allowed you to insantiate objects that represented this huge collections.  A call to the `readTable` method would returns a collection that staged a `read` operation for the optimisation engine.   There were explicit "ok i'm done now" methods you could use to force a portion of the staged parallel operations to run on the cluster.

The beauty of this system was its simplicity.  It's using the *right* level of abstraction for software design using map-reduce.   You could focus on munging data and analytics without worrying about how to pipe keys and values through map-reduce (well, not as much.  `parallel-join` still cared).  The optimisation engine can use whatever formal calculus you define on the operations, and let you reason through things using a set of simple rules.   You can *prove* that your optimisations aren't harming things.   You can also *prove* when your optimsations are aggressive, and understand the pitfalls.

## Calculus is fundamental for programmers ##

Whether or not you acknowledge the formal semantics of calculus, the reality is that we all use it when we optimise.  What's amazing is how effect we are with *no* formal semantics, just our knowledge of how a programming language works.   Our brains are excellent and forming the substitution rules and performing analysis.  But, just like professional athletes need to learn the fundamentals before they move on to the crux of their sport, so should software engineers master the fundamentals.  A basketball player that doesn't practice dribbling, running and shooting may find himself out-paced by those who do.  I've started to feel like that player as I enter the world of PI-calculus, lambda-calculus and formal computing.



