---
title: How Debezium Kafka Streams Can Help You Write Cdc Solution
summary: 'I had worked on multiple applications for enterprises where legacy applications have been migrated on modern technology stack. Starting…'
date: 2018-05-23
draft: false
## If your image is within the project start the url with `./src/images/`
postImage: https://source.unsplash.com/5mZ_M06Fc9g/920x460
postImageCredits: Roman Mager | https://unsplash.com/@roman_lazygeek
postImageSource: Unsplash | https://unsplash.com
publications: https://medium.com/@iamninad/how-debezium-kafka-streams-can-help-you-write-cdc-solution-1d5781e0af91
tags:
  - sample
---

I had worked on multiple applications for enterprises where legacy applications have been migrated on modern technology stack. Starting this year I am working on one such application.

The way to design such application is hard because one cannot simply take the entire big complex application and migrated to a new one, it's always better to do it part by part (baby steps). The new application is divided into two parts- read-side and write-side. Considering a part to migrate, the read side of the application is being migrated at first. The consumers will read the data from the new application however, all the write-side operations will still be performed using the legacy application. However, once we have received the certainty that the new application is working as anticipated, the other side of the legacy application will migrate to the new technology stack.

With such decisions in mind, it becomes extremely important for the new application to sync the data from the old one and provide the exact results back to the consumer. For this innovative platform, technology shift in regards to the database is being made though, the older application works with Oracle Database. Now having a [CDC](https://en.wikipedia.org/wiki/Change_data_capture) (change data capture) solution that puts all the changes happening inside the old database to this new database platform becomes crucial. What could be a better way than to use Kafka as a messaging platform and process it using Kafka Streams?

To explore this idea and getting more understanding of how to manage the data flow I found Debezium which does exactly what I was looking for, a CDC solution to migrate data from source to destination using Kafka and I considered using MySQL and MongoDB for keeping the tutorial simple.

So, this post is all about setting MySQL, MongoDB, Confluent Kafka, Avro Schema Registry and Configuring Debezium. Once everything is setup we will write a simple application using Scala that could capture real-time changes in MySQL and publish those as Document in MongoDB.

## 1. Installation

### MySQL And MongoDB

For this tutorial, both MySQL and MongoDB are needed. Download and install the binaries based on OS version from below given links:

- MySQL [download](https://www.mysql.com/downloads/)
- MongoDB [download](https://www.mongodb.com/download-center?jmp=nav#community)

### Confluent Kafka

Kafka binaries are needed so that debezium can listen to MySQL changes and push them to Kafka topics. Download the confluent Kafka package from [here](https://www.confluent.io/download/) and extract it. Also, don't forget to set environment variable `PATH` to point to the binaries.

### Debezium

The Confluent Kafka package will come with some default connectors available. However, we will need the debezium MySQL connector for this tutorial, download it from [here](https://repo1.maven.org/maven2/io/debezium/debezium-connector-mysql/0.7.5/debezium-connector-mysql-0.7.5-plugin.tar.gz) then extract the jars in a folder and copy the folder at `share/java/` inside confluent Kafka directory.

## 2\. Start Confluent Platform

Once you will extract out the confluent binaries and place the debezium jars at the right place you have to execute the following command to start confluent

```shell-session
> confluent up
Using CONFLUENT_CURRENT: /var/folders/y7/j6zgy2w13g1fjljkgb8mdc4r0000gn/T/confluent.2GgyNcVE
Starting zookeeper
zookeeper is [UP]
Starting Kafka
kafka is [UP]
Starting schema-registry
schema-registry is [UP]
Starting Kafka-rest
kafka-rest is [UP]
Starting connect
connect is [UP]
Starting ksql-server
ksql-server is [UP]
```

As you can see the command start zookeeper, Kafka, schema-registry and Kafka-connect. You can read more about schema-registry, kafka-connect on confuent docs [here](https://docs.confluent.io/current/?_ga=2.178768998.354855723.1527094165-1244062922.1523460392). Once you see that everything is started properly without any error head to [http://localhost:8083/connector-plugins](http://localhost:8083/connector-plugins) to see if the debezium MySQL plugin is showing in the list as

```json
{
  "class": "io.debezium.connector.mysql.MySqlConnector",
  "type": "source",
  "version": "0.7.5"
}
```

If the output in the browser is not, as shown above, it means you have missed something or the debezium jars folder is not placed on the right path.

## 3\. Configure MySQL & MySQL Connector

Before the Debezium MySQL connector starts monitoring the changes committed to MySQL database, the server must be set up to use row-level binary logging and have a database user with appropriate privileges. If MySQL is configured to use global transaction identifiers (GTIDs), then the Debezium connector can more easily reestablish connection should one of the MySQL servers fail.

### Enabling the binlog

The MySQL server must be configured to use a row-level binary log, which is described in more detail in the MySQL documentation. This is most often done in the MySQL server configuration file, and will look similar to the following fragment:

```ini
[mysqld]
server-id         = 223344   # any random number
log_bin           = mysql-bin
binlog_format     = row      # use row or ROW
binlog_row_image  = full     # use full or FULL
expire_logs_days  = 10
gtid_mode                 = on   # (optional)
enforce_gtid_consistency  = on   # (optional)
```

### Create User For MySQL Connector

For the connector to listen to the database changes and monitor the logs it requires USER with `SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, RELICATION CLIENT` access privileges. Login to your MySQL console using `$ mysql -u root -p` with the password you have given at the time of installation and run the below command to create a user named `debezium` with password `dbz`

```sql
mysql> GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'debezium' IDENTIFIED BY 'dbz';
```

### Configure MySQL Connector For The Database

I have created a `moviesdemo` database with two tables `movies` and `sales`. The `movies` tables consist of all the movies and the `sales` consist of the total number of movie ticket sold. The idea behind using these two tables is to make the tutorial simple and easy and also to show how two related tables get processed in stream processing.

When the movie row is being inserted in the movies table within the same transaction `sales` table row also gets inserted with a starting value of `0`.

To make the debezium Kafka connector to listen to the changes happening on the `moviesdemo` project we will need to provide configuration settings to the connector. A `POST` request in the following format to the URL `http://localhost:8083/connectors` will register the connection settings to the debezium utility. Make sure to provide the same username and password that you used while configuring the mySQL.

```json
{
  "name": "moviesdemo-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "tasks.max": "1",
    "database.hostname": "localhost",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.server.id": "184054",
    "database.server.name": "dbserver1",
    "database.history.kafka.bootstrap.servers": "localhost:9092",
    "database.history.kafka.topic": "dbhistory.moviesdemo"
  }
}
```

Head to `http://localhost:8083/connectors/moviesdemo-connector` using web browser to see configurations been done properly and if so, your Debezium connector is now ready to listen to any changes happening to MySQL moviedemo database.

## 4\. Kafka Topics

Open MySQL console using `$> mysql -u debezium -p`, and try to insert one row in both `movies` and `sales` table. Make sure auto-commit is being turned off and commit explicitly using `mysql> commit;` 😊

> Note: Make sure you have created a database named `moviesdemo` in MySQL along with two tables `movies` and `sales` the DDL scripts for both of the tables are [here](https://gist.github.com/ninadingole/cfd3683c5d65dec9a232c8604963f2ed)

If you have seen your kafka topic list you will find that there are two topics created as below

```shell-session
$ ./bin/kafka-topics --zookeeper localhost:2181 --list
__confluent.support.metrics
__consumer_offsets
_confluent-ksql-default__command_topic
_schemas
connect-configs
connect-offsets
connect-status
connect-statuses
dbhistory.inventory
dbserver1
dbserver1.moviesdemo.movies
dbserver1.moviesdemo.sales
```

## 5\. Generating Business Event Using Kafka Streams

I wrote a simple Kafka stream program in Scala that reads from both the two Kafka topics `movies` and `sales`, joins the two messages based on `movie_id` and then create a business event which is published to `events` Kafka topic.

The program is easy to understand. It works on two business cases `Insertion` & `Updates` to both the table. However, I left deletion logic implementation for the readers.

```scala
private def buildMovieStream: KStreamS[String, movie.Envelope] = {
    import AppSerdes.movieSerde.consumed
    builder.stream[String, movie.Envelope](Utils.getTopic("movies"))
  }

  private def buildMovieSalesStream = {
    import AppSerdes.movieSalesSerde.consumed
    builder.stream[String, Envelope](Utils.getTopic("sales"))
  }

  val movieStream = buildMovieStream
  val saleStream  = buildMovieSalesStream

  private def filterSalesStreamForCreations = {
    saleStream
      .filter((id, value) => {
        println("filtering sales creation message")
        value.op.equalsIgnoreCase("c")
      })
  }

  def createMovieBusinessEvent = {
    import AppSerdes.movieBEventSerde.{joined, salesSerialized}
    val movieFilteredStream = new MovieCreatedFilter().filter(movieStream)
    val salesFilteredStream = filterSalesStreamForCreations

    val envelopExtractedMovie: KStreamS[Int, Movie] =
      movieFilteredStream.map((id, value) => (value.after.get.movie_id.get, value.after.get))
    val envelopeExtractedSale = salesFilteredStream.map((id, value) => (value.after.get.movie_id.get, value.after.get))

    envelopExtractedMovie.join(envelopeExtractedSale, (movie: Movie, movieSale: MovieSales) => {
      println("Created Business Event")
      val serializer = new KafkaAvroSerializer()
      serializer.configure(schemaConfig, false)
      val movieSerialized = serializer.serialize(Utils.getTopic("movie"), AppSerdes.movieBEventSerde.movieFormat.to(movie))
      val salesSerialized =
        serializer.serialize(Utils.getTopic("movie_sales"), AppSerdes.movieBEventSerde.saleFormat.to(movieSale))

      val map = Map("movie" -> movieSerialized, "sale" -> salesSerialized)
      BusinessEvent(EventTypes.`MOVIECREATEEVENT`, map)

    }, JoinWindows.of(3000))
  }

  def emitMovieBussinessEventToTopic = {
    import AppSerdes.movieBEventSerde.eventProduced
    createMovieBusinessEvent.to("events")
  }

  emitMovieBussinessEventToTopic

  def createMovieUpdateEvent = {
    val updateStream = new MovieUpdateFilter().filter(movieStream)
    updateStream.map((id, envelop) => {
      val before = envelop.before.get
      val after  = envelop.after.get

      val serializer = new KafkaAvroSerializer()
      serializer.configure(schemaConfig, false)

      val beforeMovieSerialized = serializer.serialize("events", AppSerdes.movieBEventSerde.movieFormat.to(before))
      val afterMovieSerialized  = serializer.serialize("events", AppSerdes.movieBEventSerde.movieFormat.to(after))

      (after.movie_id.get,
       BusinessEvent(EventTypes.`MOVIEUPDATEEVENT`, Map("before" -> beforeMovieSerialized, "after" -> afterMovieSerialized)))
    })
  }

  def emitMovieUpdateEvent = {
    import AppSerdes.movieBEventSerde.eventProduced
    createMovieUpdateEvent.to("events")
  }

  emitMovieUpdateEvent
```

When you run the above program it will start listening to the movies & sales topic and will create event objects for any insert or update operation at MySQL side.

## 6\. Updating MongoDB Based On Business Events

This code that you see below reads the business events from the `events` topic and inserts or updates MongoDB collection. This code is also written using Kafka Streams in Scala and is pretty straightforward to understand.

It reads the topic, deserialize the message and checks which type of business event is present. Based on the event type it will change the records in the MongoDB movies collection.

```scala
def buildEventStream = {
    import AppSerdes.movieBEventSerde.eventConsumed
    builder.stream[Int, BusinessEvent]("events")
  }

  private val eventStreams: KStreamS[Int, BusinessEvent] = buildEventStream

  def filterEventsByType(eventType: String): KStreamS[Int, BusinessEvent] = {
    eventStreams.filter((_: Int, event: BusinessEvent) => event.eventType.equalsIgnoreCase(eventType))
  }

  filterEventsByType(EventTypes.`MOVIECREATEEVENT`).foreach((id, event) => {

    val value = new MovieCreatedEventDeserializer(event).get
    if (value.isDefined) {
      val doc = value.get
      movies.insertOne(document = doc).toFuture().onComplete(_ => println(s"Inserted ${doc}"))
    }

  })

  filterEventsByType(EventTypes.`MOVIEUPDATEEVENT`).foreach((id, event) => {
    val movie: Option[Document] = new MovieUpdateEventDeserializer(event).get
    val movieDocument           = movies.find(Filters.eq("movie_id", movie.get.getInteger("movie_id")))
    movieDocument.toFuture().map(_.head).onSuccess {
      case data => {
        val document = movie.get.toBsonDocument
        println(s"Relpacing Movie Information ${movie.get.get("movie_id").get.asString()}")
        document.put("sales", data.get("sales").get)
        movies
          .replaceOne(Filters.eq("_id", data.getObjectId("_id")), document)
          .toFuture()
          .onSuccess {
            case data => println("Movie Information Updated")
          }
      }
    }

  })
```

This completes the tutorial on how debezium can help you design change data capture solutions. Hope you guys like it and for any questions or doubt please do comment on this post I will surely get back.

Also, Please don't forget to share the post using the share link and do subscribe to the blog by which you will get the next blog post right into your mailbox. This also helps me to track the users following the blog 😀.

Stay tuned & Happy Coding!

---

## Reference Links:

- [Debezium Docs](http://debezium.io/docs/)
- [Code @Github](https://github.com/ninadingole/kafka-streams)
- [Confluent Docs](https://docs.confluent.io/current/?_ga=2.178768998.354855723.1527094165-1244062922.1523460392)
