---
title: Secret For Testing UUID Generation In Golang
excerpt: "Learn different ways to unit test UUID generation in golang using google/uuid library"
date: 2023-05-06
draft: false
tags:
  - go
  - golang
  - testing

templateEngineOverride: njk, md
---

In today's fast-paced world of software development, generating unique identifiers is an absolute necessity. In golang,
there are various packages available that can help you achieve this. One such package is the Google UUID package.

To get started, you first need to import the Google UUID library into your Golang project.

```bash
go get -u github.com/google/uuid
```

Once you have imported the library, you could use the `uuid.New()` method to generate a random UUID.
This method takes no arguments and is the easiest one to get started. 🆒

The challenge with using this is how to create a Unit Test for the code 👊. In the Unit Test, we expect to get a constant
known behaviour from our code. But, the behaviour of uuid.New() method is to generate random sequences on each
execution.

Let me show you what I mean by using a small code. Below, I am writing a very simple test. I will run this test many
times and we will check the output. All the generated UUIDs for each different run will be random.

```go
func Test_UUIDGeneration(t *testing.T) {
  uuid := uuid.New()
  
  fmt.Println(fmt.Sprintf("UUID: %s", uuid))
}

------------ OUTPUT ---------------

  UUID: c26a1010-a207-47cb-b399-9de8acad3bba
  UUID: e4c1776f-cd94-4710-b5eb-710c081df916
  UUID: 923c129c-ba0b-4534-aadf-db98470fd99c
```

> Note: If you run the above test locally with go test make sure to disable the cache. Use `--count=1` in the command to
> disable caching otherwise the test will generate same uuids

Consider you are writing a service layer that generates the UUID and persist it in the DB. You write a Unit Test but
cannot assert the value of the generated UUID. Because, on every new execution on the CI, the value will be different.
How will you test the code and avoid randomness?

Here is a small code to mimic a service layer and the test:

```go
type Employee struct {
  ID        uuid.UUID `json:"id"`
  FirstName string    `json:"first_name"`
  LastName  string    `json:"last_name"`
}

// Storage interface is used to persist employee to DB
type Storage interface {
    Save(employee Employee) error
}

// Employee service orchestrate the creation of employee
type EmployeeService struct {
    storage Storage
}

// For simplicity the layer only calls the storage layer to persist the value.
// However, in a real world the service layer will do more than this.
func (e *EmployeeService) Create(firstName, lastName string) error {
  employee := Employee{
    ID:        uuid.New(),
    FirstName: firstName,
    LastName:  lastName,
  }
  
  return e.storage.Save(employee)
}
```

```go
type mockStorage struct {
    mock.Mock
}

// We mock the storage layer to see if the value and type is correctly passed
// to the method
func (m *mockStorage) Save(employee Employee) error {
  args := m.Called(employee)
  return args.Error(0)
}

func TestEmployeeService_Create(t *testing.T) {
  t.Parallel()
  
  expectedEmployee := Employee{
    ID:        uuid.New(), // This will always generate new random uuid
    FirstName: "John",
    LastName:  "Doe",
  }
  
  storage := &mockStorage{}
  employeeService := EmployeeService{storage: storage}
  
  storage.On("Save", mock.MatchedBy(func (x interface{}) bool {
    employee, ok := x.(Employee)
    
    if !ok {
        return false
    }
    
    return assert.EqualValues(t, expectedEmployee, employee)
  })).Return(nil)
  
  err := employeeService.Create("John", "Doe")
  
  assert.NoError(t, err)
  storage.AssertExpectations(t)
}
```

If I run the above test it will fail 🔴:

```bash
=== RUN   TestEmployeeService_Create
=== PAUSE TestEmployeeService_Create
=== CONT  TestEmployeeService_Create
/tests/data_test.go:89:
      Error Trace:    /tests/data_test.go:89
                      /tests/value.go:586
                      /tests/value.go:370
                      /tests/data_test.go:66
                      /tests/data_test.go:58
                      /tests/data_test.go:92
      Error:          Not equal:
                      expected: tests.Employee{ID:uuid.UUID{0xeb, 0x5, 0x6f, 0x11, 0x47, 0x8, 0x42, 0x2d, 0xb5, 0x23, 0x47, 0x2, 0x40, 0x18, 0x85, 0x94}, FirstName:"John", LastName:"Doe"}
                      actual  : tests.Employee{ID:uuid.UUID{0xb4, 0xb7, 0x8f, 0x21, 0x36, 0xc8, 0x4e, 0x3e, 0x9a, 0xa3, 0x96, 0x79, 0xd3, 0xcc, 0xbc, 0xdc}, FirstName:"John", LastName:"Doe"}

                      Diff:
                      --- Expected
                      +++ Actual
                      @@ -2,3 +2,3 @@
                        ID: (uuid.UUID) (len=16) {
                      -  00000000  eb 05 6f 11 47 08 42 2d  b5 23 47 02 40 18 85 94  |..o.G.B-.#G.@...|
                      +  00000000  b4 b7 8f 21 36 c8 4e 3e  9a a3 96 79 d3 cc bc dc  |...!6.N>...y....|
                        },
      Test:           TestEmployeeService_Create
```

