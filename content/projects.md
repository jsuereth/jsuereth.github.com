+++
title = "Projects"
slug = "projects"
+++

# Projects & Open Source

An organized index of open source work, separated into core OpenTelemetry leadership, personal open source repositories, and Scala ecosystem projects and books.

---

## OpenTelemetry

I'm a maintainer of **OpenTelemetry**. My primary focus and contributions center on the project's wire protocols, specification, and instrumentation (where I focus on schema tooling and semantic conventions):

| Project | Focus &amp; Contributions | Repository |
| :--- | :--- | :--- |
| **OpenTelemetry Weaver** | Semantic conventions schema engine, multi-language code generation, and live telemetry policy verification written in Rust. | [open-telemetry/weaver](https://github.com/open-telemetry/weaver) |
| **OpenTelemetry Specification** | Core cross-language specification defining tracing, metrics, logging, baggage, and SDK architecture requirements. | [open-telemetry/opentelemetry-specification](https://github.com/open-telemetry/opentelemetry-specification) |
| **OpenTelemetry Protocol (OTLP)** | Specification and protobuf definitions for the vendor-neutral wire protocol used to transmit telemetry. | [open-telemetry/opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto) |
| **Semantic Conventions** | Standardized naming conventions, attribute definitions, and schema models across cloud-native infrastructure and applications. | [open-telemetry/semantic-conventions](https://github.com/open-telemetry/semantic-conventions) |

---

## Personal Open Source Projects

Personal repositories and experiments from [github.com/jsuereth](https://github.com/jsuereth), ordered reverse chronologically by creation date.

These projects all represent some interesting thought experiment or viable path forward for real systems. Some, e.g. sauerkraut and shady-side, were used for feedback to the Scala 3 Language specification. Others, e.g. otlp-mmap, are prototypes that I hope will lead to more optimal instrumentation in OpenTelemetry.

| Project | Status | Created | Description | Repository |
| :--- | :--- | :--- | :--- | :--- |
| **o11y-by-design** | <span class="badge-active">Active</span> | 2025 | Live reference application demonstrating schema-driven telemetry with Weaver (KubeCon). | [jsuereth/o11y-by-design](https://github.com/jsuereth/o11y-by-design) |
| **otlp-mmap** | <span class="badge-active">Active</span> | 2024 | Experimental high-throughput zero-copy memory-mapped file storage for OTLP in Rust. | [jsuereth/otlp-mmap](https://github.com/jsuereth/otlp-mmap) |
| **ottl-proposal** | <span class="badge-past">Past Project</span> | 2024 | A proposal for OpenTelemetry Transformation Language (OTTL) improvements along with a prototype implementation in Rust. | [jsuereth/ottl-proposal](https://github.com/jsuereth/ottl-proposal) |
| **sauerkraut** | <span class="badge-past">Past Project</span> | 2020 | Reimagined compile-time serialization and pickling exploring Scala 3 macro capabilities. | [jsuereth/sauerkraut](https://github.com/jsuereth/sauerkraut) |
| **shady-side** | <span class="badge-past">Past Project</span> | 2019 | Prototype Scala-to-GLSL shader translation pipeline with test scaffolding. | [jsuereth/shady-side](https://github.com/jsuereth/shady-side) |
| **raspberry-potter** | <span class="badge-past">Past Project</span> | 2016 | Harry Potter wand motion detection via Raspberry Pi 3 and IR camera for home automation. | [jsuereth/raspberry-potter](https://github.com/jsuereth/raspberry-potter) |
| **nerdcapture** | <span class="badge-past">Past Project</span> | 2013 | Screen and audio capture utility built using Play Iteratees. | [jsuereth/nerdcapture](https://github.com/jsuereth/nerdcapture) |

---

## Scala Projects & Published Book Example Repositories

Prior to focusing on observability and systems in Rust, I spent a decade working extensively in the Scala ecosystem on build systems, compiler bridges, and language ergonomics.

### Published Books

| Title | Publisher / Year | Description | Links |
| :--- | :--- | :--- | :--- |
| **Scala in Depth** | Manning Publications (2012) | A comprehensive guide to language internals, implicit mechanics, and functional design on the JVM. | [Manning](https://www.manning.com/books/scala-in-depth) &bull; [Code](https://github.com/jsuereth/scala-in-depth-source) |
| **sbt in Action** | Manning Publications (2015) | Co-authored with Matthew Farwell. The definitive manual on build automation and dependency graphs with sbt. | [Manning](https://www.manning.com/books/sbt-in-action) &bull; [Code](https://github.com/jsuereth/sbt-in-action-examples) |

### Tooling & Libraries

| Project | Status | Created | Description | Repository |
| :--- | :--- | :--- | :--- | :--- |
| **visualz** | <span class="badge-past">Past Project</span> | 2017 | Dorking around with various computational and procedural visual generation in Scala. | [jsuereth/visualz](https://github.com/jsuereth/visualz) |
| **cat** | <span class="badge-past">Past Project</span> | 2015 | Essence of the Iterator Pattern code, used during "Introduction to category theory" talk. | [jsuereth/cat](https://github.com/jsuereth/cat) |
| **streamerz** | <span class="badge-past">Past Project</span> | 2015 | Playground of Akka Streams and video processing in Scala. | [jsuereth/streamerz](https://github.com/jsuereth/streamerz) |
| **snark** | <span class="badge-past">Past Project</span> | 2015 | Twitter command line client example for NE Scala 2015. | [jsuereth/snark](https://github.com/jsuereth/snark) |
| **viewducers** | <span class="badge-past">Past Project</span> | 2014 | Exploring Clojure-style Transducers within Scala collection views. | [jsuereth/viewducers](https://github.com/jsuereth/viewducers) |
| **binary-resilience** | <span class="badge-past">Past Project</span> | 2012 | Source code proofs and techniques for maintaining binary compatibility on the JVM. | [jsuereth/binary-resilience](https://github.com/jsuereth/binary-resilience) |
| **scala-cel** | <span class="badge-past">Past Project</span> | 2011 | Scala Community Extension Libraries. | [jsuereth/scala-cel](https://github.com/jsuereth/scala-cel) |
| **scala-arm** | <span class="badge-past">Past Project</span> | 2009 | Automatic Resource Management (ARM) library for Scala. | [jsuereth/scala-arm](https://github.com/jsuereth/scala-arm) |
| **scala-mojo-support** | <span class="badge-past">Past Project</span> | 2009 | Helper toolkit for creating Maven Mojo plugins in Scala. | [jsuereth/scala-mojo-support](https://github.com/jsuereth/scala-mojo-support) |
| **sbt (Simple Build Tool)** | <span class="badge-past">Past Work</span> | &mdash; | Former lead maintainer. Co-architected sbt's client-server model, task engine, and Zinc compiler bridge. | [sbt/sbt](https://github.com/sbt/sbt) |

---

## Joke Projects

Here's a set of random thought experiments or educational projects I shared with the world. Some have interesting lessons in them, e.g. lambda-doge is where I finally created a "real" system with type inference and compilation from scratch, and got a handle on the architectural significance of different compiler designs.

| Project | Status | Created | Description | Repository |
| :--- | :--- | :--- | :--- | :--- |
| **lambda-doge** | <span class="badge-past">Past Project</span> | 2014 | An esoteric, educational language that takes itself seriously. | [jsuereth/lambda-doge](https://github.com/jsuereth/lambda-doge) |
| **evil_monkey** | <span class="badge-past">Past Project</span> | 2014 | Using Scala 2's `Dynamic` for fun and profit. | [jsuereth/evil_monkey](https://github.com/jsuereth/evil_monkey) |
| **protocopter** | <span class="badge-past">Past Project</span> | 2008 | An evolution from lolcode that never did anything. | [jsuereth/protocopter](https://github.com/jsuereth/protocopter) |
