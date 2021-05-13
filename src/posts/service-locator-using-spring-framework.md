---
title: Service Locator Using Spring Framework
date: "2017-07-28"
summary: "How to create a service locator in spring to access multiple beans or locate a specific service bean implementation programmatically"
tags:
    - spring
    - design-patterns
---

<div class="full-bleed">
    <img src="https://images.unsplash.com/photo-1540996300630-01782184c30b?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1792&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ" alt="ship sailing">
</div>

When you start with programming someday you will come to hear the words *Design Patterns*. Design Patterns are solutions to commonly recurring problems in software designs. These are not the final solution but an actual description or template on how to solve the problem. Design Patterns are categorised into 3 groups Creation, Structural & Behavioural. I am not going to go through all those in this post but, if you want to read more about design patterns you can read a very famous book *Gang of Four*.

In this post, I will be more focusing on *Service Locator* design pattern or as some says anti-pattern using spring framework. It's a well-known pattern used in many frameworks or for JNDI lookup.

So how this works? The ServiceLocatorFactoryBean takes an interface which need to have method signature of form of Service xxx() or Service xxx(String id) like `Service getService() or Service getService(String id)` this creates a dynamic proxy which implements the given interface and delegates the task of locating the implementation to an underlying beanFactory.

Which means internally it's still calling getBean on application context, Such service locators permit the decoupling of calling code from the BeanFactory API. According to documentation of Spring, this should be typically used for prototype bean where a new bean instance should be returned on every call, and for singleton bean direct setter/getter injection is preferable.

## Maven pom.xml

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<groupId>com.spring.sample</groupId>
	<artifactId>Service-Factory</artifactId>
	<version>0.0.1-SNAPSHOT</version>

	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>1.5.4.RELEASE</version>
	</parent>
	<dependencies>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>
		
		<dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
	</dependencies>
</project>
```
All you need is the basic sring boot dependencies. You can also add individual jar dependencies but you will only need the spring core one's. The Classes I am using are packaged into the core jar so other packages of spring are not needed.

## Project Structure:

![Project Structure](/assets/images/project-structure.PNG)

## Factory Interface:
:link: ShapeFactory.java
```java
package com.spring.factory;

import com.spring.factory.shape.Shape;

public interface ShapeFactory {
    
    Shape getShape(String name);
    
}
```
The ShapeFactory interface is the factory which will return the actual implementation of the Shape interface.

## Shape Inteface:

:link: Shape.java
```java
package com.spring.factory.shape;

public interface Shape {

    void draw();
    
}
```
The Shape interface has only one method `draw()`  this method is what the implementation classes will override and provide their own logic.

## Shape Implementation:
:link: Circle.java
```java
package com.spring.factory.shape.impl;

import org.springframework.stereotype.Component;

import com.spring.factory.shape.Shape;

@Component
public class Circle implements Shape{

    public void draw() {
        System.out.println("This is a cicle shape.");
    }

}
```
:link: Square.java
```java
package com.spring.factory.shape.impl;

import org.springframework.stereotype.Component;

import com.spring.factory.shape.Shape;

@Component
public class Square implements Shape {

    public void draw() {
        System.out.println("This is a box Shape.");
    }

}
```
The Circle and Square implementation are pretty simple, all they do is sysout the message to console. Now we need to configure the interface to act as a service locator.
 
## Spring Configuration:

:link: Config.java
```java
package com.spring.factory;

import org.springframework.beans.factory.config.ServiceLocatorFactoryBean;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan("com.spring.factory")
public class Config {

    
    @Bean
    public ServiceLocatorFactoryBean serviceLocatorBean(){
        ServiceLocatorFactoryBean bean = new ServiceLocatorFactoryBean();
        bean.setServiceLocatorInterface(ShapeFactory.class);
        return bean;
    }
    
    
}
```
The `ServiceLocatorFactoryBean` does all the magic in this 

## Junit Test
:link: ShapeFactoryTest.java

```java
package com.spring.factory;

import static org.junit.Assert.*;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

import com.spring.factory.shape.Shape;

@RunWith(SpringRunner.class)
@SpringBootTest(classes={Config.class},webEnvironment=SpringBootTest.WebEnvironment.NONE)
public class ShapeFactoryTest {

    @Autowired
    private ShapeFactory shapeFactory;
    
    @Test
    public void testGetShape() {
        Shape circle = shapeFactory.getShape("circle");
        assertNotNull(circle);
        circle.draw();
        Shape square = shapeFactory.getShape("square");
        assertNotNull(square);
        square.draw();
    }
    
    @Test
    public void testGetShapeForWrongShape(){
        Shape rectangle = shapeFactory.getShape("rectangle");
        assertNotNull(rectangle);
        rectangle.draw();
    }

}
```
It's a normal Junit that I have written to test the functionality of our code. Its a normal Spring boot test class. The `RunWith(SpringRunner.class)` is needed for the Junit to run the unit test case as spring container. Next The annotation `SpringBootTest` is added with the attributes. I am injecting the ShapeFactory which you can use the same way in your own implementation. The method `testGetShape()` calls the getShape() method of the factory passing the attributes 'circle' & 'square' and calling the `draw()` method on the retrieved instances.

## Output
As you can see in the output below, the right implementation instance is pulled from the ApplicationContext and the sysout statements are printed to the output.

![Ouput Logs](/assets/images/output_logs.PNG)

