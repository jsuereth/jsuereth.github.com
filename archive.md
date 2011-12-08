---
layout: default
title: Josh Suereth
---


# All Posts #

<ul class="post-list">
{% for post in site.posts %}
  <li><a href="{{ post.url }}">{{ post.title }}</a> <span class="date">( {{ post.date | date: "%b %Y" }} )</span></li>
{% endfor %}     
</ul>

![Scala In Depth](http://www.manning.com/suereth/suereth_cover150.jpg) Scala In Depth is going through the final production phases!  Expect the remaining chapters soon.