You could see that the UUIDs were generated by the service layer in the logs. To use `assert.EqualValues`
or `assert.Equals`
on a struct, all the attribute values should match. The UUID in the `expected` employee instance is different.

## What would you do to avoid this?

Many people to avoid the problem will think of not writing the test 😅. Let's see the different ways to overcome this
problem.

{%
Gif "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTc2MjRiODg4MzIxYzg1MTk2NTFmMDdjNTM4ZGNlM2MwYzFhMzljYSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/w89ak63KNl0nJl80ig/giphy.gif" %}

---

## 1. Manually check all the struct attributes and avoid the UUID check

Our assumption is that this library is open-source and well-maintained by the community. We can rely on the fact that
things will work fine. We skip the UUID check part but check other attributes eg:

```go
storage.On("Save", mock.MatchedBy(func(x interface{}) bool {
  employee, ok := x.(Employee)
  
  if !ok {
    return false
  }
  
  return employee.ID != uuid.Nil && employee.FirstName == expectedEmployee.FirstName && employee.LastName == expectedEmployee.LastName
})).Return(nil)
```

This is ok if you have a struct with few attributes. But, this will become a headache if you have 15–20 attributes. This
indeed is not a scalable approach.

## 2. Parse the UUID To Check For Error

Parse the UUID to check if the service generates the UUID and if there is no issue. For other attributes do exactly what
we did in the previous example. This will also suffer from the same problem as the previous solution

```go
    _, err := uuid.Parse(employee.ID.String())
  
    return err == nil && employee.FirstName == expectedEmployee.FirstName && employee.LastName == expectedEmployee.LastName
```

## 3. Pass a UUID Generator Function Type

A separate uuid generator function is passed to the struct to generate the uuid. A test generator is then used in the
unit test to mock and pass a static UUID. An assertion on this static value will verify the behaviour of the code. Eg:

```go
type UUIDGenerator func () uuid.UUID

var DefaultUUIDGenerator = func () uuid.UUID {
    return uuid.New()
}

type EmployeeService struct {
  storage       Storage
  uuidGenerator UUIDGenerator
}

func (e *EmployeeService) Create(firstName, lastName string) error {
  employee := Employee{
    ID:        e.uuidGenerator(),
    FirstName: firstName,
    LastName:  lastName,
  }
  
  return e.storage.Save(employee)
}
```

```go
func TestEmployeeService_Create(t *testing.T) {
  t.Parallel()
  
  expectedID := uuid.New()
  
  expectedEmployee := Employee{
    ID:        expectedID,
    FirstName: "John",
    LastName:  "Doe",
  }
  
  storage := &mockStorage{}
  
  uuidGenerator := func () uuid.UUID {
    return expectedID
  }
  
  employeeService := EmployeeService{storage: storage, uuidGenerator: uuidGenerator}
  
  storage.On("Save", mock.MatchedBy(func (x interface{}) bool {
    employee, ok := x.(Employee)
    
    if !ok {
        return false
    }
    
    return assert.EqualValues(t, expectedEmployee, employee)
  })).Return(nil)
  
  err := employeeService.Create("John", "Doe")
  
  assert.NoError(t, err)
  storage.AssertExpectations(t)
}
```

This solution is also good. It will allow us to assert the entire entity and don't have to check every field like in the
previous two examples. This may become a problem if you have to use it at many places in your code base.

You could create an abstraction that will help to reuse and it will work fine. But what if I tell you there is a *
*_secret_** way and you don't have to do all these shenanigans?

## Use SetRand 🚀

Let's look at the [documentation of the library](https://pkg.go.dev/github.com/google/uuid#SetRand). There is a way to
generate deterministic UUID, using `uuid.SetRand()`. If we use the correct Seed Source to the `SetRand` function it will
allow us to get deterministic UUIDs.

Let’s see how:

