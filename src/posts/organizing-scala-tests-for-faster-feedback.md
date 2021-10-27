---
title: Organizing Scala Tests For Faster Feedback
summary: "Writing tests is a developer's mundane task, and when you follow practices like TDD or BDD, hardly you find any code without any test…"
date: 2019-03-18
draft: false
postImage: './src/images/organizing-scala-tests-for-faster-feedback/swift_test_run.png'
publications: https://medium.com/@iamninad/organizing-scala-tests-for-faster-feedback-ba0039357ff9
tags:
  - sbt
  - scala
  - testing-strategy
  - integration-tests
  - scalatest
  - unit-test
---

Writing tests is a developer's mundane task, and when you follow practices like TDD or BDD, hardly you find any code without any test cases. We all might have seen the testing pyramid in agile and if not then you can read this [blog](https://martinfowler.com/articles/practical-test-pyramid.html) by Martin Fowler on the testing pyramid.

![testing pyramid by 360logica](/images/organizing-scala-tests-for-faster-feedback/test-pyramid.png 'testing pyramid by 360logica')

In short and crisp, tests gets divided into three categories: <em>unit test, integration/service test, and e2e/UI tests</em>. The unit test validates the functionality of each class and written on per class basis, integration test checks for the functionality of module with external systems like database, web service, and UI/e2e test the entire business flow or UI flow.

As you can see from the test pyramid, we should have more integration test than e2e test and more unit test than the integration test. The reason for having less integration and e2e tests is "time"; Integration test and e2e test interacts typically with other systems which are external or internal like in-memory DB or clusters. These tests take time to execute and are often slower.

And not to mention we have our CD/CI pipelines which run these tests and generate our code artifact. We also want our CI to provide us faster feedback by running these test individually, so we don't have to wait longer if there is an issue at the unit level.

Currently, I am working on a Big Data project which includes frameworks like Spark, HBase, Kafka, HDFS, etc. Some of our unit tests are independent of any spark code, and some unit test does require spark context, but they do not interact with external systems like HDFS and HBase. Moreover, integration test, runs an in-memory HBase cluster, in-memory mini dfs cluster and spark of course :P. Now, these integration test shares the single running clusters amongst them and executes sequentially.

We have SBT as the build tool and, we have disabled the parallel execution of tests which makes the entire test suite including the unit test to run slower. I am struggling with that sometimes have to wait for 10-15mins to get the feedback about my code changes, running unit tests also runs integration test which takes time for cluster initialization of HBase and HDFS, and I was seriously looking for some alternative to this issue. Seldom I do comment out my integration suite code only to run the unit test which is again a wrong way. We need some mechanism to organize our tests such that we can execute them separately as a suite of unit, integration and e2e tests and, we only have parallel execution disabled for integration and e2e tests. It would provide developers with quick feedback by just running the unit tests.

In this post, I am going to share my findings on how to organize the tests and configure sbt (<strong>v1.2.8</strong>) such that it enables us to run these different scala test independently without any code hacks or commenting your test cases which is a more of an ugly way.

## Integration Test

Integration Test setting comes default in SBT. It's just a matter of configuring the modules with these settings in the build.sbt

```scala
lazy val module1 = (project in file("module1"))
  .configs(IntegrationTest)
.settings(
Defaults.itSettings,
  libraryDependencies += scalatest % "it,test"
)
```

Adding "it, test" at the end of dependencies enables that lib to be available to both standard unit test &amp; integration test packages. After this, you have a new location to write an integration test.

```vim
src/it/scala
src/it/java
src/it/resources
```

I have created an integration test per module and placed in the above location now to execute the integration test use `IntegrationTest / testOnly` or `it:test` in SBT console, and the output as:

```log
[info] Compiling 1 Scala source to /Users/neenad/codes/tutorials/scala/sbt-learnings/module1/target/scala-2.11/it-classes ...
[info] Run completed in 9 milliseconds.
[info] Total number of tests run: 0
[info] Suites: completed 0, aborted 0
[info] Tests: succeeded 0, failed 0, canceled 0, ignored 0, pending 0
[info] No tests were executed.
this is a integration test
[info] Module2IntegrationTest1:
[info] - integration test
[info] Run completed in 194 milliseconds.
[info] Total number of tests run: 1
[info] Suites: completed 1, aborted 0
[info] Tests: succeeded 1, failed 0, canceled 0, ignored 0, pending 0
[info] All tests passed.
[info] Done compiling.
module1 integration test
[info] Module1IntegrationTest:
[info] - integration test
[info] Run completed in 134 milliseconds.
[info] Total number of tests run: 1
[info] Suites: completed 1, aborted 0
[info] Tests: succeeded 1, failed 0, canceled 0, ignored 0, pending 0
[info] All tests passed.
[success] Total time: 2 s, completed 17 Mar, 2019 5:52:42 PM
```

## End-To-End Tests

Like integration test end-to-end configuration is not provided by SBT. We would need to create them and apply to the module. I have created an E2E object in the `project` folder and, the contents are as below:

