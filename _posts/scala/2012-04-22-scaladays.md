---
layout: post
title: ScalaDays 2012
category: scala
---

I thought I'd do a quick recap of ScalaDays from my perspective.  ScalaDays has always been a great event, and this one was no exception.

However, before going to the bits about my impressions and talks, I'll dump the links to the two talks I gave.   Yes, that's two talks.  I was grabbed in the hallway and told a speaker didn't show.  Dumbly I said, "Why don't we find someone to go up and distract the audience before the next talk?"  This, of course, meant that *I* was the someone to distract the audience.   So, I hastily gave a version of the Effective Scala presentation (this one without all the nervous "right"s).

I also gave a talk on Binary Resilience.  The first three slides tell the story of how *defining* binary compatibility is the hard.  After that it's just a matter of highlighting the issues and showing some alternatives to avoid `java.util.Date` issues.  (That is, an issue where you can't remove an obviously bad class because it breaks binary compatibility).

## Effective Scala ##

  * [video](http://skillsmatter.com/podcast/scala/effective-scala)
  * [slides](https://docs.google.com/presentation/pub?id=1VjKahh5CMSZ9sKdmHD5HSaO2sloPUKne_yxcnjWYyZk&start=false&loop=false&delayms=3000)

## Binary Resilience ##

  * [video](http://skillsmatter.com/podcast/scala/binary-resilience)
  * [slides](https://docs.google.com/presentation/pub?id=16E5veHv4Kh3w4t-MjkiHSsjXrqjwvH0Lf8rSN-I23mQ&start=false&loop=false&delayms=3000)
  * [project](https://github.com/jsuereth/binary-resilience)

# Recap #

Well, in the interest of not wasting everyone's time, I decided I'd pick out three things that struck me.  These aren't the three most important things, just the first three I resolved out of introspection.  *Maybe* that means they're the three biggest things that hit me, may not.  So, in no particular order:

## SkillsMatter is awesome ##

[SkillsMatter](http://skillsmatter.com/) organized the event this year, and did a wonderful job.  They're changing the game for tech conferences.  They had a live podcast of the conference for people to watch talks *and* they posted many talks live almost immediately after shooting.  This helped folks not at the conference keep up with releases and news and such.  Not only that, the conference ran very smoothly and the action never stopped.  The value of any conference is not just the talks, but the *interaction* with the speakers and attendees.  I don't think live videos lesson the attendance of these events, since most people know the value is the *people* not the presentation.  SkillsMatter figured this out and brings more interaction, even for those not at the conference.

If you're going to run a tech conference, talk with SkillsMatter.  Not only is everyone (i met) who works for them nice/friendly/amazing, they have some rockin anime.  If you're feeling left out of ScalaDays, go check out the [talks](http://skillsmatter.com/event/scala/scala-days-2012)

## Scala usage is on the rise ##

There were a lot more people at the conference than in previous years.  Not only that, lots of people *actively* using scala at work.  I thought I was lucky to bag a typesafe job, but many of these people are doing really interesting work with Scala.  I learned a lot just talking with the folks and seeing what was high prioirty.   We all know compiler speed is important, but I would say that was the #1 thing discussed in hallway conversations.  This has its own implications.  With more of us using Scala, we're past the honeymoon phase and starting to dig into the real issues in the language and look for solutions.

## The Scala Community is growing ##

There was a time where I felt I knew all the projects going on in the Scala community.  This year's ScalaDays proved that I can't even delude myself into thinking that anymore.  The diversity of talks, the quality of the talks and the *complexity* described in each talk showed how far into each topic the community is diving.  We're well past "thin wrappers on Java" and "What is the cake pattern".  The downside is we need more intro or entry-level talks.  Given the size, I think we need some talks for people to learn how to use technologies, like lift, play, rogue, mongo, akka, scalaz, etc.  The community is rich, and we need to teach people the areas they may not be able to follow.

# Fin #

Basically, Scaladays was pretty amazing.  I spent most of my days talking with folks and my evenings catching up on talks I missed (thankfully published online).  It was exhausting, but well worth it.








