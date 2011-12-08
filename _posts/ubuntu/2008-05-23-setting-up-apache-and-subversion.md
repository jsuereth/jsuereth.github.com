---
layout: post
title: Setting up Apache and Subversion on Ubuntu
category/categories: ubuntu
---

Now onto setting up SVN and apache. 


First off, make sure libapache2-svn is installed.  Now to the configuration in `/etc/apache2/mods-available/dav_svn.conf`

Mine looks like this:

{% highlight text %}
<Location /svn/project>
  DAV svn
  SVNPath /path/to/my/project/svn

  AuthType Basic
  AuthName "Subversion Repository"
  AuthUserFile /etc/apache2/dav_svn.passwd
  <LimitExcept GET PROPFIND OPTIONS REPORT>
    Require valid-user
  </LimitExcept>
</Location>
{% endhighlight %}

Note: I'm doing something stupid here.  I'm create *ONE* repository for my project as opposed to using `SVNParentPath` where you could have multiple repositories later.  Yes, this is just for one project.  We'll go back and fix later.  (It's a virtual machine remember!)


Next, create a password:

{% highlight bash %}
htpasswd2 -c /etc/apache2/dav_svn.passwd josh
{% endhighlight %}

Now, onto our SVN repository.  Let's give apache access (while we're at it, let's fix the group from last time too)

{% highlight bash %}
sudo chown www-data:www-data -R /projects
{% endhighlight %}

Ok, now to throw some random thing in the repostiory and make sure you can see it:

{% highlight bash %}
sudo su www-data
cd /some/place/safe
mkdir tmp
touch tmp/README
svn import /some/place/safe/tmp file:///path/to/my/project/svn
{% endhighlight %}

Alright... now we restart apache (`/etc/init.d/apache2 restart`) and it should be up and running!  if you're like me shoot over to `http://localhost:8888/svn/project` and you should see your SVN repostiory.  (you should also make sure TRAC sees it).

Well, I think we accomplished something here!  Now (if your box is on the net) you can start adding code and tracking changes.  Unfortunately we have a little bit more to do before I'm ready to start my project, and that little bit is the maven infrastructure.


#### Side note:

I was hoping Trac could manage our passwords for SVN (and create new repositories), but it looks like that's a no.  Oh well, once again we'll see how annoying it gets.  If it gets too annoying, I'll make an extension.  I'm hoping to find an alternative to gforge that I can host internally to a company.
