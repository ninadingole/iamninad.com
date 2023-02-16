---
title: Docker Compose For Your Next Debezium And Postgres Project
excerpt: 'Working on Debezium and Postgres? This guide will help you to quick setup the services using docker-compose'
date: 2023-02-04
draft: false
## If your image is within the project start the url with `./src/images/`
postImage: https://source.unsplash.com/GNyjCePVRs8/920x460
postImageCredits: benjamin lehman | https://unsplash.com/@benjaminlehman?utm_source=iamninad.com&utm_medium=referral
postImageSource: Unsplash | https://unsplash.com
tocEnabled: true
tags:
  - docker-compose
  - postgres
  - debezium
---

This is an addition to my docker-compose setup that allows me to test applications locally and quickly. I like running the services that I am building on my Mac because then it is easy to try any scenarios or replicate the reported bugs also, I think the entire CI/CD duration to deploy the change to the staging/test environment sometimes takes more time for testing small stuff _(I am not saying that you should never test services on staging/test env 😅)_.

I am working with Change Data Capture using Debezium recently and this docker-compose helps me to write the consumer application that will process the changes happening at the DB level.

In this post, I will be setting up the Debezium connector for Postgres with all the changes required to allow Debezium to capture the changes. In addition, I will also provide the details on how to make this configuration on the AWS RDS if you are going to use the Debezium Connector for your next project.

The following services would be needed to make the Debezium and Postgres work locally:

- Kafka Broker - `localhost:9092`
- Zookeeper - `localhost:2181`
- Postgres - `localhost:5432`
- Debezium Connector - `localhost:8083`
- Schema Registry - `localhost:8081`
- Debezium UI - `localhost:8080`
- Rest-Proxy - This is optional, but helps with checking cluster metadata, topics etc - `localhost:8082`

## Starting Docker Compose

Below is the docker-compose file I use to start the stack:

```yaml
version: '3.9'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.1
    hostname: zookeeper
    container_name: zookeeper
    ports:
      - '2181:2181'
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    healthcheck:
      test: echo srvr | nc zookeeper 2181 || exit 1
      start_period: 10s
      retries: 20
      interval: 10s
  broker:
    image: confluentinc/cp-kafka:7.3.1
    hostname: broker
    container_name: broker
    depends_on:
      zookeeper:
        condition: service_healthy
    ports:
      - '29092:29092'
      - '9092:9092'
      - '9101:9101'
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://broker:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
      KAFKA_JMX_PORT: 9101
      KAFKA_JMX_HOSTNAME: localhost
    healthcheck:
      test: nc -z localhost 9092 || exit -1
      start_period: 15s
      interval: 5s
      timeout: 10s
      retries: 10
  debezium:
    image: debezium/connect:latest
    restart: always
    container_name: debezium
    hostname: debezium
    depends_on:
      postgres:
        condition: service_healthy
      broker:
        condition: service_healthy
    ports:
      - '8083:8083'
    environment:
      BOOTSTRAP_SERVERS: broker:29092
      GROUP_ID: 1
      CONFIG_STORAGE_TOPIC: connect_configs
      STATUS_STORAGE_TOPIC: connect_statuses
      OFFSET_STORAGE_TOPIC: connect_offsets
      KEY_CONVERTER: org.apache.kafka.connect.json.JsonConverter
      VALUE_CONVERTER: org.apache.kafka.connect.json.JsonConverter
      ENABLE_DEBEZIUM_SCRIPTING: 'true'
    healthcheck:
      test:
        [
          'CMD',
          'curl',
          '--silent',
          '--fail',
          '-X',
          'GET',
          'http://localhost:8083/connectors',
        ]
      start_period: 10s
      interval: 10s
      timeout: 5s
      retries: 5

  schema-registry:
    image: confluentinc/cp-schema-registry:7.3.1
    hostname: schema-registry
    container_name: schema-registry
    depends_on:
      broker:
        condition: service_healthy
    ports:
      - '8081:8081'
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: broker:29092
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081

    healthcheck:
      start_period: 10s
      interval: 10s
      retries: 20
      test: curl --user superUser:superUser --fail --silent --insecure http://localhost:8081/subjects --output /dev/null || exit 1

  rest-proxy:
    image: confluentinc/cp-kafka-rest:7.3.1
    depends_on:
      broker:
        condition: service_healthy
    ports:
      - '8082:8082'
    hostname: rest-proxy
    container_name: rest-proxy
    environment:
      KAFKA_REST_HOST_NAME: rest-proxy
      KAFKA_REST_BOOTSTRAP_SERVERS: 'broker:29092'
      KAFKA_REST_LISTENERS: 'http://0.0.0.0:8082'

  debezium-ui:
    image: debezium/debezium-ui:latest
    restart: always
    container_name: debezium-ui
    hostname: debezium-ui
    depends_on:
      debezium:
        condition: service_healthy
    ports:
      - '8080:8080'
    environment:
      KAFKA_CONNECT_URIS: http://debezium:8083

  postgres:
    image: postgres:latest
    restart: always
    container_name: postgres
    hostname: postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: movies_db
    command: ['postgres', '-c', 'wal_level=logical']
    healthcheck:
      test: ['CMD', 'psql', '-U', 'postgres', '-c', 'SELECT 1']
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - ./scripts:/docker-entrypoint-initdb.d
```