```scala
import sbt.{Configuration, Defaults, Test, inConfig}
import sbt._
import sbt.Keys._

object E2E {
  final val E2ETest = Configuration.of("EndToEndTest", "e2e") extend (Test)
  final val e2eSettings =
    inConfig(E2ETest)(e2eConfig)
  lazy val e2eConfig =
      Defaults.configSettings ++ Defaults.testTasks ++ Seq(
    scalaSource in E2ETest := baseDirectory.value / "src" / "e2e" / "scala",
    javaSource in E2ETest := baseDirectory.value / "src" / "e2e" / "java",
    resourceDirectory in E2ETest := baseDirectory.value / "src" / "e2e" / "resources",
  )
}
```

Now apply these settings to your modules and add `e2e` to the library dependencies as we did with the integration test

```scala
lazy val module1 = (project in file("module1"))
  .configs(IntegrationTest)
  .configs(E2ETest)
.settings(
  E2E.e2eSettings,
  Defaults.itSettings,
  libraryDependencies += scalatest % "it,test,e2e",
    name := "module1",
  version := "0.1"
)

lazy val module2 = (project in file("module2"))
  .configs(IntegrationTest)
  .configs(E2ETest)
  .settings(
    Defaults.itSettings,
    libraryDependencies += scalatest % "it,test,e2e",
      E2E.e2eSettings,
    name := "module2",
    version := "0.1"
  )

lazy val root = (project in file("."))
  .configs(IntegrationTest)
  .configs(E2ETest)
  .aggregate(module1, module2)
  .enablePlugins(Common)
  .settings(
    E2E.e2eSettings,
    Defaults.itSettings,
    libraryDependencies += scalatest % "it,test,e2e"
  )
```

we can now create our e2e tests inside the following folders

```vim
src/e2e/scala
src/e2e/java
src/e2e/resources
```

To run the e2e test use `EndToEndTest / test` or `e2e:test` in sbt. This command runs only the integration test as shown below:

```log
[info] Run completed in 10 milliseconds.
[info] Total number of tests run: 0
[info] Suites: completed 0, aborted 0
[info] Tests: succeeded 0, failed 0, canceled 0, ignored 0, pending 0
[info] No tests were executed.
this is e2e test
[info] Module1E2ETest:
[info] - module1 e2e test
[info] Run completed in 172 milliseconds.
[info] Total number of tests run: 1
[info] Suites: completed 1, aborted 0
[info] Tests: succeeded 1, failed 0, canceled 0, ignored 0, pending 0
[info] All tests passed.
module2 e2e test
[info] Module2E2ETest:
[info] - module2 e2e test
[info] Run completed in 250 milliseconds.
[info] Total number of tests run: 1
[info] Suites: completed 1, aborted 0
[info] Tests: succeeded 1, failed 0, canceled 0, ignored 0, pending 0
[info] All tests passed.
[success] Total time: 1 s, completed 17 Mar, 2019 5:53:46 PM
```

## Unit Test?

Now, what remains are the unit tests and configuring the unit tests is relatively straightforward. You don't have to do anything at all. 😄 Any test under package `src/test/scala` gets considered as a unit test and to execute it you have to use your standard `test` task in sbt, this runs all the unit test in your module:

```log
[info] Compiling 1 Scala source to /Users/neenad/codes/tutorials/scala/sbt-learnings/module1/target/scala-2.11/test-classes ...
[info] Run completed in 9 milliseconds.
[info] Total number of tests run: 0
[info] Suites: completed 0, aborted 0
[info] Tests: succeeded 0, failed 0, canceled 0, ignored 0, pending 0
[info] No tests were executed.
module2 sample unit test
[info] Module2UnitTest:
[info] - sample test
[info] Run completed in 202 milliseconds.
[info] Total number of tests run: 1
[info] Suites: completed 1, aborted 0
[info] Tests: succeeded 1, failed 0, canceled 0, ignored 0, pending 0
[info] All tests passed.
[info] Done compiling.
module1 sample unit test
Hello World
[info] Module1UnitTest:
[info] - sample test
[info] Run completed in 142 milliseconds.
[info] Total number of tests run: 1
[info] Suites: completed 1, aborted 0
[info] Tests: succeeded 1, failed 0, canceled 0, ignored 0, pending 0
[info] All tests passed.
[success] Total time: 2 s, completed 17 Mar, 2019 6:06:45 PM
```

## Disabling Parallel Execution:

To disable parallel execution of the e2e test in our code add below line in our E2E settings

```scala
E2ETest / parallelExecution := false
```

##Code:

<script src="https://gist.github.com/ninadingole/b5bab2423a507d4b38376c51954b4aed.js"></script>

---

## Resources

- [SBT Reference](https://www.scala-sbt.org/1.x/docs/)

I hope this post helps you to organize your tests such that you get faster feedback by running tests independently and don't have to survive the pain I went through in your project. If you have any doubt, please comment and don't forget to share it.
