---
layout: post
title: On Macro-Composition vs. Micro-Composition and Social software development.
---

I was talking to a co-worker today about using C++ templates to compose functionality in objects. I also mentioned how you can encode type traits using templates. My Coworker, conveniently aliased as "Bob", asked why you would want to use type traits rather than defining an interface directly and wrapper objects.

In response, I gave rather lame answers, which I intend to amend here. The basic gist is that I feel a lot of Object Oriented languages don't pay enough attention to macro composition of components in a system.

### First ###
 I'd like to state that In a lot of my code, there are a set of classes that define the format of data, or the "data layer". This layer has a certain "mind-share" around it. It is "owned" be a group of individuals and the portion of code they own. This data is passed around to other teams of people. 

Note that I specifically state "other teams" and not "other components". In a lot of software shops, we think of software being comprised of sub-components of a system, but I tend to find that the sub-components of a system are also defined by the teams that work on them. If a particular team works on several sub-components, these components tend to be cohesive and reuse a lot of code. The boundaries between these teams are important to pay attention to.

It's the boundaries where we tend to do a lot of conversions from one data definition to another. Each team wants to wrap its own "needs" around the ontology of classes. So in an OO system, this usually means wrapping data from one set of classes to another, or bunch of external methods that manipulate the data from another team. Because of this natural bent in programming, it's sometimes necessary to be able to adapt other people's specific classes into your own ontology. This is where type classes come in.

I've blogged about type classes/type traits before, so I won't bore you again. The basic gist of the idea is to define an interface for your method. For example, I'm writing something that works with tree-like data structures where each parent node could have multiple children. I define a type trait as follows:

{% highlight scala %}
trait TreeLike[NodeType] {
  def isParent(node: NodeType): Boolean
  def children(node: NodeType): Iterator[NodeType]
}
{% endhighlight %}

This allows me to take any "node" type and traverse it. Now, Let's write an algorithm where we want to see if a condition holds true down one "branch" of the tree to a leaf for every Node of this path. We can use our TreeLike type trait.

{% highlight scala %}
final def hasValidDepthPath[T: TreeLike](node: T, validator: T => Boolean): Boolean =
  if(validator(node)) {
    val helper = implicitly[TreeLike[T]]
    !helper.isParent(node) || helper.children(node).exists(hasValidDepth(_, validator))
  } else false
{% endhighlight %}

The hasValidDepthPath method uses the TreeLike type trait rather than a different class. This lets us use non-treelike structures as trees. For example, we can turn a list into a tree where each branch is the same list but missing one item of the index.

    scala> def dropIndex(x : List[Int], idx : Int) = x.zipWithIndex.filter(_._1 != idx).map(_._2) 
    dropIndex: (x: List[Int],idx: Int)List[Int]
    
    scala> dropIndex((1 to 10).toList, 2)
    res2: List[Int] = List(0, 2, 3, 4, 5, 6, 7, 8, 9)
    
{% highlight scala %}
implicit val decomposeList[T] = new List[T] {
  def isParent(node : List[T]) = node.length != 1
  def children(node : List[T]) = (1 to node.length).map(dropIndex(node, _))
}
{% endhighlight %}

Now we can use a List of items as an input to our hasValidDepthPath method. 

Now to my coworkers question: Why would I want to add this extra layer?

My answer is that it helps when working with "ontologies" from different teams. That is, each team has their own way of describing data. This mechanism allows our functions to mostly ubiquitously deal with these differing items, writing adapters for each ontology. This makes more sense when your algorithms deal with many different input types. In fact, I think it makes the most sense for 'peripheral' code. That is code that interacts with other teams.

### Now, for the second part of the rant. ###

I feel a lot of languages don't support macrocomposition well. A great example of this is the existence of the Spring Framework. Spring allows you to define interfaces, objects and their dependent components. You can then build configurations where you create specific objects, bind them to names and inject them into other objects. You are essentially defining the components of your system at a micro->macro level. Spring configuration allows you to focus on building the various components as needed at an object-by-object level until you are configuring objects that comprise major subcomponents of your system. Google Guice allows you do to a similar thing in Java using annotations.

