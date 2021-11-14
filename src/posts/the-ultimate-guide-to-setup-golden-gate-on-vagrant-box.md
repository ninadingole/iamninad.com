---
title: The Ultimate Guide To Setup Golden Gate On Vagrant Box
summary: 'If you have read my previous post on Debezium, I have mentioned that currently, I am working on a platform which includes capturing CDC…'
date: 2018-07-22
draft: false
## If your image is within the project start the url with `./src/images/`
postImage: https://source.unsplash.com/SHP1t8EduMY/920x460
postImageCredits: Umer Sayyam | https://unsplash.com/@sayyam197
postImageSource: Unsplash | https://unsplash.com
publication: https://itnext.io/the-ultimate-guide-to-setup-golden-gate-on-vagrant-box-5f73fc67ebd6
tags:
  - oracle
  - golden-gate
  - cdc
  - kafka
  - confluent-kafka
  - confluent
---

If you have read my previous post on [Debezium](https://iamninad.com/how-debezium-kafka-stream-can-help-you-write-cdc/), I have mentioned that currently, I am working on a platform which includes capturing CDC events from Oracle and publishing those to our new database. For this to work Oracle provides Golden Gate which is similar to what Debezium does, publishing all database changes to Kafka topics. However, If you are a developer like me who is working on Mac OS and do not have Oracle DB setup for Mac and which is sad 😞 then this post will help you to have your own Oracle Vagrant environment.

While I was working on this new platform development one of my colleagues told me about Oracle having vagrant images which could provide Oracle 12c to developers working on mac. Then I checked and found that Oracle has created a GitHub repo with the vagrant files both for Linux and Oracle 11 and 12c. After that, I basically took this vagrant files as a base for my work and installed golden gate setup along with confluent package on the Linux box. But you know it was a very tedious task to manually do the installation and all. And if I do a big blog with all the steps you guys would be like?

![](https://media.giphy.com/media/oOTTyHRHj0HYY/giphy.gif)

So, I enhanced the scripts to do the hard work and install Golden Gate + Confluent + enable some configuration for the Oracle database during vagrant box provisioning. And you know what one command does all the setup and configuration for you. Follow the exact given steps in the post and you will be gifted with the magical power of Oracle database, golden gate and confluent. 😂

![happy](https://media.giphy.com/media/144waw4kQiQVgY/giphy.gif)

## 1. Clone Vagrant Box Images

Clone my oracle vagrant fork from [here](https://github.com/ninadingole/vagrant-boxes.git). Let's wish my pull request get accepted by the oracle contributors team and this work becomes officially a part of Oracle GitHub repository ( finger crossed 🤞🏼).

## 2. Download Oracle Database Zip

Download the Oracle database 12c zip file from oracle tech network [here](http://www.oracle.com/technetwork/database/enterprise-edition/downloads/index.html) or [here](http://www.oracle.com/technetwork/database/enterprise-edition/downloads/index.html). Use the Oracle Database 12c Release 2 - Linux x86-64 version and download the single file zip which is around 3.2GB.

## 3. Download Oracle GG and Oracle GG BD

Now, we need the Oracle Golden Gate and Golden Gate for Big Data zip files. These files can be downloaded from [here](http://www.oracle.com/technetwork/middleware/goldengate/downloads/index.html). Download Oracle GoldenGate for Big Data 12.3.1.1.1 on Linux x86-64 & Oracle GoldenGate 12.3.0.1.4 for Oracle on Linux x86-64.

> Keep all the downloaded files in the same vagrant git checkout directory.

## 4. Start Vagrant

At this point, all the pre-requisites are done. Now run `vagrant up` and this will start installing Oracle database 12c, oracle golden gate, oracle golden gate for big data and confluent oss package on the Linux box.

![start](https://media.giphy.com/media/WZ4M8M2VbauEo/giphy.gif)

Wait till everything finishes. At the very end, the setup will print the password for Oracle database make sure you copy that as this will help you to progress with the next steps. Now, you have your CDC dev environment ready on Mac or on any machine having vagrant. 😎

![done](https://media.giphy.com/media/8UF0EXzsc0Ckg/giphy.gif)

---

If you are new to Oracle golden gate and want to know about configuring the golden gate for Oracle database follow the below steps in the post.

## Configure Golden Gate On Vagrant Box

There are two things we need to configure, the first is oracle golden gate and then oracle golden gate for big data. Let's begin by first configuring the golden gate for Oracle database. Please follow the exact step to get it running. You can find more information about the following command on oracle golden gate [documentation](https://www.oracle.com/technetwork/middleware/goldengate/documentation/index.html).

### 1. Load Sample Schema To Oracle Database.

We need a schema present in the installed oracle database so that we can configure the golden gate to listen to the changes happening on this schema. Well, Oracle setup comes with HR schema SQL files present in the installation. We will load the same into our database.

> use `vagrant ssh` command to ssh into the virtual machine

Log in to the database using SQL shell as a sysdba:

`sqlplus / as sysdba`

Alter the session to allow Oracle scripts to execute:

`alter session set "_ORACLE_SCRIPT"=true;`

Alter the session to use the PDB database (inside SQL shell):

`alter session set container=ORCLPDB1;`

Load the schema and for all the input asked by the below command provide proper responses:

`@?/demo/schema/human_resources/hr_main.sql`

Execute the below commands as an oracle user, switch the vagrant user to Oracle using

`sudo su - oracle`

### 2. Configure Oracle Golden Gate

1. Go to Oracle golden gate installation directory.
   `cd /u01/ogg`
2. Open golden gate console.
   `./ggsci`
3. Start manager.
   `> start mgr`
4. Log in to the database.
   `> DBLOGIN USERID SYSTEM@localhost:1521/ORCLCDB PASSWORD [password copied while installation]`
5. Register Extract.
   `> REGISTER EXTRACT EXT1 DATABASE CONTAINER (ORCLPDB1)`
6. Enable schema-level supplemental logging for a table.
   `> ADD SCHEMATRANDATA ORCLPDB1.HR ALLCOLS`
7. Create an Extract group.
   `> ADD EXTRACT EXT1, INTEGRATED TRANLOG, BEGIN NOW`
8. Create a trail for online processing on the local system and Associate it with an Extract group.
   `> ADD EXTTRAIL ./dirdat/lt EXTRACT EXT1`
9. Create EXT1 parameter file and paste the content in the file.
   `> EDIT PARAM EXT1`

```log
EXTRACT EXT1
USERID SYSTEM@ORCLCDB, PASSWORD [password copied during installation]
EXTTRAIL ./dirdat/lt
SOURCECATALOG ORCLPDB1
TABLE HR.*;
```

10. Start Extract EXT1.
    `> start ext1`
11. View status of manager and ext1.
    `> info all`

```log
Program     Status      Group       Lag at Chkpt  Time Since Chkpt
MANAGER     RUNNING
EXTRACT     RUNNING     EXT1        00:00:00      00:00:00
```

The Oracle golden gate for Oracle 12c is configured. Now, its time to configure Oracle golden gate for big data which will push all the changes/ CDC events to confluent Kafka.

### 3. Configure Oracle Golden Gate For Big Data

Before following the below steps make sure you add java path to `$LD_LIBRARY_PATH` environment variable in your `.bashrc` file. The location of the java is `/usr/lib/jvm/java-1.8.0-openjdk-XXXXX/jre/lib/amd64/server`. Replace XXXXX with your current version installed on during the installation.

1. Change directory to oggbd
   `cd /u01/oggbd`

2. Open golden gate for bd console.
   `./ggsci`

3. Create default directories.
   `> CREATE SUBDIRS`
   After doing this exit the console using `exit` command, and create the following files in `dirprm` directory.

- kafkaconnect.properties
- rkafka_handler.props
- rkafka.prm

4. Login to GG console again using step `2` then execute the below command and add the contents to the param file
   `> edit param mgr`
   ```log
   PORT 7801
   ```
5. Start the manager.
   `> start mgr`

6. Create replicat group `rkafka`.
   `> add replicat rkafka, exttrail /u01/ogg/dirdat/lt`

7. Start the replicat.
   `> start rkafka`
8. View status of all if everything is properly configured.
   `> info all`

   ```log
   Program     Status      Group       Lag at Chkpt  Time Since Chkpt
   MANAGER     RUNNING
   REPLICAT    RUNNING     RKAFKA      00:00:00      00:00:09
   ```

### 4. Verify Setup

1. Login to the database and add row to any table like:

   ```sql
   > sqlplus / as sysdba
   SQL> alter session set container=ORCLPDB1;
   SQL> INSERT INTO HR.REGIONS(REGION_ID, REGION_NAME) VALUES(47, 'FOO');
   SQL> COMMIT;
   ```

2. Check if the kafka topics are created for the data inserted tables
   `> kafka-topics --zookeeper localhost:2181 --list`

   ```log
   __confluent.support.metrics
   __consumer_offsets
   _confluent-ksql-default__command_topic
   _schemas
   connect-configs
   connect-offsets
   connect-statuses
   ora-ogg-HR-REGIONS-avro
   ```

3. To check the data in the kafka topics run -
   `> kafka-avro-console-consumer --bootstrap-server localhost:9092 --topic ora-ogg-HR-REGIONS-avro --from-beginning`

You can run both `kafka-topics` and `kafka-avro-console-consumer` from the host machine where you are running vagrant. This will help you while coding to connect to Kafka instance present in the vagrant vm. Also, The Oracle database is running on port 1521 to which you can connect from your java code or from your IDE.

![done](https://media.giphy.com/media/MTclfCr4tVgis/giphy.gif)

This vagrant images is really helpful to me and hope it will also help you guys while developing your CDC related applications. For any issues, during setup or configuring please do comment on the post.

#### Other Information:

- Zookeeper Port: 2181
- Kafka Broker: 9092
- Confluent Schema Registry: 8081
- Oracle DB Port: 1521

Don't forget to share the post with your friends and colleagues.

---

## References:

1. [Oracle Repository](https://github.com/oracle/vagrant-boxes)
2. [Own Personal Project Repository](https://github.com/ninadingole/vagrant-boxes.git)
