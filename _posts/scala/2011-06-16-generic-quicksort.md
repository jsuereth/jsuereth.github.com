---
layout: post
title: A Generic Quicksort in Scala
category: scala
---

So, I decided to create a quicksort algorithm in Scala that showcases how to write 'generic' collection methods. That is, how can we write an external method that works across many types of collections *and* preserves the final type.

Well, here's how you do it:

{% highlight scala %}
import scala.collection.SeqLike
import scala.collection.generic.CanBuildFrom
import scala.math.Ordering

object QuickSort {
  def sort[T, Coll](a: Coll)(implicit ev0 : Coll <:< SeqLike[T, Coll],
                             cbf : CanBuildFrom[Coll, T, Coll],
                             n : Ordering[T]) : Coll = {
    import n._
    if (a.length < 2)
      a
    else {
      // We pick the first value for the pivot.
      val pivot = a.head
      val (lower : Coll, tmp : Coll) = a.partition(_ < pivot)
      val (upper : Coll, same : Coll) = tmp.partition(_ > pivot)
      val b = cbf()
      b.sizeHint(a.length)
      b ++= sort[T,Coll](lower)
      b ++= same
      b ++= sort[T,Coll](upper)
      b.result
    }
  }
}
{% endhighlight %}

I've chosen a somewhat imperative approach to the problem. The quick sort algorithm is split into two parts: The first checks for small collections and returns them, the second picks a pivot and decomposes the collection into three pieces. Theses pieces are sorted (if necessary) and pushed into a builder, cleverly named "`b`". This "`b`" is given a hint to expect the entire collection to eventually wind up in the built collection (hopefully this helps performance). Finally, after passing the three partitions to the builder, the result is returned. 

The magic here is in the rather confusing type signature:

{% highlight scala %}
def sort[T, Coll](a: Coll)(implicit ev0 : Coll <:< SeqLike[T, Coll],
                             cbf : CanBuildFrom[Coll, T, Coll],
                             n : Ordering[T]) : Coll
{% endhighlight %}

Let's decompose this a bit. `T` is the type parameter representing elements of the collection. `T` is required to have an `Ordering` in this method (the `implicit n: Ordering[T]` parameter in the second parameter list). The ordering members are imported on the first line of the method. This allows the `<` and `>` operations to be 'pimped' onto the type `T` for convenience.

The second type parameter is `Coll`. This is the concrete Collection type. Notice that *no type bounds are defined*. It's a common habit for folks new to Scala to define generic collection parameters as follows: `Col[T] <: Seq[T]`. __Don't__. This type does not quite mean what you want. Instead of allowing any subtype of sequence, it only allows subtypes of sequence that *also* have type parameters (which of course, is most collections). Where you can run into issues is if your collection has (a) no type parameters or (b) more than one type parameter. For example:

{% highlight scala %}
object Foo extends Seq[Int] {...}
trait DatabaseResultSetWalker[T, DbType] extends Seq[T] {...}
{% endhighlight %}

Both of these will fail type checkking when trying to pass them into a method taking `Col[T] >: Seq[T]`. 

To get the compiler to infer the type parameter on the lower bound, we have to defer the type inferencer long enough for it to figure this out. To do that, we don't enforce the type constrait until implicit lookup using the `<:<` class.

The type parameter: `Coll <:< SeqLike[T, Coll] `
Ensures that the type `Coll` is a valid `Seq[T]`. You may be asking why this signature uses `SeqLike` rather than `Seq`.

__GOOD QUESTION!__

SeqLike differs from Seq in that it *retains the most specific type of the sequence*. This one of the magic tricks behind Scala's collections always returning the most specific type known. That type is embedded in `SeqLike`. To ensure that we can return the most sepcific type, we can Capture `Coll` as a `SeqLike with Coll` as the specific type. This means that `filter`s, `map`s, `flatMap`s, `partition`s should all try to preserve the type `Coll`.

The last implicit parameter is the `cbf` `CanBuildFrom`. Because we don't know how to construct instances of type `Coll` (because we don't know the type `Coll` at all), we need to implicitly receive evidence for how to construct a new Coll with sorted data. 

Let's look at the result:

    scala> QuickSort.sort(Vector(56,1,1,8,9,10,4,5,6,7,8))
    res0: scala.collection.immutable.Vector[Int] = Vector(1, 1, 4, 5, 6, 7, 8, 8, 9, 10, 56)
    
    scala> QuickSort.sort(collection.mutable.ArrayBuffer(56,1,1,8,9,10,4,5,6,7,8))
    res1: scala.collection.mutable.ArrayBuffer[Int] = ArrayBuffer(1, 1, 4, 5, 6, 7, 8, 8, 9, 10, 56)
    
    scala> QuickSort.sort(List(56,1,1,8,9,10,4,5,6,7,8))
    res18: List[Int] = List(1, 1, 4, 5, 6, 7, 8, 8, 9, 10, 56)
    
    scala> QuickSort.sort(Seq(56,1,1,8,9,10,4,5,6,7,8))
    res: Seq[Int] = List(1, 1, 4, 5, 6, 7, 8, 8, 9, 10, 56)
    
You may be asking why I've chosen `Seq` instead of `GenSeq` or `GenTraversable` or even `GenIterable`. No particular reason, besides I wanted a reasonable assurance that the collection author expects the `.length` and indexed access methods to be called.

So, what are the lessons to be learned here?

1. Use `*Like` subclasses to preserve the specific collection type
2. Defer inference using `<:<` to give the type checker a hope of succeeding
3. Provide `@usecase` comments for scaladoc so users won't get distracted by typesafe details.

At lest, IMHO, this is the current way of creating generic collection code.

