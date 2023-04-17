---
title: Keep Watch On Sql Query In Intelli J Goland Or Data Grip
excerpt: "Learn how to monitor SQL query results in Jetbrains products like IntelliJ/Goland or Data Grip."
date: 2023-04-17
draft: false

tags:
  - jetbrains
  - intellij
  - goland
  - database

templateEngineOverride: njk, md
---

Are you an Intellij, Goland or DataGrip User? Like me, are you running the SQL statements every time you want to see the
change reflected on the table?

If Yes, I found a small trick in Intellij and DataGrip that could watch your SQL query results. It was always there but
I overlooked it. Once I discovered it, it changed my life for debugging or development.

It’s not a trick actually 😅 but a feature built within the IntelliJ products. It could easily go ignored but let’s see
how to use it

When you run any query you will see the Result window below:

![Result Window](/images/keep-watch-on-sql-query-in-intelli-j-goland-or-data-grip/result-window.png 'Result Window')

You would see this clock icon in the toolbar that does all the trick. It was always there but I never thought it would
be so useful 😍

![Clock Icon](/images/keep-watch-on-sql-query-in-intelli-j-goland-or-data-grip/clock-icon.png 'Clock Icon')

When you click on it, the below options would be available. Each choice you select will refresh the query results after
the selected delay.

{% Gif "/images/keep-watch-on-sql-query-in-intelli-j-goland-or-data-grip/predefined-options.png" %}

A small tip to remember is to make sure you “Pin” 📌 the result window. When you do it, you could run other queries along
with the watch window.

The below video shows a small demo of this feature. In the demo, I am watching the result of a SELECT query. When I
update a record it is shown in the result window without running the SELECT query again.

![Demo](/images/keep-watch-on-sql-query-in-intelli-j-goland-or-data-grip/demo.gif 'Demo')

`5s` seems long? What if I want to keep the watch period lower than `5s`? You could use the `Custom` option provided.
With
this, you could also monitor your query changes at a 1s rate interval

![Custom](/images/keep-watch-on-sql-query-in-intelli-j-goland-or-data-grip/custom.png 'Custom')

Well, that's all for this post. I hope next time this small utility will come in handy for you. Don’t run the query
every time to see the change. IntelliJ tools are a powerhouse of such small utilities which are very easily ignored by
us.

Thanks! and Happy Coding!
