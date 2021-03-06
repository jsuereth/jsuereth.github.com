---
layout: post
title: Masochism
category: cpp
---


__Note: Due to excessive comments about my grasp of the english languages, I've done a second round of editing for this post.  It may show up on the RSS feed again, but there isn't any new content.__

I've recently had to jump into a bit of (very minor) C++ development at work.  This started bringing back memories of all the ?fun? it was to play around in the C++ type system.  Mostly you use the C++ type system in an attempt to prevent yourself from doing bad things. Sometimes though, it was a way of doing conditional compilation in a type-safe manner.

I recently decided to outline how I tend to over-engineer my C++ code.  I'll give a few ground rules/goals first:
* I won't use boost.  In real life, I do use boost whenever I can.  For the purposes of illustration I'm doing a lot by hand.  If you're a C++ developer and you don't use boost, go learn it. Now.  Really, I mean right now go to [www.boost.org](http://www.boost.org) and enter the 21st century of coding.  No really, GO
* I'm not doing detailed explanations (although I do some explanations) of the C++ language or its compiler workings.
* This could be an attempt to ramp myself to attack learning scala's (and maybe haskell's) type sytem.  C++ is the closest typed language I know that could prepare me
* C++/Java feels more like masochism the more new languages I learn.  I'm hoping this "simple" post about using the C++ type system in a "simple" way will prove this to you.  At some point I hope to post a Scala/Haskell equivalent to this post (or perhaps someone else would like to?) just so you can see the amount of work C++ really requires (and the level of understanding required to write even a simple line).