For Debezium to work with Postgres, Postgres needs to have the `logical replication` enabled and if you observe the line `command: ["postgres", "-c", "wal_level=logical"]` we are configuring the Postgres DB to start with `wal_level` as `logical`.

If we don't do this step, then debezium would not be able to capture the changes happening on Postgres. The default `wal_level` is `replica`.

Now we have our docker-compose file ready let's start all the service

```bash
 docker compose -f docker-compose.yml up -d
[+] Running 8/8
 ⠿ Network postgres_default   Created               0.1s
 ⠿ Container postgre          Healthy              12.8s
 ⠿ Container zookeeper        Healthy              11.8s
 ⠿ Container broker           Healthy              22.6s
 ⠿ Container debezium         Healthy              44.2s
 ⠿ Container rest-proxy       Started              23.1s
 ⠿ Container schema-registry  Started              23.1s
 ⠿ Container debezium-ui      Started              44.6s
```

As we could see all the containers have started without any errors. If you are running this command for the first time it would take some time to download all the docker images but the later executions will be faster

## Configure Postgres Connector

At this point, our Debezium connector is running but it doesn't have any task to read changes happening on the Postgres DB. We need to register the Postgres connector using HTTP API so that debezium could read the transaction logs from the server.

It's easy to register the connector, there is a sample connector config already present in the repo. Execute the below `curl` and we would see the connector registered

```bash
curl -X POST --location "http://localhost:8083/connectors" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d @connector.json
```

```json
{
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.dbname": "movies_db",
    "database.history.kafka.bootstrap.servers": "kafka:9092",
    "database.history.kafka.topic": "schema-changes.movies",
    "database.hostname": "postgres",
    "database.password": "postgres",
    "database.port": "5432",
    "database.server.name": "postgres",
    "database.user": "postgres",
    "name": "movies-db-connector",
    "plugin.name": "pgoutput",
    "table.include.list": "public.movies",
    "tasks.max": "1",
    "topic.creation.default.cleanup.policy": "delete",
    "topic.creation.default.partitions": "1",
    "topic.creation.default.replication.factor": "1",
    "topic.creation.default.retention.ms": "604800000",
    "topic.creation.enable": "true",
    "topic.prefix": "postgres"
  },
  "name": "movies-db-connector",
  "tasks": [],
  "type": "source"
}
```

## List Kafka Topics

If there was no issue running the above steps we could confirm that our connector is working fine by checking if the topic is created for `movies` table by the connector.

```bash
❯ kafka-topics --bootstrap-server localhost:9092 --list
__consumer_offsets
_schemas
connect_configs
connect_offsets
connect_statuses
postgres.public.movies
```

As you could see from the above command we have `postgres.public.movies` a topic created by debezium. The topic name pattern is of a type `topic_prefix_config.schema.table` so the prefix is what we configured and the other part is fetched by the debezium from the database schema

## Reading the data

Now we know that the topic is created next we would check the data available on the topic.

