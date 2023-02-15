---
title: Unit Test logback Using JUnit
date: '2017-06-18'
excerpt: 'A simple way to unit test your logging code for logback using junit'
tags:
  - logback
  - unittest
  - testing
---

There is not a single application I have ever seen without logging. Logging is such an essential part of every application, it provides the necessary details regarding what's going inside the application, how the flow is progressing & in the case of exceptions details like the message & stack trace.

I remember one time when I was working on one project and there was some problem with tivoli installer to install the application on my machine. To solve the issue I found out the log path of tivoli tool, I read the logs & got to know where the problem was which I then solved it without requiring help from any team and it saved a lot of time not just mine but the different teams that were part of the problem resolution, it is so easy to find the issue when the logging is properly done.

Many times we find that in application design it's mentioned to log error logs in case when a certain condition is not met or some catastrophic event happens like if some record is not found in the database, network connection failed while calling a web service, or simply say while processing a file the layout of the file does not meet the required file format standard. In such a case we log the error to the log file and either stop the processing or continue to some recovery procedure or some different things that our business expects.

Sometimes we do have log monitoring tools in production environments that constantly monitor logs for any error and raise an incident when something goes wrong, so it becomes such an important task for a developer to check if the logs are properly formatted & logged so that those get picked up by the monitoring tools, isn't it?

As a Java developer we many times use Log4j along with Slf4j. Sl4fj is the standard API for logging and there are various bindings available like log4j, logback etc. In this blog post, I will be discussing on slf4j + [logback](https://logback.qos.ch/documentation.html) testing. For Log4j 2 I will be doing a separate blog.

## 1. Maven Dependencies

```xml
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-all</artifactId>
    <version>1.9.5</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>junit</groupId>
    <artifactId>junit</artifactId>
    <version>4.11</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
    <version>1.7.25</version>
</dependency>
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-core</artifactId>
    <version>1.2.3</version>
</dependency>
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-classic</artifactId>
    <version>1.2.3</version>
</dependency>
```

As we are working with Slf4j & logback we have added those in our pom.xml. We need Mockito for mocking Logback Appender and capture logs on the mocked Appender. This is the minimum we required for the logging to work.

## 2. Business Logic

```java
public class HeaderValidator {

    private final static Logger log = LoggerFactory.getLogger(HeaderValidator.class);

    /**
     * Validate Header Contents.
     *
     * @param data
     *            to validate
     * @return true if positive else false
     */
    public boolean validate(String data) {
        if (data.length() != 10) {
            log.error("E2011 Invalid Header Content");
            return false;
        }
        return true;
    }

}
```

The above code is a simple example that validates the contents for valid length if the length is not 10 then the method will log an error message to the logger and will return false. This is a typical processing step in many file processing in spring batch framework. Now let's write a Unit Test case for the validation logic and check if the message is logged to the logger or not.

## 3. Unit Test Case.

```java
import static org.mockito.Matchers.argThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentMatcher;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;

@RunWith(MockitoJUnitRunner.class)
public class HeaderValidatorLoggingTest {

    @Mock
    Appender appender;

    @Before
    public void setup() {
        ch.qos.logback.classic.Logger logger = (ch.qos.logback.classic.Logger) LoggerFactory
                .getLogger(Logger.ROOT_LOGGER_NAME);
        when(appender.getName()).thenReturn("MOCK");
        when(appender.isStarted()).thenReturn(true);
        logger.addAppender(appender);
    }

    @Test
    public void testValidate() {
        HeaderValidator validator = new HeaderValidator();
        validator.validate("ABC");

        verify(appender, times(1)).doAppend(argThat(new ArgumentMatcher() {
            @Override
            public boolean matches(Object argument) {
                return ((ILoggingEvent) argument).getFormattedMessage().equals("E2011 Invalid Header Content");
            }
        }));

    }

}
```

The setup method will add the mocked appender into the root logger. The `testValidate()` method calls the validate method of the Validator class passing an invalid value i.e. data with less than 10. In this case, an error log is generated by our HeaderValidator class. The verify method then checks whether the `doAppend()` method is called for once - `times(1)` and the argument to the method matches the expected message.

Another way to check for the message is by using [ArgumentCaptor](https://static.javadoc.io/org.mockito/mockito-core/2.2.9/org/mockito/ArgumentCaptor.html) of Mockito

```java
package com.logging.sample;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;

@RunWith(MockitoJUnitRunner.class)
public class HeaderValidatorLoggingTest2 {

    @Mock
    Appender<ILoggingEvent> appender;

    @Captor
    ArgumentCaptor<ILoggingEvent> captor;

    @Before
    public void setup() {
        ch.qos.logback.classic.Logger logger = (ch.qos.logback.classic.Logger) LoggerFactory
                .getLogger(Logger.ROOT_LOGGER_NAME);
        when(appender.getName()).thenReturn("MOCK");
        when(appender.isStarted()).thenReturn(true);

        logger.addAppender(appender);
    }

    @Test
    public void testValidate() {
        HeaderValidator validator = new HeaderValidator();
        validator.validate("ABC");

        verify(appender, times(1)).doAppend(captor.capture());

        List<ILoggingEvent> allValues = captor.getAllValues();
        for(ILoggingEvent event: allValues){
            if(event.getLevel().equals(Level.ERROR))
            Assert.assertEquals("E2011 Invalid Header Content", event.getFormattedMessage());
        }
    }

}
```

The ArgumentCaptor is mocked to capture all the arugments of type ILogginEvent as our example is using logback-classic module the argument to the doAppend method is of ILoggingEvent type.

In the setup method we mock the appender methods like `getName()` & `isStarted()` and we add the new mocked appender to the root Logger which is ch.qos.logback.classic.Logger.

The verify method in this example has a minor change as compared to the previous one that instead of passing the `argThat` method to the verify call we are passing the `captor.capture()` method, here captor will capture all the messages whenever the `doAppend()` method of the Logger class is called.

Other than the basic things that are done in the example you can do more than just checking the log message, there are various methods of [ILoggingEvent](https://logback.qos.ch/apidocs/ch/qos/logback/classic/spi/ILoggingEvent.html) that you can test as per the requirement.

To learn more about logback logging framework please refer the [documentation site](https://logback.qos.ch/documentation.html) of logback.
