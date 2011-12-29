---
layout: post
title: Plus-colon extractor for collections.
category: scala
---

I often find myself writing the following for helpful head-tail decomposition:

{% highlight scala %}
package scala.collection

object +: {
  def unapply[T,Coll <: SeqLike[T, Coll]](
      t: Coll with SeqLike[T, Coll]): Option[(T, Coll)] =
    t.headOption map ( h => (h, t.tail))
}
{% endhighlight %}

And then using it for head-tail decomposition like this:

    scala> val x = Vector(1,2,3)
    x: scala.collection.immutable.Vector[Int] = Vector(1, 2, 3)

    scala> x match {
         |   case x +: xs => println(x); xs
         | }
    1
    res1: scala.collection.immutable.Vector[Int] = Vector(2, 3)


rather than the 'classical' variant:

    scala> x match {
         |   case Seq(x, xs @ _*) => println(x); xs
         | }
    1
    res2: Seq[Int] = Vector(2, 3)


I was curious if anyone else desired a parallelism to `+:` in pattern matching that mimics what's available for `List`s (`::`).  If you're like me, feel free to borrow the code, but also speak up!  I'll find out about adding it into the standard library.

*Note: We could also have a matching `:+` operator for `(x.init, x.last)` decomposition as well.  (Only really efficient for IndexedSeq, I would guess).*