Alright! so first off, the premise:  __We're trying to create a class (`DynamicLibrary`) that will let us dynamic load a shared library and access symbols.__ I'm only including code for linux (although porting to windows or "cross-platforming" isn't too bad. look into the LoadLibrary function in windows and dlopen in linux).

Before we begin, I'm going to construct something (available in boost) that should be in the utility kit of every C++ developer... a base class that removes the copy-constructor and operator= from visibility (effectively making it non-copyable)

{% highlight cpp %}
#ifndef NONCOPYABLE_H_
#define NONCOPYABLE_H_
//============================================================================
// This class prevents copying on subclasses
//============================================================================
template<class T>
class NonCopyable
{
public:
 inline NonCopyable() {}
 inline ~NonCopyable() {}
private:
 NonCopyable(NonCopyable& other) {}
 NonCopyable& operator=(NonCopyable& other) {}
};


#endif
{% endhighlight %}


It's a very simple class.  Most of its functions are purposefully inlined.  It should get compiled out during optimization phases, AND it can reduce typing for me later when I don't want a class copied around on the stack.
(Note: I could have saved one line of typing by changing to a struct and getting rid of the public: line. or putting all private functions first.  Sue me, but I prefer this look).

Ok, next we're going to create a very small Meta-Programming Library.  This library will be used to tell us all sorts of information about the types in C++.  For now, please assume all these examples are surrounded in a `namespace mpl {}` block.

Here's our first bout of magic:

{% highlight cpp %}
struct true_;
struct false_;  //Not really needed, but easier to understand if we have it
{% endhighlight %}

WTF? Why make two completely silly classes?  This is so I can represent the notion of a boolean in the type system. From now on, I want you to think of `true_` as "true in the meta-programming library" and similarly for `false_`. __Note: In actuality I could probably use bool as a template parameter and get away with it, but this is more fun__

Ok, now let's make a simple method just so we can print the boolean value of a type.

{% highlight cpp %}
template<typename T>
struct is_true
{
 enum { value = 0 };
};
template<>
struct is_true<true_>
{
 enum { value = 1 };
};
{% endhighlight %}

So..... what is that?   That, my friends, is a C++ meta-programming function.  The first template applies to every type and "returns" a value of `0` (or `false`).  The second is a specialization for the `true_` type that will return `1`.  This means if we ever use the `is_true` structure with `true_` as the argument, the "member" value will be `1`.  Its a little convoluted (or convolved?), but it works!  How do you call it?  Simply like this:

{% highlight cpp %}
is_true<some type>::value.
{% endhighlight %}

That will return an actually value we can assign, test in an if statement or display on the console.  We're going for displaying on the console here (console = stdout).

Ok, so let's get more interesting meta-functions.  The most important for what I'd like to do later is the `is_ptr` function.  Here's a look at it:

{% highlight cpp %}
template<typename T>
struct is_ptr
{
 typedef false_ value;
};
template<typename T>
struct is_ptr<T*>
{
 typedef true_ value;
};
{% endhighlight %}

So before we saw "template specialization".  That is, template<> with all types completely specified in an alternative implementation of the function.  This time, we see "partial template specialization" (YAY!!?).  This is where we have an alternative implementation that still has some wildcards (i.e. partially specialized).  When used, the compiler will select the function from most specialized to most general based on our types, so we can get away with this.

Now, what's that funny type-def doing and why isn't "value" part of an enum?  Well this meta-function takes a type as argument and returns a type (not a value).  You can string together meta-functions of this kind to make even stranger (and horrendous to look at) meta-functions.

As a simple example, let's make an "if" meta-function:
{% highlight cpp %}
template<typename COND, typename T, typename F>
struct if_
{
 typedef F value;
};
template<typename T, typename F>
struct if_<true_, T, F>
{
 typedef T value;
};
{% endhighlight %}
The above is a structure that will select either type `T` or `F` based on the valiue of `COND` (much like an if statement).

For now, let's test our first two meta-functions on a few combinations of the various incarnations of ints in C++.

{% highlight cpp %}
 cout << "mpl::is_ptr<int*>::value = " << mpl::is_true<mpl::is_ptr<int*>::value>::value << endl;
 cout << "mpl::is_ptr<int>::value = " << mpl::is_true<mpl::is_ptr<int>::value>::value << endl;
 cout << "mpl::is_ptr<const int>::value = " << mpl::is_true<mpl::is_ptr<const int>::value>::value << endl;
 cout << "mpl::is_ptr<const int*>::value = " << mpl::is_true<mpl::is_ptr<const int*>::value>::value << endl;
 cout << "mpl::is_ptr<volatile int>::value = " << mpl::is_true<mpl::is_ptr<volatile int>::value>::value << endl;
 cout << "mpl::is_ptr<const volatile int>::value = " << mpl::is_true<mpl::is_ptr<const volatile int>::value>::value << endl;
 cout << "mpl::is_ptr<volatile int*>::value = " << mpl::is_true<mpl::is_ptr<volatile int*>::value>::value << endl;
 cout << "mpl::is_ptr<const volatile int*>::value = " << mpl::is_true<mpl::is_ptr<const volatile int*>::value>::value << endl;
{% endhighlight %}
And the output is: 
{% highlight cpp %}
mpl::is_ptr<int*>::value = 1
mpl::is_ptr<int>::value = 0
mpl::is_ptr<const int>::value = 0
mpl::is_ptr<const int*>::value = 1
mpl::is_ptr<volatile int>::value = 0
mpl::is_ptr<const volatile int>::value = 0
mpl::is_ptr<volatile int*>::value = 1
mpl::is_ptr<const volatile int*>::value = 1
{% endhighlight %}

Neat-o huh?  Yeah I probably could change the output to really represent things, ie `mpl::is_true<mpl::is_ptr<....>::value>::value ? "true_" : "false_"`.  However it was already way to much typing.

Ok, now onto why we were making meta-functions to begin with.  I want a somewhat type-safe way of importing symbols from a dynamicly loaded library and casting them to their appropriate types. This idea came from an old colleague at APL.  I hope this solution is different enough, as I don't recall his solution.

Let's start off with our basic class structure for DynamicLib:

{% highlight cpp %}
//ASSUME LIBRARY_HANDLE_TYPE and SYMBOL_POINTER_TYPE are defined somewhere above (os-specific)
class DynamicLib : public NonCopyable<DynamicLib> {
public:
 DynamicLib(const char*const name); //implementation is OS-specific
 ~DynamicLib();                     //implementation is os-specific
 static SYMBOL_POINTER_TYPE get_symbol_internal(const char*const name, LIBRARY_HANDLE_TYPE handle); //implementation is OS-specific.  Didn't feel like figuring out to privatize this.
private:
 LIBRARY_HANDLE_TYPE handle; //handle to library (os-specific)
};
{% endhighlight %}

First off, notice the use of NonCopyable.  This ensures the class cannot be copied (i.e. you have to use pointers to share it).  This helps us ensure that the library is loaded once and destroyed once.  You could still construct it twice for the same library, but if you do that... well a maniacal penguin dressed in a business suit will come steal your fish.

Next, the `get_symbol_internal` method is static.  This is because the public (local) method has yet to be written and needs to use the MPL library (YAY!!!?).  What we'd like to do is find a way to return primitives by value, and everything else by pointer.  I'm going to call anything a "primitive" if it has a valid copy constructor (boy would this be wrong in a large app).  Instead of pulling in [Matthew Wilson](http://stlsoft.com)'s ["must_be_pod"](http://www.synesis.com.au/software/stlsoft/doc-1.9/unionstlsoft_1_1must__be__pod.html) meta-function-constraint, I think I'll just assume proper usage (like a fool).  __Note: A maniacal penguin did show up at my door, but I was able to dissuade it with a tennis racket and tuna fish.__

Ok, so onto the symbol loading...  Here's what our public symbol loading function looks like:

{% highlight cpp %}
//function for external use
 template<typename T>
 inline T get_symbol(const char*const name) {
  //Call appropriate function based on whether type is pointer or not.
  typedef get_symbol_<T, typename mpl::is_ptr<T>::value> get_symbol_functor;
  get_symbol_functor functor; //need an instance to use operator()...
  return functor(name, handle);
 }
private:
 template<typename T, typename isptr>
 struct get_symbol_;
{% endhighlight %}

Well, that's simple.  Too bad it won't compile when someone actually tries to use it.  What's going on here?  Well the get symbol function is templatized on some type.  Then we try to call the `get_symbol_` *functor struct*.  What is a functor struct (besides a lame excuse for a closure/real functor)?  It's a structure that (sort of) looks like a function in code (as shown above).   We declare (but not define) the structure.  The structure is where we will specialize our implementation for pointer types vs. non-ptr types.  Since we're using the `is_ptr` meta function above, all we need are two partial specialization for the `get_symbol_` functor.  The first specialization will take `true_` as its second type parameter. The second specialization will take `false_` as its second type parameter.  The false variant should perform a copy of the value pointed at by the symbol.  The true variant can just cast and return the symbol pointer.  Here's the code:

{% highlight cpp %}
 //Repeated for clarity
 template<typename T, typename isptr>
 struct get_symbol_;

 template<typename T>
 struct get_symbol_<T, typename mpl::true_> {
  T operator()(const char*const name, void* handle) {
   //This should fail to compile for types that don't have copy-constructors
   return reinterpret_cast<T>(DynamicLib::get_symbol_internal(name, handle));
  }
 };
 //Get symbol for non-ptr types
 template<typename T>
    struct get_symbol_<T, typename mpl::false_> {
     T operator()(const char*const name, void* handle) {
   //TODO - Fix const...
   return *static_cast<T*>(DynamicLib::get_symbol_internal(name, handle));
     }
    };
{% endhighlight %}

So now you can see how a struct-functor is created.  Basically you just define an `operator()` overload inside the structure, and it will start acting like a function (or at least looking like one...).

You can see how on the one hand we're de-referencing the pointer, and on the other we're just casting.  I'm also going to assume here (wrongly) that the get_symbol_internal will throw an exception on error, thereby ensuring that I will never dereference an invalid pointer (feel free to laugh, or send the penguin again).

Ok, and now for the main method that uses this mess of code (note I'm using `getopt.h`):

{% highlight cpp %}
int main(int argc, char*argv[]) {
 int c;
 extern char* optarg;
 extern int optind, optopt;
 string library = "";
 string symbol = "";
 string type = "";
 bool usage = false;
 while ((c = getopt(argc, argv, "l:s:t:h")) != -1) {
  switch (c) {
  case 'l':
   library = optarg;
   break;
  case 's':
   symbol = optarg;
   break;
  case 't':
   type = optarg;
   break;
  case '?':
   cerr << "Unrecognized option: -" << static_cast<char> (optopt)
     << endl;
  case 'h':
   usage = true;
   break;
  }
 }

 if (usage) {
  //TODO
  return 2;
 }

 DynamicLib lib(library.c_str());

 if(type == "int") {
  cerr << "Symbol value (as int) is: " << lib.get_symbol<int> (symbol.c_str()) << endl;
 }
 if(type == "function") {
  cerr << "Symbol value (as return of function [int ()] ) is: " << lib.get_symbol<int (*)()> (symbol.c_str())() << endl;
 }
 return 0;
}
{% endhighlight %}


The hardest one to understand here is possibly the function pointer.  Basically I'm asking for a pointer to a no-argument function that returns an integer `int (*)()`.  I then immediately call this function for a value to place in cerr.

Ok, now we need a shared-library to test out.  Here's my dummy .cpp that I compiled into a .so (I leave that as an excersie to the user).

{% highlight cpp %}
extern "C" {
 int MY_VAL = 5;
 int MY_FUNC() { return MY_VAL; }
}
{% endhighlight %}

Onto our outputs:
{% highlight console %}
>  Debug/cpp-types -l ../dummy-shared-lib/Debug/libdummy-shared-lib.so -s MY_VAL -t int
Symbol value (as int) is: 5
>  Debug/cpp-types -l ../dummy-shared-lib/Debug/libdummy-shared-lib.so -s MY_FUNC -t function
Symbol value (as return of function [int ()] ) is: 5
{% endhighlight %}

Ok, so this is a little bit limited, but we have it working! YAY!!!?


In conclusion, I really want to get back into Scala again.  The type system seems a little bit less verbose, and the language itself is less clunky.

__Note: I later updated this to pull string-literals out of libraries.  The fun part there was realizing that a symbol pointer to  a string literal is *really* a `[char**]` that needs to be dereferenced (carefully).  Basically I wrote a specialized `std::string` specialization of `get_symbol` that would perform the checks/casts and return a `string`.  The key to testing this was ensuring that the `char*` literal would wind up in the symbol table of the output `.so`.  This means you should make a dummy function that returns it, otherwise it may be optimized away.  Enjoy!__