The important thing here, IMO is that there is a distinction between defining components/classes and composing them. We define a component that uses others via some interface in one section, and we combine these components together in another.

In C++ we can also accomplish this to some extent using type traits. In C++ type traits usually take the form as templated structures. Composition is then done using template arguments. The best example of this is the STL and its usage of traits for allocation, comparison, hashing, etc.

In C++, we could define a service as follows:

{% highlight cpp %}
template<typename Logger, typename Threading>
class Service {
 public:
   typename Threading::ScopeLock ScopeLock;
   void MyMethod() {
     Logger log;
     Threading threading;
     {
       ScopeLock scoped(mutex_);
       log.info("OMG!!!");
     } 
  }
 protected:
   typename Threading::Mutex mutex_;
};
{% endhighlight %}


This service is really really simple, but shows how to compose with type traits. The Threading interface is any class that defines a Mutex typedef (for mutexes), a ScopeLock typedef (for locking mutexes within a scope). This class could be reused across various threading libraries, by providing something with the correct type definitions. I would expect to see, somewhere else in code, the following "Compositional" Code:

{% highlight cpp %}
// This code replaces a Spring XML configuration.
typedef Service<PthreadThreading, DefaultLogging> MyService;
typedef SomeHigherLevelService<...., MyService> MyHigherLevelService;
{% endhighlight %}

The nice aspect here is that I can use typedefs to compose "micro" components of my system and aggregate those into "macro" components. It's the same technique used for both.

In Scala, I've used the following tactic: Define a trait which implies composition. This method has a lot of boilerplate, so bear with me.

I want to define a Logger service that traits can use. To do this I define the generic Logger trait and a generic HasLogger trait.

{% highlight scala %}
trait SimpleLogger {
  def info(msg : String) : Unit
  def warn(msg : String) : Unit
  def fatal(msg : String) : Unit
}

trait HasSimpleLogger {
  val logger : SimpleLogger
}
{% endhighlight %}

This SimpleLogger provides no advanced features, just three levels of logging. The HasSimpleLogger trait defined an abstract value for the Logger. It does not instantiate the logger, it merely denotes that a class will have one (i.e. needs to be composed with one). Later, we will define some service:

{% highlight scala %}
trait MyService extends HasSimpleLogger {
  def serviceMethod() {
    logger.info("MyService: Someone called my method")
  }
}
{% endhighlight %}

This is how we define each "abstract" component. We extend each composition trait (i.e. HasFoo) and then utilize the components as necessary. Again, there will be code somewhere that composes these components together. In Scala, the mechanism of composition is the trait *not* a class instance:

{% highlight scala %}
trait MyComposedService extends MyService with HasDefaultLoggerImplementation

trait HasMyComposedService extends HasMyService {
  val mySerivce = new MyComposedService {}
}
{% endhighlight %}

Why do we have to compose in this manner? Because we'd like to have more control when composing large systems together. This mechanism allows us to "reconfigure" a MyComposedService with additional behavior or alternative subcomponents without having to redeclare *all* the subcomponents.

The downside to this approach is that it is full of boilerplate. However, notice again the distinction between defining components and aggregating behavior into our final system.

I'm of the opinion that these two functions are key to creating reusable software and they need to be simple and elegant to be used. I've yet to see a large system where I felt the composability ever reached the ideals touted by J2EE of old. In fact, I feel EJBs are horrible for microcomposition. The Spring framework further proved this by provided a microcomposition layer below Session beans that became quite popular.


In any case, these are my ramblings and musings on development. I'd love to hear back from you. I'm of the opinion that after becoming a proficient software developer, the solutions I write solve three issues:

1. A complex new algorithm to solve a problem "never before solved" (at least by the company I work for), or some foundational library.
2. Munging data between social components of software, or differing ontologies
3. Composing components to form a complex system.

I feel a lot of languages focus on (1). The languages I tend to prefer allow me to do (2) and (3) with ease.

