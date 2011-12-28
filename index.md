---
layout: default
title: Josh Suereth
---


# Welcome #

This is the landing page for all my nerdery.  I hope you enjoy.


{% highlight scala %}
object ScalaInDepth extends Book {
  def url = "http://www.manning.com/suereth"
}

object Scalatypes extends Podcast {
  def url = "http://www.scalatypes.com"
  def cohosts = Seq("Daniel Spiewak", "Yuvi Masory")
}

object BigNerd extends Career {
  def company = "http://typesafe.com"
}
{% endhighlight %}

{% assign first_post = site.posts.first %}

# Latest - {{ first_post.title }} #

{{ first_post.content | truncatewords: 250 }}


[Read More &raquo;]({{ first_post.url}})




