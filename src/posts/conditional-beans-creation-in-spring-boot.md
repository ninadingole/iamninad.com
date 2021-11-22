---
title: Conditional Beans Creation In Spring Boot
summary: 'Spring Container is core to Spring Framework. It manages the entire lifecycle of Spring Beans. A bean is nothing but an instance of a class…'
date: 2017-08-14
draft: false
## If your image is within the project start the url with `./src/images/`
postImage: https://source.unsplash.com/ymSNcytigRw/920x460
postImageCredits: Rio Lecatompessy | https://unsplash.com/@riolec
postImageSource: Unsplash | https://unsplash.com
tags:
  - spring
  - spring-boot
  - conditional-beans
  - beans
  - spring-core
---

Spring Container is core to Spring Framework. It manages the entire lifecycle of Spring Beans. A bean is nothing but an instance of a class right?. You can declare a bean definition either using XML based configuration or Annotation based configuration, Annotation based is my personal favorite. But, have you came across a situation where you want to initialize bean based on a certain condition?

Like if my Java version is 7 and I want some beans to get created and if it's Java 8 than some other beans and not those that relate to Java 7. I know right now many of us add both the spring beans definition in our XML and java config file. And then, using some if...else logic to do the required thing, isn't it? But hey, we want to write programs that can be easily re-configured and doesn't require major code changes because in large application making a small change can trigger a big testing and build phase. And, you know how painful it is.

Well, to rescue us from such situations spring boot provides the support for conditional bean initialization out of the box and it's right built into spring boot (since version 1.1.0). That means you don't have to write unnecessary if...else blocks to check the conditions and then use the right bean. In this post, I will walk you through different ways of conditionally creating spring beans.

There are various Annotation that are provided by Spring Boot each having a specific purpose. The below list shows all the different Conditional Annotation in Spring.

