---
layout: post
title: Setting up an Ubuntu Development Server
category/categories: ubuntu
---
Well, we're off to a rocky start.  First off, the Ubuntu server kernel expects a particular processor extension that does not exist in the virtualbox emulation:  [see here for a fix](https://bugs.launchpad.net/ubuntu/+source/linux/+bug/216784).

Anyway, after a little shell magic, we're up and running.  NOW for software.  You need to apt-get the following (not exhaustive) list:

    trac apache2 libapache2-mod-wsgi svn python python-pysqlite2 openssl maven ant tomcat5.5 libapache2-mod-jk

Now, to test out some of said software.  First, make sure you're using some reasonable networking scheme.  If you're lame like me and used NAT because you didn't want another interface just now (or you really didn't know what you were doing at the time), the Help for virtual box provides you a method of doing port forwarding from the host to the client.  You need to restart the virtual-box GUI after you're done.

#### Creating a directory for the project
Run the following:

{% highlight bash %}
mkdir /path/to/my/project
{% endhighlight %}

#### Setting up Subversion
Run the following:

{% highlight bash %}
svnadmin create /path/to/my/project/svn
{% endhighlight %} 

Obviously replacing the path.

*There's some more magic we have to do here eventually (and integrate in with Apache).  I'm going to cover this later, as I'm running out of steam.*

#### Installing Trac
you need to set up a trac project:

{% highlight bash %}
mkdir /path/to/my/project/trac
trac-admin /path/to/my/project/trac initenv
{% endhighlight %}

Enter a project name.  I took all defaults except for Subversion location (`/path/to/my/project/svn`).

You then need to make a file for the WSGI module, mine looks like the following:

{% highlight python %}
import os

os.environ['TRAC_ENV'] = '/path/to/my/project/trac'
os.environ['PYTHON_EGG_CACHE'] = '/path/to/my/project/trac/eggs'

import trac.web.main
application = trac.web.main.dispatch_request
{% endhighlight %}

My file is called `main.wsgi` and is located in `/path/to/my/project/trac`.

#### Apache Configuration 

Now it's time to edit apache configuration (I'm lazy soo....)
 
{% highlight bash %}
sudo vi /etc/apache2/sites-available/default
{% endhighlight %}

Ok, inside here we need to change the app to be our TRAC project...

THEN we need to give apache ownership of the TRAC files...

{% highlight bash %}
chown -R www-data /path/to/my/project/trac
{% endhighlight %}

You now have Trac running on Apache (with an SVN repository).

#### Trac Plugins

Of course no software distribution is complete without the mandatory downloading of plugins.  Trac is no exception.  Let's pick out some fun ones:

* [ContinuTrac](http://dev.rectang.com/projects/continutrac) - Continuum integration.  We'll work with this *after* we install continuum on tomcat.
* [GraphViz](http://trac-hacks.org/wiki/GraphvizPlugin") - Yes... I can make intersting graph-like structures that will be pretty and amaze people from 1980! (Actually I *love* graphviz wiki plugins)
* [WebAdmin](http://trac.edgewall.org/wiki/WebAdmin) - A necessary web admin console.  Has a lot of plugins into *it*
* [TagsPlugin](http://trac-hacks.org/wiki/TagsPlugin) - Folksonomy, or Release Tagging or Neither... you figure it out
* [ScreenshotsPlugin](http://trac-hacks.org/wiki/ScreenshotsPlugin) - Can has Bling Pix?  Kthx
* [TracDownloaderPlugin](http://trac-hacks.org/wiki/TracDownloaderPlugin) - For Actually releasing products for download.  (vs. libraries via Archiva)


So... if I ever get enough time I might place some script around all this to auto-generate the svn repostiory, trac directory and apache configuration, along with default installs of the plugins.  That way you can make new projects quickly and easily AND get all the nice management features (which is the major point of maven).

#### So... What did we get this episode?

* Source Code Repository (At least visualizing. More work later for http/https access).
* Issue Tracker
* Project Wiki
* File Release System (with some plugin work)


Not bad eh?  If we add the "magic project creation script" with a web front end, we might even have something to fight sourceforge with.  But onto the *real* meat of this server... the nice Maven integration.
