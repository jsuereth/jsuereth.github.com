---
layout: post
title: SBT and Plugin design
category: scala
---
Sbt 0.10 brings *a lot* of power to the table.   SBT 0.10 switched from a class/inheritance based build system into a more functional approach.   For those who aren't familiar, here's the quick spiel on SBT.

## Basics of SBT ##

In SBT, a project is composed of `Setting[_]` values.  A Setting is sort-of a name-value pair (more of a name *computation* pair).  In the SBT command-line you can type the name of a setting and get its value (or computed value).   For example, test is a task in SBT that you can type in the command line.   The setting's computation is executed and the value returned.   This setting may depend on other settings for its value.

SBT provides a simple way to construct a project.   In the root directory, any `*.sbt` file is compiled to `Setting[_]` values.   A `Setting[_]` is two things:   A name (`Key` + `Scope`) and a Value (or computation, called `Initialize` in SBT).  One can construct a `Setting[_]` via the SBT dsl:

    sourceDirectory in Compile <<= baseDirectory apply { dir =>
      dir / "src" / "main" / "scala"
    }

In this example, the `sourceDirectory` Key (name) is assigned an Initailzation (value/computation).  The `<<=` operator is used to construct a `Setting[_]` by joining a Key and an Initialiation.  In the above example, the Initialization is constructed to pull the current value of the baseDirectory key and modify it for the value of the sourceDirectory key. 

Note: The `apply` method is used on `baseDirectory` because both `baseDirectory` and `sourceDirectory` are `SettingKey[_]`s.  SBT distinguishes between three types of `Setting[_]` values:  `Setting`, `Task` and `InputTask` with corresponding `SettingKey`, `TaskKey` and `InputKey` "name" types.  The three are distinguished as follows:

* `SettingKey` - Something that is computed *once* on project load (or reload). like a val.
* `TaskKey` - Something that is computed each time it is called, like a def.
* `InputKey` - Something that takes user input to perform its task.

## Configurations ##

SBT uses a configuration matrix to define the same task against different configurations.   For example, SBT defines a task for compiling Scala code called compile.  This mechanism has a bunch of required settings.   However, it wouldn't be DRY to repeat all these settings for compiling *test* code as well.  So instead, SBT defines the *same* settings in two different configurations, on called Test and another called Compile.  To compile just tests in SBT, you can prefix a task with its configuration, e.g. `test:compile`.

## Plugin Design ##

So what does this have to do with plugin design?  SBT plugins need to integrate `Setting[_]` values into a build without conflicting with SBT default settings and other plugins.  To complicate matters, SBT imports all the members of plugin classes into scope of a project using a wildcard import.   This means all the plugins you use could have conflicting names that step on each other.   Combined with potentially conflicting key names, plugins need to be very careful with how they define things.

Having worked on several plugins recently, I'd like to outline a strategy that I think achieves a certain elegance in definition and usage, as well as the safety one wants from a plugin.

The basic pattern is as follows.   Define an object with the name you want for your plugin *inside* the Plugin class.   For example, if I want a `xsbt-suereth-plugin`, I would define the following:

    import sbt._
    import Keys._
    
    object SbtSuerethPlugin extends Plugin {
    
      object suereth {
         // Your code here
      }
    }

Inside of the suereth object I hide all my definitions and code.   This isolates my plugin from other sbt plugins, as long as no one names their methods "suereth".

Next, let's define a new Config object that we can use to protect our keys from other plugins.

    object suereth {
      val Config = config("suereth")
      // Your settings here
    }

The Config also shares the name of the plugin, so in the command line tasks and settings can be run using `suereth:<your-task-here>`. 

The next step is define whatever custom keys your plugin will use.  Let's create a blog key.

    object suereth {
       ...
       val blog = SettingKey[String]("blog", "location of the blag") in Config
    }

The key is automatically placed into the suereth configuration using the in method.  This has two benefits:

When defining the Initialization for a `Setting[_]`, there's no need to continue writing `blog in Config`.
Users of the plugin can directly access `suereth.blog` without needing to specify `suereth.blog in suereth.Config`.
Note:  You can also reference SBT keys in your configuration by writing: `val sources = Keys.sources in Config`.

Finally, we can provide default values/computations for tasks and settings in our plugin.   By convention, calling these settings is a good idea.

    object suereth {
       ...
       lazy val settings: Seq[Setting[_]] = Seq(
          blog := "http://suereth.blogspot.com"
       )
    }

Notice how the keys are access directly but are actually in the appropriate config matrix.   This helps defining your plugin source code, but will also help users of your plugin.   Let's look at what a build.sbt file will be for this plugin.

    seq(suereth.settings:_*)
    
    suereth.blog := "http://blog.typesafe.com"

Notice how the settings for this plugin are completely namespaced by the `suereth` object.   We've tied the concept of a "configuration"  axis for keys with accessing values in an object. 

I find this mechanism of defining plugins both helpful from a development perspective and a user perspective.   Curious to hear what others think.