- [ConditionalOnBean](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnBean.html)
- [ConditionalOnClass](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnClass.html)
- [ConditionalOnCloudPlatform](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnCloudPlatform.html)
- [ConditionalOnExpression](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnExpression.html)
- [ConditionalOnJava](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnJava.html)
- [ConditionalOnJndi](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnJndi.html)
- [ConditionalOnMissingBean](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnMissingBean.html)
- [ConditionalOnMissingClass](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnMissingClass.html)
- [ConditionalOnNotWebApplication](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnNotWebApplication.html)
- [ConditionalOnProperty](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnProperty.html)
- [ConditionalOnResource](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnResource.html)
- [ConditionalOnSingleCandidate](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnSingleCandidate.html)
- [ConditionalOnWebApplication](http://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/condition/ConditionalOnWebApplication.html)

I won't be going through all the annotations in this post. However, after explaining you some of them you will get the idea of how to use others. Please look for the comments in the code blocks for explanations.

## ConditionalOnBean

Conditional that only matches when the given Bean name or classes are already present in the BeanFactory. The annotation when placed on a `@Bean` then the bean class is default to the return type of the bean definition.

```java
@Configuration
public class ConditionalOnBeanConfig {

    @Bean
    public A beanA(){
        return new A();
    }

    @Bean
    @ConditionalOnBean(name="beanA")
    public B beanB(){
        return new B(); // it will initialize as beanA is present in the beanFactory.
    }

    @Bean
    @ConditionalOnBean
    public C beanC(){
        return new C(); // will not get initialized as there is no bean with return type C in BeanFactory.
    }

    @Bean
    public SimpleInt beanAInt(){
        return new ASimpleInt();
    }

    @Bean
    @ConditionalOnBean
    public SimpleInt beanBInt(){
        return new BSimpleInt();
    }
}
```

## ConditionalOnClass

Conditional that only matches when the specified class is available on the classpath. The attributes to the annotation are `name` and `value`. Use the name attribute in case if you want to specify the class name and you are not sure whether the classes will be available on the classpath and use value when the classes are available on the classpath.

```java
@Configuration
public class ConditionOnClassConfig {

    @Bean
    @ConditionalOnClass(value={java.util.HashMap.class})
    public A beanA(){
        return new A(); // will get created as HashMap class is on the classpath
    }

    @Bean
    @ConditionalOnClass(name="com.sample.Dummy")
    public B beanB(){
        return new B(); // won't be created as Dummy class is not on classpath
    }

    @Bean
    @ConditionalOnClass(value=com.sample.bean.conditional.model.ASimpleInt.class)
    public C beanC(){
        return new C(); // ASimpleInt is on the classpath in the project.
                        //So, C's instance will be created.
    }

}
```

## ConditionalOnMissingBean

Conditional that only matches when the specified bean is missing from the beanfactory. This will only match when the bean definition is processed by the application context and as such is recommended to be used by auto-configuration classes only.

```java
@Configuration
public class ConditionalOnMissingBeanConfig {

    @Bean
    public A beanA(){
        return new A(); // will initialize as normal
    }

    @Bean
    @ConditionalOnMissingBean(name="beanA")
    public B beanB(){
        return new B(); // it will not initialize as
                        // beanA is present in the beanFactory.
    }

    @Bean
    @ConditionalOnMissingBean(name="beanD")
    public C beanC(){
        return new C(); // will get initialized as there is no
                        // bean with name beanD in BeanFactory.
    }

}
```

## ConditionalOnMissingClass

Conditional that only matches when the specified Class is missing from the classpath.

```java
@Configuration
public class ConditionOnMissingClassConfig {

    @Bean
    @ConditionalOnMissingClass(value={"com.sample.Dummy"})
    public A beanA(){
        return new A(); // will get created as Dummy class is missing
                        // from classpath.
    }

    @Bean
    @ConditionalOnMissingClass(value={"com.sample.bean.conditional.model.C"})
    public B beanB(){
        return new B(); // won't be created as C is present in classpath.
    }

}
```

## ConditionalOnWebApplication

Conditional that only matches when the application context is a web application context.

> Note: Code is shown in next block.

## ConditionalOnNotWebApplication

Conditional that only matches when the application context is not a web application context.

```java
@Configuration
public class ConditionalBeanNotWebConfig {

    @Bean
    @ConditionalOnWebApplication
    public A beanA(){
        return new A(); // will initiate if the context is
                        // WebApplicationContext.
    }

    @Bean
    @ConditionalOnNotWebApplication
    public B beanB(){
        return new B(); // will initiate if the context is not
                        // WebApplicationContext.
    }
}
````

## ConditionalOnResource

Conditional that only matches when the specified resource is available on the classpath.

```java
@Configuration
public class ConditionalOnResourceConfig {

    @Bean
    @ConditionalOnResource(resources={"classpath:application.properties"})
    public A beanA(){
        return new A(); // will initiate as application.properties is in
                        // classpath.
    }

    @Bean
    @ConditionalOnResource(resources={"file:///e:/doc/data.txt"})
    public B beanB(){
        return new B(); // will not initialize as the file is not
                        // present in the given location.
    }
}
```

## ConditionalOnJava

It checks whether the version matches the current JVM version the application is running. There are two properties to this annotation `value` and `range`. The `value` takes any one of the given `JavaVersion` enum as given below i.e. SIX, SEVEN, EIGHT, NINE.

```java
@Configuration
public class ConditionalBeanJavaConfig {

    @Bean
    @ConditionalOnJava(value=JavaVersion.EIGHT)
    public A beanA(){
        return new A();
    }

    @Bean
    @ConditionalOnJava(value=JavaVersion.SEVEN,range=Range.OLDER_THAN)
    public B beanB(){
        return new B();
    }
}
```

In the above case, I am using JDK version 8. So, only `beanA` will get initialized while the `beanB` I am trying to check if the JDK version is below 7 using `range` property which initializes B.

## ConditionalOnProperty

Conditional on property checks if the specified property has the specific value. It checks by default if the property is in the Environment and not equals to **false**.

```java
@Configuration
public class ConditionalBeanPropertyConfig {

    @Bean
    @ConditionalOnProperty(name="test.property", havingValue="A")
    public A beanA(){
        return new A();
    }

    @Bean
    @ConditionalOnProperty(name="test.property", havingValue="B")
    public B beanB(){
        return new B();
    }

    @Bean
    @ConditionalOnProperty(name="test.property", havingValue="C",matchIfMissing=true)
    public C beanC(){
        return new C();
    }
}
```

The above example shows how to configure conditional on property annotation. The `havingValue` and `matchIfMissing` allows for additional customization. The having value checks if the given value equals to the value of the property and if it's true then initialize the bean. A `havingValue=""` will always returns **true**. `matchIfMissing` specifies that the condition should match if the property is missing.

### JUnit Test:

I have wrote JUnits for each of the above example I have given. You can find all those in the given below github link[^1]. To make the post short I didn't include all those. But to show you how the tests works I have put one test case for ConditionBeanPropertyConfig Class as below.

```java
@RunWith(SpringRunner.class)
@SpringBootTest(classes={ConditionalBeanPropertyConfig.class})
public class ConditionalBeanPropertyConfigTest {

    @Autowired
    ApplicationContext ctx;

    @Test
    public void testBeanA() {
        A beanA = ctx.getBean(A.class);
        assertNotNull(beanA);
    }

    @Test(expected=NoSuchBeanDefinitionException.class)
    public void testBeanB() {
        B beanB = ctx.getBean(B.class);
        assertNotNull(beanB);
    }

    @Test(expected=NoSuchBeanDefinitionException.class)
    public void testBeanC() {
        C beanC = ctx.getBean(C.class);
        assertNotNull(beanC);
    }

}
```

The Spring Boot Test checks for initialization of All the three beans. But, as the properties file is configured with the value `A` only `testBeanA` will return the bean instance while the other two methods will return `NoSuchBeanDefinitionException`. If the property value is changed to `B` then, in that case, bean B will get initialized likewise in the case of C. However, if the property `test.property` is missing from the environment only the `C` instance will get created leaving A and B uninitialized.

**Properties file for All above examples:**

```properties
test.property=A
```

#### Test Output

![ConditionalOnProperty Test](/images/conditional-beans-creation-in-spring-boot/35654891383_0d888c3f65_o.png 'ConditionalOnProperty Test')

I tried to explain most of the Annotation usage and for those that are missing you got the idea of how to use them. If you have any doubt don't bother to comment on the post I will get back to your queries as quickly as possible. Also, please <a href="#">subscribe</a> to the newsletter to get the blog updates. If there's anything else you want to discuss with me use the [Contact](https://iamninad.com/contact/) form. Please don't forget to share the post using the below-given links. Thanks!.

## Links:

[Download Code From Github](https://github.com/ninadingole/springcookbook)

#### Other Entities Used

```java
public class A {
    public String sayHello(){
        return "Hello From A";
    }
}

public class B {
    public String sayHello(){
        return "Hello From B";
    }
}

public class C {
    public String sayHello(){
        return "Hello From C";
    }
}

public interface SimpleInt {
    void sample();
}

public class ASimpleInt implements SimpleInt {
    @Override
    public void sample() {
        System.out.println("Hello From A implementation of SimpleInt");
    }
}

public class BSimpleInt implements SimpleInt {
    @Override
    public void sample() {
        System.out.println("Hello from B implementation of SimpleInt");
    }
}
```
