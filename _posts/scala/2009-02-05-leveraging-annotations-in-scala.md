---
layout: post
title: Leveraging Annotations in Scala
category: scala
---

This post began as a discussion on #scala about how people define a public "getter" method and private "setter" method using only defs and vars in scala.  The usual method in scala is:

{% highlight scala %}
class MyClass {
   private var x_private: Int = _
   def x = x_private
}
{% endhighlight %}

The downside to this is that you have two names to express one concept.  I'm at the point where I'm no longer caring too much about public/private parts of classes, but I thought I'd tackle the problem to exercise my new-found compiler skills.  It turns out this feat is pretty easy to accomplish via a scalac plugin.

To create your first plugin you should follow the guide [here](http://www.scala-lang.org/node/140).  We'll be using the Maven as our build tool, since to do otherwise would be blasphemy (for me).

To start off with, here's the POM file for our plugin:

{% highlight xml %}

<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
 <modelVersion>4.0.0</modelVersion>
 <groupId>org.scala-lang</groupId>
 <artifactId>private-setter-scalac-plugin</artifactId>
 <packaging>jar</packaging>
 <version>1.0-SNAPSHOT</version>
 <name>Var definition extensions for the scala compiler</name>
 <url>http://suereth.blogspot.com</url>
 <repositories>
  <repository>
   <id>scala-tools.org</id>
   <name>Scala-tools Maven2 Repository</name>
   <url>http://scala-tools.org/repo-releases</url>
  </repository>
 </repositories>
 <pluginRepositories>
  <pluginRepository>
   <id>scala-tools.org</id>
   <name>Scala-tools Maven2 Repository</name>
   <url>http://scala-tools.org/repo-releases</url>
  </pluginRepository>
 </pluginRepositories>
 <dependencies>
  <dependency>
   <groupId>org.scala-lang</groupId>
   <artifactId>scala-compiler</artifactId>
   <version>2.7.3</version>
  </dependency>
 </dependencies>
 <build>
  <plugins>
   <plugin>
    <groupId>org.scala-tools</groupId>
    <artifactId>maven-scala-plugin</artifactId>
    <executions>
     <execution>
      <goals>
       <goal>add-source</goal>
       <goal>compile</goal>
       <goal>testCompile</goal>
      </goals>
     </execution>
    </executions>
    <configuration>
     <jvmArgs>
      <jvmArg>-Xms64m</jvmArg>
      <jvmArg>-Xmx1024m</jvmArg>
     </jvmArgs>
    </configuration>
   </plugin>
   <plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>shitty-maven-plugin</artifactId>
    <executions>
     <execution>
      <goals>
       <goal>clean</goal>
       <goal>install</goal>
       <goal>test</goal>
      </goals>
     </execution>
    </executions>
   </plugin>
  </plugins>
 </build>
</project>

{% endhighlight %}

There's a few things in this pom, mostly to ensure that the scala-tools repositories are available too us.  Also, ignore the shitty (Super-Helpful-Integration-Testing-ThingY) plugin for now.  The most important part is that we're compiling to a jar file, and we're depending on the scala-compiler.   The version of the compiler we depend on is the *only* version of scala your plugin should be used with.  In all reality, the scala-compiler should probably be deifned as a 'provided' dependency and the scala-library should explicitly be depended on, but for now we'll cheat on completeness.

Next we need to make sure there is a `scalac-plugin.xml` file in the created JAR. This is simple in maven, just place one in the `src/main/resources` directory.   Here is what my `src/main/resources/scalac-plugin.xml` looks like:

{% highlight xml %}
<plugin>
  <name>private-setters</name>
  <classname>org.scala_lang.privateSetter.internal.privateSetterPlugin</classname>
</plugin>
{% endhighlight %}

You'll notice I'm naming my plugin "private-setters" and placing it in a "internal" package.   This could be my eclipse plugin development rubbing off, but this helps me know what only the compiler should see.

Next we need a way for clients of our plugin to "notify" us that they want a var with a private setter method (@varname_=@), but public getter (@varname@).   Here's my initial cut at client syntax:

{% highlight scala %}
import org.scala_lang.privateSetter._
class TestWidget {
  @privateSetter
  var myVar = 5
}
{% endhighlight %}

Pretty simple really, but effective.  (Also I already know how to look up annotations from my scala-mojo-support project, so it only took me a few hours to work out the scalac plugin details.   This post actually took the most amount of time in the whole venture).

Now we need to define the @privateSetter@ annotation we can use in our classes.  It's a fairly simple file:

{% highlight scala %}
package org.scala_lang.privateSetter
class privateSetter extends StaticAnnotation {
}
{% endhighlight %}

Next we need to write the plugin itself.  All plugins contain some boiler-plate code, so we'll ignore that for the time being. __(see the [documentation mentioned above](http://www.scala-lang.org/node/140))__.  The truly interesting part of this plugin is the newly defined phase.

For some history, the Scala Compiler (scalac) is composed of various "phases".  Each phase has a responsibility it performs.  Some phases are easy to identifier e.g. `icode` which converts the AST to icode for each "compilation unit".  In the Scala Compiler a compilation unit corresponds to a source code file and may produce multiple class files.  Here's the `scalac -Xlist-phases` output on my machine:

{% highlight console %}
$ scalac -Xshow-phases
namer
typer
superaccessors
pickler
refchecks
liftcode
uncurry
tailcalls
explicitouter
erasure
lazyvals
lambdalift
constructors
flatten
mixin
cleanup
icode
inliner
closelim
dce
jvm
sample-phase
{% endhighlight %}

On to our implementation!  The basic structure of our phase looks like this:

{% highlight scala %}
    class MakeSettersPrivatePhase(prev: Phase) extends Phase(prev) {
      
      override def name = VarAccessChanger.this.name
      import global._
      override def run {
 for (unit <- global.currentRun.units; if !unit.isJava) {
           unit.body = TreeTransformer.transform(unit.body)      
 }
      }
      ...
}
{% endhighlight %}

I'll mention that this class is nested inside an outer "Plugin" class which is passed the 'global' object.  For those of you unfamiliar with the compiler, the "Global" object is the outer layer of the "cake" pattern used by the Scala Compiler.  I'm reserving judgment on Global, but I have noticed that it's very hard to unit test any "module" you write for Global (as most of them have the `self:Global =>` syntax).  

The Transformer is a very nice class for doing AST manipulation (thanks DRM for suggesting it).   This class simply transforms the AST from one form to another.  It's perhaps the easiest way to implement our plugin.  Let's set up a Tree Transformation that does absolutely nothing useful:

{% highlight scala %}
      object TreeTransformer extends Transformer {

        override def transform(tree: Tree) = tree match {
         case t =>         
           super.transform(t)
        }
      }
{% endhighlight %}


The structure here is we override the transform method.  This method takes a tree and returns a tree.  We want to transform *only* the setter part of a var method if it contains the privateSetter annotation.   Let's apply our pattern matching skills to the test with an extractor:  The "AnnotationSetterShouldBePrivate" extractor.

{% highlight scala %}

object AnnotatedSetterShouldBePrivate {

  def unapply(node : Tree) : Option[DefDef] = {

    def hasPrivateSetterAnnotation(annotations : List[Annotation]) : Boolean = {
      for {
           annotation <- annotations
           if annotation.tpe.safeToString == classOf[privateSetter].getName
      } {
        return true
      }
      false
    }
    
    node match {
      case x @ DefDef(mods,name,_,_,_,_) if name.toString.endsWith("_$eq") =>
         if(hasPrivateSetterAnnotation(mods.annotations)){
            Some(x)
         } else {
            None
         }
      case _ => None
    }
  }
}
{% endhighlight %}

First, note that our extractor (unapply method) takes in a tree and returns a DefDef.  DefDef is the AST class for a "def" node.   All var's are parsed into dual "def" methods (setter and getter).  We define a helper method that takes a list of annotations and looks for our "privateSetter" annotation.   The actually implementation of the extractor matches against the tree node, checks to see if it's a DefDef and has a tailing name of "_$eq".   "_$eq" is the mangled form of "_=" which is the convention for scala setter methods.  Note that I probably could move the if/else statement into the pattern match on the DefDef, but wasn't feeling adventurous enough this evening.  In the case where we find a valid annotated setter DefDef method, we return it, otherwise return None.

Now that we have our extractor, writing the tree transformation becomes fairly simple:

{% highlight scala %}

object TreeTransformer extends Transformer {
    
  override def transform(tree: Tree) = tree match {
      case AnnotatedSetterShouldBePrivate(d @ DefDef(mods,name,tparams,vparams,tpt,impl)) => 
          import symtab.Flags._
          val tree = copy.DefDef(d, mods | PRIVATE,name,tparams,vparams,tpt,transform(impl))
          tree.symbol.setFlag(PRIVATE)              
          tree
      case t =>
          super.transform(t)
  }
}
{% endhighlight %}

As you can see, we're combining our "AnnotatedSetterShouldBePrivate" extractor with the natural extractor for the DefDef case class so that we can pull out all the constructor variables (along with the DefDef itself using the `d @` syntax).  Initially I tried returning just a newly constructed DefDef with "mods | PRIVATE" instead of "mods" in the constructor.  You'll find this blows up horribly.   The main issue is that the AST nodes contain *more* than just their constructor values (types and symbols being the two things I found).   The Transformer class provides a "copy" value/object that you can use to "copy" various parts of the tree.   The copy class contains a method for every tree node that takes an original tree and overriding constructor values.  For our purposes, we're applying the PRIVATE flag to the "mods" attribute of the `DefDef` and two the symbol flags for the `DefDef`.  The symbol flags are what are eventually used in the icode->bytecode conversion code.

Next we should choose what phase to run this plugin after.  I've chosen the `typer` phase, as this ensures we at least have an AST and the types are correct.  When defining a class in isolation, this is working perfectly.  However when defining the class and using it with other classes, I'm running into the difficulty where the methods I'm modifying are eventually being replaced with public methods of a differing names.  To look into this, we should set up some integration tests.  NOW we can use the SHITTY plugin!

The maven shitty plugin allows you to execute "integration" projects that depend on the currently "building" project.   You simple create a directory in src/it, add a pom.xml that depends on your project (with a version of "testing"), and a goal.txt that describes which maven goals should be executed.   If the integration project's maven build succeeds, the overall project's maven build continues.  If an integration project's maven build fails, the entire build fails.  This works great for "positive" tests (or test where you make sure that things compile with your plugin).   Let's define a relatively simple positive test.   First, we take the class outlined earlier as our example syntax:

{% highlight scala %}
package org.scala_lang.privateSetter

class privateSetter extends StaticAnnotation {

}
{% endhighlight %}

Next we create a pom file for this integration test:

{% highlight xml %}
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
 <modelVersion>4.0.0</modelVersion>
 <groupId>org.scala-tools</groupId>
 <artifactId>testPrivateSetter</artifactId>
 <packaging>jar</packaging>
 <version>1.0-SNAPSHOT</version>
 <name>test-privateSetter-scalac-plugin</name>
 <dependencies>
  <dependency>
   <groupId>org.scala-lang</groupId>
   <artifactId>private-setter-scalac-plugin</artifactId>
   <version>testing</version>
  </dependency>
  <dependency>
   <groupId>junit</groupId>
   <artifactId>junit</artifactId>
   <version>4.5</version>
   <scope>test</scope>
  </dependency>
 </dependencies>
 <build>
  <plugins>
   <plugin>
    <groupId>org.scala-tools</groupId>
    <artifactId>maven-scala-plugin</artifactId>
    <executions>
     <execution>
      <goals>
       <goal>add-source</goal>
       <goal>compile</goal>
      </goals>
     </execution>
    </executions>
    <configuration>
     <compilerPlugins>
      <dependency>
       <groupId>org.scala-lang</groupId>
       <artifactId>private-setter-scalac-plugin</artifactId>
       <version>testing</version>
      </dependency>
     </compilerPlugins>
     <args>
      <arg>-verbose</arg>
     </args>
    </configuration>
   </plugin>
  </plugins>
 </build>

 <repositories>
  <repository>
   <id>scala-tools.org</id>
   <name>Scala-tools Maven2 Repository</name>
   <url>http://scala-tools.org/repo-releases</url>
  </repository>
 </repositories>
 <pluginRepositories>
  <pluginRepository>
   <id>scala-tools.org</id>
   <name>Scala-tools Maven2 Repository</name>
   <url>http://scala-tools.org/repo-releases</url>
  </pluginRepository> 
  <pluginRepository>
   <id>snapshots.scala-tools.org</id>
   <name>Scala-tools Maven2 Snapshot Repository</name>
   <url>http://scala-tools.org/repo-snapshots</url>
  </pluginRepository>
 </pluginRepositories>

</project>
{% endhighlight %}

You'll notice we're making us of the "testing" version of our plugin AND the "compilerPlugin" configuration option of the maven-scala-plugin.   This option is new to the (not yet released except as a SNAPSHOT) 2.10 version, and allows you to depend on any number of scalac plugins during your build.  We're using it now to depend on our build.  Our goals.txt simply consists of "clean compile".  

Another thing that the SHITTY plugin lets you do is provide a 'validate.groovy' file with your pom.xml and goals.txt.   This file is run after a build to ensure things were successful.   We can use this to ensure our generated classfiles have private setters.  We'll tackle that problem another day (I'm currently being lame and running javap on the .class files).

I think I've typed as much as I can for one night, I'll try to cover the remaining pieces (after I code/finish them) later.  Once again, there are some issues with the plugin as I'm confusing the hell out of some of the compiler phases (not to mention being confused myself as to where things happen in some cases).  If you'd like to look at the source (and perhaps contribute? ), it's available on github: <a href="http://github.com/jsuereth/private-setter-scalac-plugin/tree/master">private-setter-scalac-plugin</a>