```go
func Test_uuidTest(t *testing.T) {
  uuid.SetRand(rand.New(rand.NewSource(1)))
  
  val1 := uuid.New()
  val2 := uuid.New()
  
  assert.EqualValues(t, uuid.MustParse("52fdfc07-2182-454f-963f-5f0f9a621d72"), val1, fmt.Sprintf("generated %v", val1))
  assert.EqualValues(t, uuid.MustParse("9566c74d-1003-4c4d-bbbb-0407d1e2c649"), val2, fmt.Sprintf("generated %v", val2))
}

```

I add another test above to show how to use the `SetRand` method. I pass a new `*rand.Rand` instance by setting the seed
value to the `rand.NewSource(1)`. When you do this the UUIDs generated will be deterministic in nature. They will be
exactly the same on each run irrespective of the platform you run on.

To verify this, I ran the same example on the go playground [here](https://go.dev/play/p/Eaa5OR0P9f6). You will see
below that the generated UUIDs match our assertion value.

![code](/images/secret-for-testing-uuid-generation-in-golang/code.webp)

So let’s update our existing test to see how to use this new trick.

```go
func TestEmployeeService_Create(t *testing.T) {
  uuid.SetRand(rand.New(rand.NewSource(1)))
  
  expectedEmployee := Employee{
    ID:        uuid.MustParse("52fdfc07-2182-454f-963f-5f0f9a621d72"),
    FirstName: "John",
    LastName:  "Doe",
  }
  
  storage := &mockStorage{}
  
  employeeService := EmployeeService{storage: storage}
  
  storage.On("Save", mock.MatchedBy(func (x interface{}) bool {
    employee, ok := x.(Employee)
    
    if !ok {
        return false
    }
    
    return assert.EqualValues(t, expectedEmployee, employee)
  })).Return(nil)
  
  err := employeeService.Create("John", "Doe")
  
  assert.NoError(t, err)
  storage.AssertExpectations(t)
}
```

There is one caveat with this approach. The `math/rand` source that we have used is not thread-safe. As per the
documentation:

```go
// NewSource returns a new pseudo-random Source seeded with the given value.
// Unlike the default Source used by top-level functions, this source is not
// safe for concurrent use by multiple goroutines.
// The returned Source implements Source64.
```

So having multiple tests running parallel would cause a data race issue. I tried to overcome this but there’s no
straightforward way. I don’t want to add another layer of complexity to avoid the first one 😅 it’s not productive at
all.

I looked into how these libraries did the unit test. I realised that
both [google/uuid](https://github.com/google/uuid/blob/master/uuid_test.go#L501) and
golang [math/rand package](https://github.com/golang/go/blob/master/src/math/rand/rand_test.go#L371) do not use
`t.Parallel()` for the tests. So, The simplest way to fix the issue would be to remove `t.Parallel()` from all such unit
tests ✅.

## 5. Use google/go-cmp

After publishing this post, my awesome readers reached out to me with one more approach. 
I am really thankful to all those feedback. The [google/go-cmp](https://blog.iamninad.com/github.com/google/go-cmp) library allows to skip/ignore fields from comparison.

There are two kind of people, one who wants to compare all the fields of the struct and some would prefer to ignore the
UUID check because the google/uuid library is battle tested. So based on which category you belong to you could use the previous 
approach or you could use this approach.

Let’s rewrite our existing test to use the `cmpopts.IgnoreFields`

```go
func TestEmployeeService_Create(t *testing.T) {
 expectedEmployee := Employee{
  FirstName: "John",
  LastName:  "Doe",
 }

 storage := &mockStorage{}

 employeeService := EmployeeService{storage: storage}

 storage.On("Save", mock.MatchedBy(func(x interface{}) bool {
  actual, ok := x.(Employee)

  if !ok {
   return false
  }

  var diff string
  if diff = cmp.Diff(expectedEmployee, actual, cmpopts.IgnoreFields(Employee{}, "ID")); diff != "" {
   t.Errorf("Save() mismatch (-want +got):\n%s", diff)
  }

  return diff == ""
 })).Return(nil)

 err := employeeService.Create("John", "Doe")

 assert.NoError(t, err)
 storage.AssertExpectations(t)
}
```

On failure ☠️ the test will show a diff comparison of the fields that didn’t match like below

```go
=== RUN   TestEmployeeService_Create
    /Users/neenadingole/codes/opensource/gotest-ls/main_test.go:275: Save() mismatch (-want +got):
          main.Employee{
                ... // 1 ignored field
        -       FirstName: "Face",
        +       FirstName: "John",
                LastName:  "Doe",
          }
    /Users/neenadingole/codes/opensource/gotest-ls/main_test.go:275: Save() mismatch (-want +got):
          main.Employee{
                ... // 1 ignored field
        -       FirstName: "Face",
        +       FirstName: "John",
                LastName:  "Doe",
          }
--- FAIL: TestEmployeeService_Create (0.00s)
panic:

mock: Unexpected Method Call
-----------------------------

Save(main.Employee)
                0: main.Employee{ID:uuid.UUID{0x4d, 0x8e, 0x29, 0x66, 0x29, 0xdd, 0x4b, 0xbe, 0xa7, 0x30, 0x34, 0xa0, 0x7a, 0xe7, 0xb3, 0x94}, FirstName:"John", LastName:"Doe"}

The closest call I have is:

Save(mock.argumentMatcher)
                0: mock.argumentMatcher{fn:reflect.Value{typ:(*reflect.rtype)(0x12fd9e0), ptr:(unsafe.Pointer)(0xc00010ce40), flag:0x13}}


Diff: 0: FAIL:  (main.Employee={4d8e2966-29dd-4bbe-a730-34a07ae7b394 John Doe}) not matched by func(interface {}) bool [recovered]
        panic:
```
It becomes easy to navigate the test and fix the issue and the you could ignore multiple fields and from the struct comparison.

I am definitely going to use this library in my projects. This is also a great learning for me by writing and sharing this blog post.



## Conclusion

I hope this helps you to write better tests for your code when using the google uuid package. I am very keen on testing
code and finding ways to ease testing for developers. Having proper tests helps the team move faster. It also provides a
safety net to avoid accidental bug leaks or any dev mistakes.

There are different pros and cons to each of the methods discussed. It will depend on what works for you and what
doesn’t. For a small codebase, I don’t like using the generator function approach. I would use the `SetRand` for such
cases. For larger struct or ignoring the field comparison for some then I would also prefer the go-cmp library which 
does a really good job.

I was curious to see if there is any simple way for unit testing. This post is my research on this topic, but I know
there may be some approaches I missed. So, I would like to hear those from others. I will definitely be happy to update
my findings with your thoughts 🙏.

---

Thank you so much for taking the time to read my blog and sharing it with others. Your ❤️ support means a lot to me, and
I truly appreciate it. It’s people like you who inspire me to keep writing and sharing my thoughts with the world. Thank
you again for your kindness and support.

[Click to become a medium member and read unlimited stories!](https://blog.iamninad.com/membership)

---

## Supporting Information

A Sample Test From google/uuid package:

```go
// No t.Parallel() used
func TestSetRand(t *testing.T) {
 myString := "805-9dd6-1a877cb526c678e71d38-7122-44c0-9b7c-04e7001cc78783ac3e82-47a3-4cc3-9951-13f3339d88088f5d685a-11f7-4078-ada9-de44ad2daeb7"

 SetRand(strings.NewReader(myString))
 uuid1 := New()
 uuid2 := New()

 SetRand(strings.NewReader(myString))
 uuid3 := New()
 uuid4 := New()

 if uuid1 != uuid3 {
  t.Errorf("expected duplicates, got %q and %q", uuid1, uuid3)
 }
 if uuid2 != uuid4 {
  t.Errorf("expected duplicates, got %q and %q", uuid2, uuid4)
 }
}
```

A sample test from golang `math/rand` package:

```go
// No t.Parallel() used
func testReadUniformity(t *testing.T, n int, seed int64) {
 r := New(NewSource(seed))
 buf := make([]byte, n)
 nRead, err := r.Read(buf)
 if err != nil {
  t.Errorf("Read err %v", err)
 }
 if nRead != n {
  t.Errorf("Read returned unexpected n; %d != %d", nRead, n)
 }

 // Expect a uniform distribution of byte values, which lie in [0, 255].
 var (
  mean       = 255.0 / 2
  stddev     = 256.0 / math.Sqrt(12.0)
  errorScale = stddev / math.Sqrt(float64(n))
 )

 expected := &statsResults{mean, stddev, 0.10 * errorScale, 0.08 * errorScale}

 // Cast bytes as floats to use the common distribution-validity checks.
 samples := make([]float64, n)
 for i, val := range buf {
  samples[i] = float64(val)
 }
 // Make sure that the entire set matches the expected distribution.
 checkSampleDistribution(t, samples, expected)
}

// No t.Parallel() used
func TestReadUniformity(t *testing.T) {
 testBufferSizes := []int{
  2, 4, 7, 64, 1024, 1 << 16, 1 << 20,
 }
 for _, seed := range testSeeds {
  for _, n := range testBufferSizes {
   testReadUniformity(t, n, seed)
  }
 }
}

```

## Edits:

- Add google/go-cmp library usage as suggested by readers.


