+++
title = "Dead simple Kubernetes home setup"
date = 2026-09-19
slug = "dead-simple-kubernetes-home-setup"

[taxonomies]
categories = ["kubernetes", "homelab"]
+++

Hello Internet. It's been a hot minute since I used to write here. Life got crazy,
with personal tragedy and changing jobs and demands on my free time, I just didn't
have the energy to write, but also there were important things I wanted to spend
my time on: Family, Friends, Health. I encourage anyone who's a chronically online
or open-source advocate to take the time they need to for themselves, for their
lives offline, and health.

That said, I've recently been doing a lot of tinkering, experimenting and learning,
as has the entire Software industry - being thrown on its head by AI. This has led to,
for myself, a dramatically increased velocity of personal projects. I have a lot I'd
love to share, but first - a bit about those personal projects.

Recently, I took a foray into building out some home infrastructure. Why?
Two reasons - Quota and Learning. The first—running out of GitHub Actions quota—was
a big impetus for me. I'm building out a game, and my GitHub Actions tests for
a private repo were exhausting my quota in the first week of the month, with ~$5-10 per week
in action fees. Doing that math with my subscriptions, we're talking ~$500 / year
if I continued down the path I was going.

SO - I decided it was time to look into alternatives *and* I've been using a lot
more k8s for work and OpenTelemetry. I decided to purchase a refurbished Dell
OptiPlex (~$300) and turn it into a single-node k8s cluster, upon which I can start
hoisting my unbridled enthusiasm (and pet projects). This was less than the
expected yearly bill of github actions!

### The "Pet Infrastructure" Trap

Herein lies the danger - Does this new cluster *become* the hobby, or will
I be able to continue working on, e.g. my board game monte-carlo simulations?

I wanted a no-fuss system that I could get up and running that would accelerate
my personal projects, not cause me to tinker around.

A few things enable this for me:

1. I have sufficient kubernetes knowledge for managing systems, I can spot / preempt maintenance areas.
2. I was willing to isolate the cluster and give Agents full debugging access to it. 
   It's not used for production, just personal - however there's still danger here (more on that in separate blog)
3. Talos Linux - A product I'm extremely pleased with.

Getting the kubernetes cluster up and running with Talos was mere minutes. Getting the cluster to
actually talk to GitHub Actions and be a viable Action Runner (ARC) took an entire evening - a lot
of debugging.

Let's look at the actual *hard* decisions that had to be made - and you can evaluate if I've turned
this into a "pet" or not at the end of the article.

### Dead Simple, Native Kubernetes

[Talos Linux](https://www.siderolabs.com/talos-linux) is a no-fuss, minimal operating system that's designed to be kubernetes natively. Accessing your
box is done through `talosctl` (similar to `kubectl` but with different functions).  The entire OS is setup and configured similar to k8s, with resources
and YAML files. 

What I really like - is this:

- Flashing a box takes minutes
- Pushing config brings a new box to the same state as a previous box.
- Forcing all interaction to be through declarative config, means disaster recovery is easier.
- Super minimal footprint / overhead compared to other solutions for k8s.

For example, on my laptop I can now run the following:

```bash
$ talosctl get mounts
NODE             NAMESPACE   TYPE          ID          VERSION   SOURCE      TARGET   FILESYSTEM TYPE
192.168.86.243   runtime     MountStatus   EPHEMERAL   1         /dev/sda4   /var     xfs
```

There's a variety of "node level" resources and controls you can use to inspect the machine.

You can then use all your favorite kubectl commands, e.g here's the current load on the box:

```bash
 kubectl top node
NAME            CPU(cores)   CPU(%)   MEMORY(bytes)   MEMORY(%)
talos-s13-64i   363m         6%       2032Mi          6%
```

> Note: When using GitHub Actions - so far - CPU tends to spike to 100%, memory to ~30%.

Within minutes I was literally moving from "setting up the box" to "fitting kubernetes deployments and services on the box".

### Secrets and Painless Disaster Recovery

The catch with Talos is that the machine config (e.g. `taloscfg/controlplane.yaml` which describes your control plane nodes)
*also* contains cluster PKI certs. You can't just check them in plaintext into git and say "I'm safe".

My workflow now is to have a script which pushes this file into a secret manager (e.g. 1password, google secret manager), and
another script which can pull that down on new machines. Anytime I make changes to the node (I'm still running 1 box, so it's a control plane),
I need to push my disaster recovery to a *secret manager*.

I then have all my configuration for the kubernetes cluster stored in git. I believe, on failure of this node, I could
purchase a new node and have it running in ~1 hr. This really is a huge win compared to previous "home lab" setups I've done
that basically were configure once, forget everything, never use after failure.

One of the patterns I use here is to make sure any manual configuration steps, if possible, are done via a `job` that runs after a service is stood up,
e.g. for MinIO (blob storage) on the device - I have a job which will update its configuration:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: minio-init-buckets
  namespace: caching
spec:
  template:
    spec:
      ...
      containers:
        - name: ...
          ...
          command:
          - /bin/sh
          - -c
          - |
            echo "Here is my initial setup commands..."
            echo "We first wait for minio to be reachable, then issue `mc` commands"
```

### My new "Pet": Storage Choices

The biggest "gotcha" I had with Talos was actually choosing storage. For
GitHub Actions - I wanted to re-use caching, and this is relatively easy with
MinIO and gha-cache-server. However - I ran into a lot of issues because it
turns out I did *not* understand kubernetes storage options well *and*
persistent volume claims on Talos were odd.

The initial plan was to use Rancher's `local-path-provisioner` since I'm on
a single node. The issue was that this was the limit of what I understand
for kubernetes. I'd never had to dive *past* persistent volume declarations
and mounts on services - to actually understand how the provisioning works.

The short answer is - it didn't.

This is where agents came in - both helpful and possibly a little overzealous.
I was able to get them to debug the issue and offer me options, but at this point
I realized I had some things I need to think about, else this turn into a "pet"
infrastructure project:

- If I want persistent volumes to be shared across nodes, I need some way to
  provision them so all nodes see them, some distributed file storage. Given I only
  have one node now, this is overkill, but it's now in the back of my mind
- The fact Talos has read-only root (it's baremetal), means some expectations on 
  mounts were wrong in the system. Gemini and Claude helped get this sorted, BUT
  I'm still not certain if their solution isn't bloated misinterpretation. It
  *seems* like the solution so far has been 100% in local-path-provisioner, but
  there's also a usage of `extraMounts` we had to make inside Talos machine config.

The good news is - the fix I have is repeatable on new machines. It works, I believe
it will continue to, and I was able to get 90% of my private builds migrated from GitHub
Actions remote runners to my custom runner, and I can now work on my personal projects
without sinking money (beyond my subscription) into GitHub.

The bad news is - this *may* still become a pet project for me. There's a heavy
temptation to go figure out how to optimize the kubernetes cluster - which was
not the point of it.

### Wrapping Up

Setting up your own kubernetes cluster is *dead simple* with Talos. I was floored
at how fast I was able to spin one up, and how minimal / low overhead the cluster
is for the machine. At the rate my hobbies are ramping up, I may purchase another
refurbished box in a year or so to scale out capacity, as I'm already at ~50% of
what I expect this box can handle at a sustained rate.

I *would* recommend anyone doing heavy hobby project activity spin up your own Talos
box - and use declarative config for your setups.