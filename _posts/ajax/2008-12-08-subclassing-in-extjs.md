---
layout: post
title: Subclassing in ExtJS
categories: ajax extjs
---

It's been a while since I posted about ExtJS, so I thought I'd take a crack at another post here.  This is going to cover the `Ext.extend` method, and how you go about sub-classing an Ext component.

The basic just is that we are going to create a "constructor" method for the widget and bind it to a location (e.g. `Ext.ux.data.MyDataStore`).  Then we're going to use `Ext.extend` to plug in the methods of the parent objects, and override some at the same time.

For our example, I'll be using the `Ext.data.DataProxy` class as what we're extending.

So... first, let's define our constructor in a location:

{% highlight js %}
//Ensures there are at least dummy objects leading into Ext.ux.data
Ext.namespace('Ext.ux.data');

Ext.ux.data.MyProxy = function(config){

    Ext.ux.data.MyProxy.superclass.constructor.call(this);

};
{% endhighlight %}

The code doesn't do a whole lot, but we have our constructor.  However when executing `new Ext.ux.data.MyProxy()` we get an error, superclass is *not* defined.  So... where does superclass come from?  It will actually be injected into our prototype via the `Ext.extend` method.   In fact, `Ext.extend` will also inject the methods "override" and "extend" into our class.  Here's our new class with the `Ext.extend` call:


{% highlight js %}
//Ensures there are at least dummy objects leading into Ext.ux.data
Ext.namespace('Ext.ux.data');

Ext.ux.data.MyProxy = function(config){

    Ext.ux.data.MyProxy.superclass.constructor.call(this);

};

Ext.extend(Ext.ux.data.MyProxy, Ext.data.DataProxy);
{% endhighlight %}

Now we can make use of DataProxy methods from within MyProxy using `this.methodName(args)`.   This isn't very exciting yet because DataProxy is mostly an empty class (besides configuring the Observable class for us).

The convention for adding methods into a subclass is to use the override parameter from `Ext.extend`.   This parameter is essentially an anonymous class containing methods to inject "over-top" of the parent class.  In the case where the method did not exist before, it is merely inserted.  Let's implement the `load` method (required for `DataProxy` subclasses) using this approach:

{% highlight js %}
//Ensures there are at least dummy objects leading into Ext.ux.data
Ext.namespace('Ext.ux.data');

Ext.ux.data.MyProxy = function(config){
    //Calls our super-class (Ext.data.DataProxy) constructor for full initialization
    Ext.ux.data.MyProxy.superclass.constructor.call(this);

};

Ext.extend(Ext.ux.data.MyProxy, Ext.data.DataProxy, {

   //Load function as defined in HttpProxy, and needed for the "DataProxy interface..."
   load: function(params, reader, callback, scope, callbackArg) {
         params = params || {}; //Ensure params exists as an object
         var result;
         try {
            //Use record reading to read "stock" data
            result = reader.readRecords({ zombieKid: ['i', 'like', 'turtles'] });
         } catch(e) {
           //We had an issue pulling in stock data, fire appropriate events
           //use callback in fail mode and bail.  This function is actually coming from
           // the Observable class which is our "grandparent" class
            this.fireEvent("loadexception", this, callbackArg, null, e);

            callback.call(scope, null, callbackArg, false);

            return;
         }
         //Inform the callback of the result of parsing our "stock" data
         callback.call(scope, result, callbackArg, false);         
   }

});
{% endhighlight %}

As you can see... our load method is basically taking the reader (Record reader) passed in and attempting to read some stock data (calling appropriate callbacks as necessary).

Notice the use of the `this.fireEvent` inside our method.  Because of how JavaScript handles resolution, this will refer to our fully constructed class at the time of invocation ( as opposed to definition), therefore the `fireEvent` method from `Observable` will be accessable from our object.

The next important thing in defining your own widget is adding information to take in during construction.  Our superclass constructor does not take any arguments, hence the `Ext.ux.data.MyProxy.superclass.constructor.call(this);` in our constructor.  If perhaps our superclass constructor took a config object, we would have to change it.   Luckily our current widget constructor expects a config object, so we can just pass it through to our super (assuming the configs are complementary).


{% highlight js %}
...

Ext.ux.data.MyProxy = function(config){
    //Calls our super-class (Ext.data.DataProxy) constructor for full initialization
    Ext.ux.data.MyProxy.superclass.constructor.call(this, config);
}

...
{% endhighlight %}

Since the `DataProxy` class doesn't take anything in its constructor, we'll remove this, but it's an important feature to make note of.  Also remember you can make subclasses which could add/change configuration information sent to parents.  That's the nice part about having control of the config obejct before passing it to the superclass constructor.

Now onto taking in our own information.  Let's mimic the `MemoryProxy` and take in some data during construction that we using during our "load" method.  We'll call this element 'data' in the config and our object.


{% highlight js %}
//Ensures there are at least dummy objects leading into Ext.ux.data
Ext.namespace('Ext.ux.data');

Ext.ux.data.MyProxy = function(config){
    //Pull out our "data"
    this.data = config.data

    //Calls our super-class (Ext.data.DataProxy) constructor for full initialization
    Ext.ux.data.MyProxy.superclass.constructor.call(this);

};

Ext.extend(Ext.ux.data.MyProxy, Ext.data.DataProxy, {

   //Load function as defined in HttpProxy, and needed for the "DataProxy interface..."
   load: function(params, reader, callback, scope, callbackArg) {
         params = params || {}; //Ensure params exists as an object
         var result;
         try {
            //Use record reading to read "passed in" data
            result = reader.readRecords(this.data);
         } catch(e) {
           //We had an issue pulling in stock data, fire appropriate events
           //use callback in fail mode and bail.  This function is actually coming from
           // the Observable class which is our "grandparent" class
            this.fireEvent("loadexception", this, callbackArg, null, e);

            callback.call(scope, null, callbackArg, false);

            return;
         }
         //Inform the callback of the result of parsing our "stock" data
         callback.call(scope, result, callbackArg, false);         
   }

});
{% endhighlight %}

The above is an almost exact duplicate of `MemoryProxy.js` from the ExtJS source.  I thought about having a more clever tutorial about a custom widget, but I'm trying to avoid assuming too much knowledge of ExtJS internals.  Anyway, I hope this makes you feel more comfortable creating your own classes and extending ExtJS widgets with custom functionality.   As always, let me know if you find any errors or typos.
