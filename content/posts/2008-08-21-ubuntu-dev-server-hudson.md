+++
title = "Ubuntu Dev. Server - Setting up hudson"
date = 2008-08-21
slug = "ubuntu-dev-server-hudson"
aliases = [
    "/ubuntu/2008/08/21/ubuntu-dev-server-hudson.html",
    "/ubuntu/2008/08/21/ubuntu-dev-server-hudson/",
    "/2008/08/21/ubuntu-dev-server-hudson.html",
    "/2008/08/21/ubuntu-dev-server-hudson/"
]

[taxonomies]
categories = ["ubuntu"]
+++

I've decided to switch from using Continuum for Continuous Integration to Hudson.  This is based on a suggestion from a friend.  We'll see how things turn out.

So first, I'm going to list here (because I continually have to look it up) how to install Tomcat5.5 and Apache2 on Ubuntu server and wire the `mod_jk` forwarding up.

First, install `apache`, `tomcat` and `mod_jk`

```bash
sudo apt-get install apache2 tomcat5.5 libapache2-mod-jk
```

Next create a workers.properties file (mine is in `/etc/apache2/workers.properties`).  Here's what mine looks like:

```text
worker.list=worker1
worker.default.port=8009
worker.default.host=localhost
worker.default.type=ajp13
worker.default.lbfactor=1
```

Next, make sure there's a sym-link in `/etc/apache2/mods-enabled` to `/etc/apache2/mods-available/jk.load`.

Now that we know mod-jk is loaded on apache startup, it's time to actually set up apache to forward appropriately.  I edited my `apache2.conf` file (instead of `available-hosts/default`).  Why?  No real reason.  In fact this should probably be moved into `available-hosts/default`, but for now I'll just show you the relevant apache configuration to write in the worker you specified above:

```text
# Tomcat Configuration
JkWorkersFile /etc/apache2/workers.properties
JkMount /hudson/* worker1
```

Note that I'm only mounting the hudson directory.  This means that I'm only forwarding to tomcat for the tomcat application.  This is because I'm using apache to host my subversion repository AND trac AND hudson (and archiva in the future).

Finally, we have to turn off (or configure) java security for tomcat 5.5 in ubuntu.  I'm turning it off because I'm lazy and I don't plan to place my dev box outside my internal network.  The basic just to turn it off is to open your `/etc/init.d/tomcat5.5` file and look for the following line: `TOMCAT5_SECURITY=yes`.   Change the "yes" to "no" and you should be ready to go.  For more details check the link [here](http://www.nabble.com/Re%3A-java.lang.NoClassDefFoundError%3A-org-quartz-CronExpression-p13139289.html)


### Installing Hudson

First of, download the hudson war into tomcat's webapps directory - 

```bash
sudo wget http://hudson.gotdns.com/latest/hudson.war
```



Next, set up a directory for hudson.  I made one in tomcat's directories:

```bash
cd /var/lib/tomcat5.5
sudo mkdir hudson
sudo chown tomcat5.5 hudson
```

Now, you need to add the following line somewhere in the beginning of `/etc/init.d/tomcat5.5` -

```bash
JAVA_OPTS="${JAVA_OPTS} -DHUDSON_HOME=/var/lib/tomcat5.5/hudson"
```

Now, restart tomcat and apache; Hudson should be working at `http://youraddress/hudson/`