There would be data present in the topic because when the connector starts it takes an initial snapshot of the database table. This is a default config named `snapshot.mode` which we didn't configure but is set to `initial` which means that the connector will do a snapshot on the initial run when it doesn't find the last known offset from the transaction log available for the database server, to understand more about this configuration and others read more [here](https://debezium.io/documentation/reference/2.1/connectors/postgresql.html#postgresql-property-snapshot-mode).

```bash
kafka-console-consumer --bootstrap-server localhost:9092 --topic postgres.public.movies --from-beginning
{
	"schema": {
		"type": "struct",
		"fields": [
			{
				"type": "struct",
				"fields": [
					{
						"type": "int64",
						"optional": false,
						"field": "id"
					},
					{
						"type": "string",
						"optional": false,
						"field": "title"
					},
					{
						"type": "int32",
						"optional": false,
						"field": "year"
					},
					{
						"type": "string",
						"optional": false,
						"field": "director"
					},
					{
						"type": "struct",
						"fields": [
							{
								"type": "int32",
								"optional": false,
								"field": "scale"
							},
							{
								"type": "bytes",
								"optional": false,
								"field": "value"
							}
						],
						"optional": false,
						"name": "io.debezium.data.VariableScaleDecimal",
						"version": 1,
						"doc": "Variable scaled decimal",
						"field": "rating"
					}
				],
				"optional": true,
				"name": "postgres.public.movies.Value",
				"field": "before"
			},
			{
				"type": "struct",
				"fields": [
					{
						"type": "int64",
						"optional": false,
						"field": "id"
					},
					{
						"type": "string",
						"optional": false,
						"field": "title"
					},
					{
						"type": "int32",
						"optional": false,
						"field": "year"
					},
					{
						"type": "string",
						"optional": false,
						"field": "director"
					},
					{
						"type": "struct",
						"fields": [
							{
								"type": "int32",
								"optional": false,
								"field": "scale"
							},
							{
								"type": "bytes",
								"optional": false,
								"field": "value"
							}
						],
						"optional": false,
						"name": "io.debezium.data.VariableScaleDecimal",
						"version": 1,
						"doc": "Variable scaled decimal",
						"field": "rating"
					}
				],
				"optional": true,
				"name": "postgres.public.movies.Value",
				"field": "after"
			},
			{
				"type": "struct",
				"fields": [
					{
						"type": "string",
						"optional": false,
						"field": "version"
					},
					{
						"type": "string",
						"optional": false,
						"field": "connector"
					},
					{
						"type": "string",
						"optional": false,
						"field": "name"
					},
					{
						"type": "int64",
						"optional": false,
						"field": "ts_ms"
					},
					{
						"type": "string",
						"optional": true,
						"name": "io.debezium.data.Enum",
						"version": 1,
						"parameters": {
							"allowed": "true,last,false,incremental"
						},
						"default": "false",
						"field": "snapshot"
					},
					{
						"type": "string",
						"optional": false,
						"field": "db"
					},
					{
						"type": "string",
						"optional": true,
						"field": "sequence"
					},
					{
						"type": "string",
						"optional": false,
						"field": "schema"
					},
					{
						"type": "string",
						"optional": false,
						"field": "table"
					},
					{
						"type": "int64",
						"optional": true,
						"field": "txId"
					},
					{
						"type": "int64",
						"optional": true,
						"field": "lsn"
					},
					{
						"type": "int64",
						"optional": true,
						"field": "xmin"
					}
				],
				"optional": false,
				"name": "io.debezium.connector.postgresql.Source",
				"field": "source"
			},
			{
				"type": "string",
				"optional": false,
				"field": "op"
			},
			{
				"type": "int64",
				"optional": true,
				"field": "ts_ms"
			},
			{
				"type": "struct",
				"fields": [
					{
						"type": "string",
						"optional": false,
						"field": "id"
					},
					{
						"type": "int64",
						"optional": false,
						"field": "total_order"
					},
					{
						"type": "int64",
						"optional": false,
						"field": "data_collection_order"
					}
				],
				"optional": true,
				"name": "event.block",
				"version": 1,
				"field": "transaction"
			}
		],
		"optional": false,
		"name": "postgres.public.movies.Envelope",
		"version": 1
	},
	"payload": {
		"before": null,
		"after": {
			"id": 1,
			"title": "The Shawshank Redemption",
			"year": 1994,
			"director": "Frank Darabont",
			"rating": {
				"scale": 1,
				"value": "XQ=="
			}
		},
		"source": {
			"version": "2.1.1.Final",
			"connector": "postgresql",
			"name": "postgres",
			"ts_ms": 1675103983563,
			"snapshot": "first",
			"db": "movies_db",
			"sequence": "[null,\"26612016\"]",
			"schema": "public",
			"table": "movies",
			"txId": 744,
			"lsn": 26612016,
			"xmin": null
		},
		"op": "r",
		"ts_ms": 1675103983739,
		"transaction": null
	}
}
----- more data ommitted for readability purpose -----
```

## Cleanup

By running the below command all the services will be shut down and the resources would be released

```bash
docker compose -f docker-compose.yml -v down
```

Here we specify `-v` option to also remove any volumes created by the docker-compose, this will also free the disk space allocated to the containers

## Debezium UI

Debezium also provides a control dashboard. You could use it to add a new connector instead of using the REST API. The dashboard also provides the functionality to Pause or Restart the debezium task and also to delete the connector

Go to `http://localhost:8080` and you will be able to access the dashboard as shown below

![Debezium Dashboard](/images/docker-compose-for-your-next-debezium-and-postgres-project/connectors.avif 'Debezium Dashboard')

The Dashboard also allows you to add new connectors for other database providers

![Adding new connector](/images/docker-compose-for-your-next-debezium-and-postgres-project/add-new.avif 'Add new Connector')

## AWS RDS

Setting up docker-compose is easy because everything is local and we could use the configuration described by the Postgres documentation.

On AWS, it's a different story, on AWS we have to configure `rds.logical_replication` property in the parameter groups of your Postgres instance. The default value for this property is `0` which means the logical replication is disabled by default, however, setting it to `1` will enable the logical replication. An important thing that you should know is that when you change this property on AWS you would need to restart your AWS RDS Postgres instance. If your application is in production that means you would need some downtime to enable the replication. You could read more about this and the steps to do it in AWS RDS [here](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Replication.Logical.html#AuroraPostgreSQL.Replication.Logical.Configure)

---

This brings us to the end of this small and quick setup of Postgres and Debezium using Docker Compose. Hope, next time you are building any CDC-related consumer this docker-compose setup will help you to run the infrastructure locally without any hassle.

If you like the blog, please don't forget to like the post, follow me on [Medium](https://medium.com/@iamninad) also don't forget to subscribe on Medium.
